// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

import "../interfaces/IGauge.sol";
import "../interfaces/IGaugeController.sol";

/**
 * @title Controller for all liquidity gauges.
 *
 * The Gauge Controller is responsible for the following:
 * 1) AC emission rate computation;
 * 2) AC emission allocation among liquidity gauges;
 * 3) AC reward claiming;
 * 4) Liquidity gauge withdraw fee processing.
 *
 * Liquidity gauges can be divided into two categories:
 * 1) Plus gauge: Liquidity gauges for plus tokens, the total rate is dependent on the total staked amount in these gauges;
 * 2) Non-plus gage: Liquidity gauges for non-plus token, the rate is set by governance.
 */
contract GaugeController is Initializable, IGaugeController {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    event GovernanceUpdated(address indexed oldGovernance, address indexed newGovernance);
    event ClaimerUpdated(address indexed claimer, bool allowed);
    event BaseRateUpdated(uint256 oldBaseRate, uint256 newBaseRate);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event GaugeAdded(address indexed gauge, uint256 gaugeWeight, bool plus, uint256 gaugeRate);
    event GaugeRemoved(address indexed gauge);
    event GaugeUpdated(address indexed gauge, uint256 oldWeight, uint256 newWeight, uint256 oldGaugeRate, uint256 newGaugeRate);
    event Checkpointed(uint256 oldRate, uint256 newRate, uint256 totalSupply, uint256 ratePerToken, address[] gauges, uint256[] guageRates);
    event RewardClaimed(address indexed gauge, address indexed user, uint256 amount);
    event FeeProcessed(address indexed gauge, address indexed token, uint256 amount);

    uint256 constant WAD = 10 ** 18;
    uint256 constant LOG_10_2 = 301029995663981195;  // log10(2) = 0.301029995663981195
    uint256 constant DAY = 86400;
    uint256 constant REWARD_BOOST_THRESHOLD = 10 * WAD;   // When the total staked amount exceeds 10 BTC, reward boost starts.

    address public override governance;
    // AC token
    address public override reward;
    // Address => Whether this is claimer address.
    // A claimer can help claim reward on behalf of the user.
    mapping(address => bool) public override claimers;
    address public treasury;

    struct Gauge {
        // Helps to check whether the gauge is in the gauges list.
        bool isSupported;
        // Whether this is a plus gauge. The emission rate for the plus gauges depends on
        // the total staked value in the plus gauges, while the emission rate for the non-plus
        // gauges is set by the governance.
        bool isPlus;
        // Multiplier applied to the gauge in computing emission rate. Only applied to plus
        // gauges as non-plus gauges should have fixed rate set by governance.
        uint256 weight;
        // AC emission rate of the gauge.
        uint256 rate;
    }

    // List of supported liquidity gauges
    address[] public gauges;
    // Liquidity gauge address => Liquidity gauge data
    mapping(address => Gauge) public gaugeData;

    // Base AC emission rate for plus gauges when TVL is below REWARD_BOOST_THRESHOLD
    uint256 public basePlusGaugeRate;
    // Boost for all plus gauges. 1 when TVL is below REWARD_BOOST_THRESHOLD
    uint256 public plusGaugeBoost;
    // Global AC emission rate, including both plus and non-plus gauge.
    uint256 public rate;
    // Total amount of AC rewarded until the latest checkpoint
    uint256 public totalReward;
    // Last time the checkpoint is called
    uint256 public lastCheckpoint;
    // Mapping: Gauge address => Mapping: User address => Total claimed amount for this user in this gauge
    mapping(address => mapping(address => uint256)) public override claimed;

    /**
     * @dev Initializes the gauge controller.
     * @param _reward AC token address.
     * @param _basePlusGaugeDayRate Amount of AC rewarded per day for plus gauges if no boost is applied.
     */
    function initialize(address _reward, uint256 _basePlusGaugeDayRate) public initializer {        
        governance = msg.sender;
        treasury = msg.sender;
        reward = _reward;
        basePlusGaugeRate = _basePlusGaugeDayRate / DAY;    // Base rate is in seconds
        lastCheckpoint = block.timestamp;
    }

    /**
     * @dev Computes log2(num). Result in WAD.
     * Credit: https://medium.com/coinmonks/math-in-solidity-part-5-exponent-and-logarithm-9aef8515136e
     */
    function _log2(uint256 num) internal pure returns (uint256) {
        uint256 msb = 0;
        uint256 xc = num;
        if (xc >= 0x100000000000000000000000000000000) { xc >>= 128; msb += 128; }    // 2**128
        if (xc >= 0x10000000000000000) { xc >>= 64; msb += 64; }
        if (xc >= 0x100000000) { xc >>= 32; msb += 32; }
        if (xc >= 0x10000) { xc >>= 16; msb += 16; }
        if (xc >= 0x100) { xc >>= 8; msb += 8; }
        if (xc >= 0x10) { xc >>= 4; msb += 4; }
        if (xc >= 0x4) { xc >>= 2; msb += 2; }
        if (xc >= 0x2) msb += 1;  // No need to shift xc anymore
    
        uint256 lsb = 0;
        uint256 ux = num << uint256 (127 - msb);
        for (uint256 bit = 0x8000000000000000; bit > 0; bit >>= 1) {
          ux *= ux;
          uint256 b = ux >> 255;
          ux >>= 127 + b;
          lsb += bit * b;
        }
    
        return msb * 10**18 + (lsb * 10**18 >> 64);
    }

    /**
     * @dev Computes log10(num). Result in WAD.
     * Credit: https://medium.com/coinmonks/math-in-solidity-part-5-exponent-and-logarithm-9aef8515136e
     */
    function _log10(uint256 num) internal pure returns (uint256) {
        return _log2(num).mul(LOG_10_2).div(WAD);
    }

    /**
     * @dev Most important function of the gauge controller. Recompute total AC emission rate
     * as well as AC emission rate per liquidity guage.
     * Anyone can call this function so that if the liquidity gauge is exploited by users with short-term
     * large amount of minting, others can restore to the correct mining paramters.
     */
    function checkpoint() public {
        // Loads the gauge list for better performance
        address[] memory _gauges = gauges;
        // The total amount of plus tokens staked
        uint256 _totalPlus = 0;
        // Amount of plus token staked in each gauge
        uint256[] memory _gaugePlus = new uint256[](_gauges.length);
        uint256 _plusGaugeBoost = WAD;
        for (uint256 i = 0; i < _gauges.length; i++) {
            // Don't count if it's non-plus gauge
            if (!gaugeData[_gauges[i]].isPlus) continue;
            // Liquidity gauge token total supply equal the underlying amount staked in the gauge for plus gauges
            _gaugePlus[i] = IPlus(_gauges[i]).underlying(IERC20Upgradeable(_gauge[i]).totalSupply());
            _totalPlus = _totalPlus.add(_gaugePlus[i]);
        }
        if (_totalPlus == 0)    return;

        // Computes the AC emission per plus. The AC emission rate is determined by total plus staked.
        uint256 _ratePerPlus = 0;
        // The boost breakpoint is 10 BTC
        if (_totalPlus > REWARD_BOOST_THRESHOLD) {
            // rate = baseRate * (log total - 1)
            // Minus 19 since the TVL is in WAD
            _plusGaugeBoost = _log10(_totalPlus) - 19 * WAD;
        }
        _ratePerPlus = _basePlusGaugeRate.mul(_plusGaugeBoost).div(_totalPlus);

        // Allocates AC emission rates for each liquidity gauge
        uint256 _oldRate = rate;
        uint256 _totalRate;
        uint256[] memory _gaugeRates = new uint256[](_gauges.length);
        for (uint256 i = 0; i < _gauges.length; i++) {
            if (gaugeData[_gauges[i]].isPlus) {
                // AC emission rate for dynamic gauge is proportional to total amount of plus staked times gauge weight.
                // Divided by WAD since ratePerToken is in WAD
                _gaugeRates[i] = _gaugePlus[i].mul(_ratePerPlus).mul(gaugeData[_gauges[i]].weight).div(WAD);
                // Update the rate for plus gauges
                gaugeData[_gauges[i]].rate = _gaugeRates[i];
            } else {
                // AC emission rate for non-plus gauge is fixed and set by the governance
                _gaugeRates[i] = gaugeData[_gauges[i]].rate;
            }
            _totalRate = _totalRate.add(_gaugeRates[i]);
        }

        // Checkpoints gauge controller
        totalReward = totalReward.add(rate.mul(block.timestamp.sub(lastCheckpoint)).div(WAD));
        lastUpdateTimestamp = block.timestamp;
        rate = _totalRate;
        plusGaugeBoost = _plusGaugeBoost;

        // Checkpoints each gauge to consume the latest rate
        // We trigger gauge checkpoint after all parameters are updated
        for (uint256 i = 0; i < _gauges.length; i++) {
            IGauge(_gauges[i]).checkpoint();
        }

        emit Checkpointed(_oldRate, _totalRate, _totalPlus, _ratePerPlus, _gauges, _gaugeRates);
    }

    /**
     * @dev Claims rewards for a user. Only the supported gauge can call this function.
     * @param _account Address of the user to claim reward.
     * @param _amount Amount of AC to claim
     */
    function claim(address _account, uint256 _amount) external override {
        require(gaugeSupported[msg.sender], "not gauge");
        claimed[msg.sender][_account] = claimed[msg.sender][_account].add(_amount);
        IERC20Upgradeable(reward).safeTransfer(_account, _amount);

        emit RewardClaimed(msg.sender, _account, _amount);
    }

    /*********************************************
     *
     *    Governance methods
     *
     **********************************************/
    
    function _checkGovernance() internal view {
        require(msg.sender == governance, "not governance");
    }

    modifier onlyGovernance() {
        _checkGovernance();
        _;
    }

    /**
     * @dev Updates governance. Only governance can update governance.
     */
    function setGovernance(address _governance) external onlyGovernance {
        address _oldGovernance = governance;
        governance = _governance;
        emit GovernanceUpdated(_oldGovernance, _governance);
    }

    /**
     * @dev Updates claimer. Only governance can update claimers.
     */
    function setClaimer(address _account, bool _allowed) external onlyGovernance {
        claimers[_account] = _allowed;
        emit ClaimerUpdated(_account, _allowed);
    }

    /**
     * @dev Updates the AC emission base rate. Only governance can update the base rate.
     */
    function setBasePlusGaugeRate(uint256 _baesPlusGaugeDayRate) external onlyGovernance {
        uint256 _oldRate = basePlusGateRate;
        baseRate = _baesDayRate / DAY;    // Base rate is in seconds.
        // Need to checkpoint with the base rate update!
        checkpoint();

        emit BaseRateUpdated(oldBaseRate, baseRate);
    }

    /**
     * @dev Updates the treasury.
     */
    function setTreasury(address _treasury) external onlyGovernance {
        require(_treasury != address(0x0), "treasury not set");
        address _oldTreasury = treasury;
        treasury = _treasury;

        emit TreasuryUpdated(_oldTreasury, _treasury);
    }

    /**
     * @dev Adds a new liquidity gauge to the gauge controller. Only governance can add new gauge.
     * @param _gauge The new liquidity gauge to add.
     * @param _weight Weight of the liquidity gauge.
     * @param _plus Whether it's a plus token gauge.
     * @param _rate Initial AC emission rate for the guage.
     */
    function addGauge(address _gauge, uint256 _weight, bool _plus, uint256 _rate) external onlyGovernance {
        require(_gauge != address(0x0), "gauge not set");
        require(!gaugeSupported[_gauge], "gauge supported");

        gaugeSupported[_gauge] = true;
        gaugeWeights[_gauge] = _weight;
        dynamicGauges[_gauge] = _dynamic;
        gaugeRates[_gauge] = _rate;
        gauges.push(_gauge);

        // Need to checkpoint with the new token!
        checkpoint();

        emit GaugeAdded(_gauge, _weight, _dynamic, _rate);
    }

    /**
     * @dev Removes a liquidity gauge from gauge controller. Only governance can remove a plus token.
     * @param _gauge The liquidity gauge to remove from gauge controller.
     */
    function removeGauge(address _gauge) external onlyGovernance {
        require(_gauge != address(0x0), "gauge not set");
        require(gaugeSupported[_gauge], "gauge not supported");

        uint256 gaugeSize = gauges.length;
        uint256 gaugeIndex = gaugeSize;
        for (uint256 i = 0; i < gaugeSize; i++) {
            if (gauges[i] == _gauge) {
                gaugeIndex = i;
                break;
            }
        }
        // We must have found the gauge!
        assert(gaugeIndex < gaugeSize);

        gauges[gaugeIndex] = gauges[gaugeSize - 1];
        gauges.pop();
        delete gaugeSupported[_gauge];
        delete gaugeWeights[_gauge];

        // Need to checkpoint with the token removed!
        checkpoint();

        emit GaugeRemoved(_gauge);
    }

    /**
     * @dev Updates the weight of the liquidity gauge.
     * @param _gauge Address of the liquidity gauge to update.
     * @param _weight New weight of the liquidity gauge.
     * @param _dynamic Whether it's a dynamic or statis gauge
     * @param _rate Initial AC emission rate for the guage.
     */
    function updateGauge(address _gauge, uint256 _weight, bool _dynamic, uint256 _rate) external onlyGovernance {
        require(gaugeSupported[_gauge], "gauge supported");
        uint256 oldWeight = gaugeWeights[_gauge];
        uint256 oldRate = gaugeRates[_gauge];
        gaugeWeights[_gauge] = _weight;
        dynamicGauges[_gauge] = _dynamic;
        gaugeRates[_gauge] = _rate;

        // Need to checkpoint with the token removed!
        checkpoint();

        emit GaugeUpdated(_gauge, oldWeight, _weight, _dynamic, oldRate, _rate);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

import "../interfaces/IGauge.sol";

/**
 * @title Controller for all liquidity gauges.
 *
 * The Gauge Controller is responsible for the following:
 * 1) AC emission rate computation;
 * 2) AC emission allocation among liquidity gauges;
 * 3) AC reward claiming.
 */
contract GaugeController is Initializable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    event GovernanceUpdated(address indexed oldGovernance, address indexed newGovernance);
    event BaseRateUpdated(uint256 oldBaseRate, uint256 newBaseRate);
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event GaugeAdded(address indexed gauge, uint256 gaugeWeight);
    event GaugeRemoved(address indexed gauge);
    event GaugeWeightUpdated(address indexed gauge, uint256 oldWeight, uint256 newWeight);

    uint256 constant WAD = 10 ** 18;
    uint256 constant LOG_10_2 = 301029995663981195;  // log10(2) = 0.301029995663981195
    uint256 constant MIN_REWARD_THRESHOLD = 10 * WAD;   // The TVL should be at least 10 BTC in order to start liquidity reward

    address public governance;
    // AC token
    address public reward;

    // List of supported SINGLE PLUS tokens
    address[] public tokens;
    // SINGLE PLUS token address => Whether this single plus is supported
    mapping(address => bool) public tokenSupported;
    // List of supported liquidity gauges
    address[] public gauges;
    // Liquidity gauge address => Whether the gauge is supported
    mapping(address => bool) public gaugeSupported;
    // Liquidity gauge address => Liquidity gauge weight(in WAD)
    // Gauge weight is the multiplier applied to each gauge in computing
    // AC emission rate for invidual gauge. Base weight is WAD.
    mapping(address => uint256) public gaugeWeights;
    // Liquidity gauge address => AC emission rate(in WAD)
    mapping(address => uint256) public gaugeRates;

    // Base AC emission rate
    uint256 public baseRate;
    // Global AC emission rate
    uint256 public rate;
    // Total amount of AC rewarded until the latest checkpoint
    uint256 public totalReward;
    // Last time the checkpoint is called
    uint256 public lastUpdateTimestamp;

    /**
     * @dev Initializes the gauge controller.
     */
    function initialize(address _reward, uint256 _baseDayRate) public initializer {
        require(_reward != address(0x0), "reward not set");
        
        governance = msg.sender;
        reward = _reward;
        baseRate = _baseDayRate / 86400;    // Base rate is in seconds
        lastUpdateTimestamp = block.timestamp;
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
        uint256 totalSupply = 0;
        // Computes the total supply for all supported SINGLE plus tokens
        for (uint256 i = 0; i < tokens.length; i++) {
            totalSupply = totalSupply.add(IERC20Upgradeable(tokens[i]).totalSupply());
        }
        // Computes the AC emission per token. The AC emission rate is determined by TVL, which
        // is the sum of all single plus total supply.
        uint256 ratePerToken = 0;
        // The minimum TVL to start liquidity reward is 10
        if (totalSupply > MIN_REWARD_THRESHOLD) {
            // rate = baseRate * (log TVL - 1)
            // Minus 18 since the TVL is in WAD
            ratePerToken = baseRate.mul(_log10(totalSupply) - 1 - 18).mul(WAD).div(totalSupply);
        }

        // Allocates AC emission rates for each liquidity gauge
        uint256 totalRate;
        // Loads the gauge list for better performance
        address[] memory gaugeList = gauges;
        for (uint256 i = 0; i < gaugeList.length; i++) {
            // AC emission rate for each gauge is proportional to total amount of SINGLE plus staked times gauge weight.
            // Divided by WAD since ratePerToken is in WAD
            uint256 newGaugeRate = IGauge(gaugeList[i]).totalAmount().mul(ratePerToken).mul(gaugeWeights[gaugeList[i]]).div(WAD);
            gaugeRates[gaugeList[i]] = newGaugeRate;
            totalRate = totalRate.add(newGaugeRate);
        }

        // Checkpoints gauge controller
        totalReward = totalReward.add(rate.mul(block.timestamp.sub(lastUpdateTimestamp)));
        lastUpdateTimestamp = block.timestamp;
        rate = totalRate;

        // Checkpoints each gauge to consume the latest rate
        // We trigger gauge checkpoint after all parameters are updated
        for (uint256 i = 0; i < gaugeList.length; i++) {
            IGauge(gaugeList[i]).checkpoint();
        }
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
        address oldGovernance = governance;
        governance = _governance;
        emit GovernanceUpdated(oldGovernance, _governance);
    }

    /**
     * @dev Updates the AC emission base rate. Only governance can update the base rate.
     */
    function setBaseRate(uint256 _baesDayRate) external onlyGovernance {
        uint256 oldBaseRate = baseRate;
        baseRate = _baesDayRate / 86400;    // Base rate is in seconds.
        // Need to checkpoint with the base rate update!
        checkpoint();

        emit BaseRateUpdated(oldBaseRate, baseRate);
    }

    /**
     * @dev Adds a new single plus token to the gauge controller. Only governance can add new single plus.
     * @param _token The new single plus to add.
     */
    function addToken(address _token) external onlyGovernance {
        require(_token != address(0x0), "token not set");
        require(!tokenSupported[_token], "token supported");

        tokenSupported[_token] = true;
        tokens.push(_token);

        // Need to checkpoint with the new token!
        checkpoint();

        emit TokenAdded(_token);
    }

    /**
     * @dev Removes a single plus from gauge controller. Only governance can remove a plus token.
     * @param _token The plus token to remove from gauge controller.
     */
    function removeToken(address _token) external onlyGovernance {
        require(_token != address(0x0), "token not set");
        require(tokenSupported[_token], "token not supported");

        uint256 tokenSize = tokens.length;
        uint256 tokenIndex = tokenSize;
        for (uint256 i = 0; i < tokenSize; i++) {
            if (tokens[i] == _token) {
                tokenIndex = i;
                break;
            }
        }
        // We must have found the token!
        assert(tokenIndex < tokenSize);

        tokens[tokenIndex] = tokens[tokenSize - 1];
        tokens.pop();
        delete tokenSupported[_token];

        // Need to checkpoint with the token removed!
        checkpoint();

        emit TokenRemoved(_token);
    }

    /**
     * @dev Adds a new liquidity gauge to the gauge controller. Only governance can add new gauge.
     * @param _gauge The new liquidity gauge to add.
     * @param _weight Weight of the liquidity gauge.
     */
    function addGauge(address _gauge, uint256 _weight) external onlyGovernance {
        require(_gauge != address(0x0), "gauge not set");
        require(!gaugeSupported[_gauge], "gauge supported");

        gaugeSupported[_gauge] = true;
        gaugeWeights[_gauge] = _weight;
        gauges.push(_gauge);

        // Need to checkpoint with the new token!
        checkpoint();

        emit GaugeAdded(_gauge, _weight);
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
     */
    function setGaugeWeight(address _gauge, uint256 _weight) external onlyGovernance {
        require(gaugeSupported[_gauge], "gauge supported");
        uint256 oldWeight = gaugeWeights[_gauge];
        gaugeWeights[_gauge] = _weight;

        // Need to checkpoint with the token removed!
        checkpoint();

        emit GaugeWeightUpdated(_gauge, oldWeight, _weight);
    }
}
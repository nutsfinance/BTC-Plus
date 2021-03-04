// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "../interfaces/IGaugeController.sol";
import "../interfaces/IGauge.sol";
import "../interfaces/IPlus.sol";
import "../interfaces/IUniPool.sol";
import "../interfaces/IVotingEscrow.sol";

/**
 * @dev Liquidity gauge that stakes token and earns reward.
 * 
 * Note: The liquidity gauge is tokenized so that it's 1:1 with the staked token.
 * Credit: https://github.com/curvefi/curve-dao-contracts/blob/master/contracts/gauges/LiquidityGaugeV2.vy
 */
contract LiquidityGauge is ERC20Upgradeable, ReentrancyGuardUpgradeable, IGauge {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    event LiquidityLimitUpdated(address indexed account, uint256 balance, uint256 supply, uint256 oldWorkingSupply,
        uint256 oldWorkingBalance, uint256 newWorkingBalance, uint256 newWorkingSupply);
    event Deposited(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);
    event RewardContractUpdated(address indexed oldRewardContract, address indexed newRewardContract, address[] rewardTokens);

    uint256 constant TOKENLESS_PRODUCTION = 40;
    uint256 constant WAD = 10**18;

    address public override token;
    address public reward;
    address public controller;
    address public votingEscrow;
    uint256 public rate;

    uint256 public workingSupply;
    mapping(address => uint256) public workingBalances;

    uint256 public integral;
    uint256 public lastCheckpoint;
    mapping(address => uint256) public integralOf;
    mapping(address => uint256) public checkpointOf;

    address public rewardContract;
    address[] public rewardTokens;
    mapping(address => uint256) public rewardIntegral;
    mapping(address => mapping(address => uint256)) public rewardIntegralOf;

    /**
     * @dev Initlaizes the liquidity gauge contract.
     */
    function initialize(address _token, address _controller, address _votingEscrow) public initializer {
        require(_token != address(0x0), "token not set");
        require(_controller != address(0x0), "controller not set");
        require(_votingEscrow != address(0x0), "voting escrow not set");

        token = _token;
        controller = _controller;
        reward = IGaugeController(_controller).reward();
        votingEscrow = _votingEscrow;

        __ERC20_init(string(abi.encodePacked(ERC20Upgradeable(_token).name(), " Gauge Deposit")),
            string(abi.encodePacked(ERC20Upgradeable(_token).symbol(), "-gauge")));
        __ReentrancyGuard_init();
    }

    /**
     * @dev Returns the total amount of single plus tokens staked in the gauge.
     */
    function totalAmount() public view virtual override returns (uint256) {
        address plus = token;
        return IPlus(plus).totalUnderlying().mul(totalSupply()).div(IERC20Upgradeable(plus).totalSupply());
    }

    /**
     * @dev Important: Updates the working balance of the user to effectively apply
     * boosting on liquidity mining.
     * @param _account Address to update liquidity limit
     */
    function _updateLiquidityLimit(address _account) internal {
        IERC20Upgradeable escrow = IERC20Upgradeable(votingEscrow);
        uint256 votingBalance = escrow.balanceOf(_account);
        uint256 votingTotal = escrow.totalSupply();

        uint256 balance = balanceOf(_account);
        uint256 supply = totalSupply();
        uint256 limit = balance.mul(TOKENLESS_PRODUCTION).div(100);
        if (votingTotal > 0) {
            uint256 boosting = supply.mul(votingBalance).mul(100 - TOKENLESS_PRODUCTION).div(votingTotal).div(100);
            limit = limit.add(boosting);
        }

        limit = MathUpgradeable.min(balance, limit);
        uint256 oldWorkingBalance = workingBalances[_account];
        uint256 oldWorkingSupply = workingSupply;
        workingBalances[_account] = limit;
        uint256 newWorkingSupply = oldWorkingSupply.add(limit).sub(oldWorkingBalance);
        workingSupply = newWorkingSupply;

        emit LiquidityLimitUpdated(_account, balance, supply, oldWorkingSupply, oldWorkingBalance, limit, newWorkingSupply);
    }

    /**
     * @dev Claims pending rewards and checkpoint rewards for a user.
     * @param _account Address of the user to checkpoint reward. Zero means global checkpoint only.
     */
    function _checkpointRewards(address _account) internal {
        uint256 supply = totalSupply();
        address unipool = rewardContract;
        address[] memory rewardList = rewardTokens;
        uint256[] memory rewardBalances = new uint256[](rewardList.length);
        // No op if nothing is staked yet!
        if (supply == 0 || unipool == address(0x0) || rewardList.length == 0) return;

        // Reads balance for each reward token
        for (uint256 i = 0; i < rewardList.length; i++) {
            rewardBalances[i] = IERC20Upgradeable(rewardList[i]).balanceOf(address(this));
        }
        IUniPool(unipool).getReward();
        
        uint256 balance = balanceOf(_account);
        // Checks balance increment for each reward token
        for (uint256 i = 0; i < rewardList.length; i++) {
            uint256 diff = IERC20Upgradeable(rewardList[i]).balanceOf(address(this)).sub(rewardBalances[i]).mul(WAD).div(supply);
            uint256 newIntegral = rewardIntegral[rewardList[i]].add(diff);
            if (diff != 0) {
                rewardIntegral[rewardList[i]] = newIntegral;
            }
            if (_account == address(0x0))   continue;

            uint256 userIntegral = rewardIntegralOf[rewardList[i]][_account];
            if (userIntegral < newIntegral) {
                uint256 claimable = balance.mul(newIntegral.sub(userIntegral)).div(WAD);
                rewardIntegralOf[rewardList[i]][_account] = newIntegral;

                if (claimable > 0) {
                    IERC20Upgradeable(rewardList[i]).safeTransfer(_account, claimable);
                }
            }
        }
    }

    /**
     * @dev Performs checkpoint on AC rewards.
     * @param _account User address to checkpoint. Zero to do global checkpoint only.
     */
    function _checkpoint(address _account) internal {
        uint256 diffTime = block.timestamp.sub(lastCheckpoint);
        if (diffTime > 0) {
            uint256 newIntegral = integral.add(rate.mul(diffTime).div(workingSupply));
            integral = newIntegral;
            lastCheckpoint = block.timestamp;

            if (_account == address(0x0))   return;

            uint256 amount = workingBalances[_account].mul(newIntegral.sub(integralOf[_account])).div(WAD);
            integralOf[_account] = newIntegral;
            checkpointOf[_account] = block.timestamp;

            IGaugeController(controller).claim(_account, amount);
        }
    }

    /**
     * @dev Performs global checkpoint for the liquidity gauge.
     * Note: AC emission rate change is triggered by gauge controller. Each time there is a rate change,
     * Gauge controller will checkpoint the gauge. Therefore, we could assume that the rate is not changed
     * between two checkpoints!
     */
    function checkpoint() external override nonReentrant {
        _checkpoint(address(0x0));
        // Loads the new emission rate from gauge controller
        rate = IGaugeController(controller).gaugeRates(address(this));
    }

    /**
     * @dev Returns the amount of AC token that the user can claim.
     * @param _account Address of the account to check claimable reward.
     */
    function claimable(address _account) external view returns (uint256) {
        return workingBalances[_account].mul(integral.sub(integralOf[_account])).div(WAD);
    }

    /**
     * @dev Returns the amount of reward token that the user can claim until the latest checkpoint.
     * @param _account Address of the account to check claimable reward.
     * @param _rewardToken Address of the reward token
     */
    function claimableReward(address _account, address _rewardToken) external view returns (uint256) {
        return balanceOf(_account).mul(rewardIntegral[_rewardToken].sub(rewardIntegralOf[_rewardToken][_account])).div(WAD);
    }

    /**
     * @dev Claims reward for the user. It transfers the claimable reward to the user and updates user's liquidity limit.
     * Note: We allow anyone to claim other rewards on behalf of others, but not for the AC reward. This is because claiming AC
     * reward also updates the user's liquidity limit. Therefore, only authorized claimer can do that on behalf of user.
     * @param _account Address of the user to claim.
     * @param _claimRewards Whether to claim other rewards as well.
     */
    function claim(address _account, bool _claimRewards) external nonReentrant {
        require(_account == msg.sender || IGaugeController(controller).claimers(msg.sender), "not authorized");
        _checkpoint(_account);
        _updateLiquidityLimit(_account);

        if (_claimRewards) {
            _checkpointRewards(_account);
        }
    }

    /**
     * @dev Claims all rewards for the caller.
     * @param _account Address of the user to claim.
     */
    function claimRewards(address _account) external nonReentrant {
        _checkpointRewards(_account);
    }

    /**
     * @dev Kicks an account for abusing their boost. Only kick if the user
     * has another voting event, or their lock expires.
     */
    function kick(address _account) external nonReentrant {
        IVotingEscrow escrow = IVotingEscrow(votingEscrow);
        uint256 lastUserCheckpoint = checkpointOf[_account];
        uint256 lastUserEvent = escrow.user_point_history__ts(_account, escrow.user_point_epoch(_account));

        require(IERC20Upgradeable(address(escrow)).balanceOf(_account) == 0 || lastUserEvent > lastUserCheckpoint, "kick not allowed");

        _checkpoint(_account);
        _updateLiquidityLimit(_account);
    }

    /**
     * @dev Deposit the staked token into liquidity gauge.
     * @param _amount Amount of token to deposit.
     */
    function deposit(uint256 _amount) external nonReentrant {
        require(_amount > 0, "zero amount");

        _checkpoint(msg.sender);
        _checkpointRewards(msg.sender);

        _mint(msg.sender, _amount);
        _updateLiquidityLimit(msg.sender);

        IERC20Upgradeable(token).safeTransferFrom(msg.sender, address(this), _amount);

        if (rewardContract != address(0x0)) {
            IUniPool(rewardContract).stake(_amount);
        }

        emit Deposited(msg.sender, _amount);
    }

    /**
     * @dev Withdraw the staked token from liquidity gauge.
     * @param _amount Amounf of token to withdraw
     */
    function withdraw(uint256 _amount) external nonReentrant {
        require(_amount > 0, "zero amount");

        _checkpoint(msg.sender);
        _checkpointRewards(msg.sender);

        _burn(msg.sender, _amount);
        _updateLiquidityLimit(msg.sender);

        if (rewardContract != address(0x0)) {
            IUniPool(rewardContract).withdraw(_amount);
        }

        IERC20Upgradeable(token).safeTransfer(msg.sender, _amount);
        emit Withdrawn(msg.sender, _amount);
    }

    /**
     * @dev Moves tokens `amount` from `sender` to `recipient`.
     */
    function _transfer(address _sender, address _recipient, uint256 _amount) internal virtual override {
        _checkpoint(_sender);
        _checkpoint(_recipient);
        _checkpointRewards(_sender);
        _checkpointRewards(_recipient);

        // Invoke super _transfer to emit Transfer event
        super._transfer(_sender, _recipient, _amount);

        _updateLiquidityLimit(_sender);
        _updateLiquidityLimit(_recipient);
    }

    /*********************************************
     *
     *    Governance methods
     *
     **********************************************/
    
    /**
     * @dev All liqduiity gauge share the same governance of gauge controller.
     */
    function _checkGovernance() internal view {
        require(msg.sender == IGaugeController(controller).governance(), "not governance");
    }

    modifier onlyGovernance() {
        _checkGovernance();
        _;
    }

    /**
     * @dev Updates the reward contract and reward tokens.
     * @param _rewardContract The new active reward contract.
     * @param _rewardTokens The reward tokens from the reward contract.
     */
    function setRewards(address _rewardContract, address[] memory _rewardTokens) public onlyGovernance {
        address currentRewardContract = rewardContract;
        if (currentRewardContract != address(0x0)) {
            _checkpointRewards(address(0x0));
            IUniPool(rewardContract).exit();

            IERC20Upgradeable(token).safeApprove(currentRewardContract, 0);
        }

        if (_rewardContract != address(0x0)) {
            IERC20Upgradeable(token).safeApprove(_rewardContract, uint256(-1));
            IUniPool(_rewardContract).stake(totalSupply());

            rewardContract = _rewardContract;
            rewardTokens = _rewardTokens;

            // Complete an initial checkpoint to make sure that everything works.
            _checkpointRewards(address(0x0));
        }

        emit RewardContractUpdated(currentRewardContract, _rewardContract, _rewardTokens);
    }
}
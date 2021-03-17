// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

import "../interfaces/autofarm/IAutoBTC.sol";
import "../interfaces/autofarm/IAutoFarm.sol";
import "../interfaces/autofarm/IStrat.sol";

/**
 * @dev Tokenization of AutoFarm's BTCB position.
 *
 * AutoFarm is currently the biggest yield farming aggregator in BSC, but it's
 * yield position is not tokenized so that AutoFarm users cannot enhance capital
 * efficiency of their positions.
 *
 * The purpose of AutoBTC is to tokenized AutoFarm's BTCB position so that:
 * 1. The total supply of autoBTC equals the total shares owned by autoBTC in the BTCB strategy;
 * 2. User's autoBTC balance equals the share they could get by depositing the same
 * amount of BTCB into AutoFarm directly;
 * 3. Users won't lose any AUTO rewards by minting autoBTC.
 */
contract AutoBTC is ERC20Upgradeable, IAutoBTC {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    event Claimed(address indexed claimer, uint256 amount);

    address public constant BTCB = address(0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c);
    address public constant AUTOv2 = address(0xa184088a740c695E156F91f5cC086a06bb78b827);
    address public constant AUTOFARM = address(0x0895196562C7868C5Be92459FaE7f877ED450452);
    address public constant BTBC_STRAT = address(0x8E24B8136c3076829A4eD0412cd8F302fA651D84);
    uint256 public constant PID = 3;
    uint256 public constant WAD = 10**18;

    // Accumulated AUTO per token in WAD
    uint256 public rewardPerTokenStored;
    // Auto balance of this contract in the last update
    uint256 public lastReward;
    // User address => Reward debt per token for this user
    mapping(address => uint256) public rewardPerTokenPaid;
    // User address => Claimable rewards for this user
    mapping(address => uint256) public rewards;

    /**
     * @dev Initializes the autoBTC.
     */
    function initialize() public initializer {
        // BTCB and AutoFarm BTCB share are both 18 decimals.
        __ERC20_init("AutoFarm BTC", "autoBTC");
        // We set infinite allowance since autoBTC does not hold any asset.
        IERC20Upgradeable(BTCB).safeApprove(AUTOFARM, uint256(-1));
    }

    /**
     * @dev Returns the underlying token of the AutoFarm position.
     */
    function underlying() public view override returns (address) {
        return BTCB;
    }

    /**
     * @dev Returns the update-to-date exchange rate between AutoBTC and BTCB.
     */
    function exchangeRateCurrent() public override returns (uint256) {
        // Note: This function will throw if onlyGov = true in BTCB strategy!
        IStrat(BTBC_STRAT).earn();
        return IAutoFarm(AUTOFARM).stakedWantTokens(PID, address(this)).mul(WAD).div(totalSupply());
    }

    /**
     * @dev Returns the current exchange rate between AutoBTC and BTCB.
     */
    function exchangeRateStored() public view override returns (uint256) {
        return IAutoFarm(AUTOFARM).stakedWantTokens(PID, address(this)).mul(WAD).div(totalSupply());
    }

    /**
     * @dev Updates rewards for the user.
     */
    function _updateReward(address _account) internal {
        uint256 _totalSupply = totalSupply();
        uint256 _reward = IERC20Upgradeable(AUTOv2).balanceOf(address(this));
        uint256 _rewardDiff = _reward.sub(lastReward);

        if (_totalSupply > 0 && _rewardDiff > 0) {
            lastReward = _reward;
            rewardPerTokenStored = _rewardDiff.mul(WAD).div(_totalSupply).add(rewardPerTokenStored);
        }

        rewards[_account] = rewardPerTokenStored.sub(rewardPerTokenPaid[_account])
            .mul(balanceOf(_account)).div(WAD).add(rewards[_account]);
        rewardPerTokenPaid[_account] = rewardPerTokenStored;
    }

    /**
     * @dev Mints autoBTC with BTCB.
     * @param _amount Amount of BTCB used to mint autoBTC.
     */
    function mint(uint256 _amount) public override {
        uint256 _before = IStrat(BTBC_STRAT).sharesTotal();
        IERC20Upgradeable(BTCB).safeTransferFrom(msg.sender, address(this), _amount);

        // Note: AutoFarm has an entrance fee
        // Each deposit and withdraw trigger AUTO distribution in AutoFarm
        IAutoFarm(AUTOFARM).deposit(PID, _amount);
        uint256 _after = IStrat(BTBC_STRAT).sharesTotal();

        // Updates the rewards before minting
        _updateReward(msg.sender);

        // 1 autoBTC = 1 share in AutoFarm BTCB strategy
        _mint(msg.sender, _after.sub(_before));
    }

    /**
     * @dev Redeems autoBTC to BTCB.
     * @param _amount Amount of BTCB to redeem from autoBTC.
     *
     * Note: This accommodates AutoFarm's behavior to user BTCB amount, instead of share amount to withdraw. Also,
     * if a number larger than user balance is provided, it will withdraw all balance of the user.
     */
    function redeem(uint256 _amount) public override {
        uint256 _before = IStrat(BTBC_STRAT).sharesTotal();

        // Each deposit and withdraw trigger AUTO distribution in AutoFarm
        IAutoFarm(AUTOFARM).withdraw(PID, _amount);
        uint256 _after = IStrat(BTBC_STRAT).sharesTotal();

        // Updates the rewards before redeeming
        _updateReward(msg.sender);

        // 1 autoBTC = 1 share in AutoFarm BTCB strategy
        _burn(msg.sender, _before.sub(_after));
    }

    /**
     * @dev Claims all AUTO available for the caller.
     */
    function claimRewards() public override {
        // Triggers AUTO distribution with a zero deposit
        IAutoFarm(AUTOFARM).deposit(PID, 0);

        // Updates the rewards before redeeming
        _updateReward(msg.sender);

        uint256 _reward = rewards[msg.sender];
        if (_reward > 0) {
            IERC20Upgradeable(AUTOv2).safeTransfer(msg.sender, _reward);
            rewards[msg.sender] = 0;
        }

        // Need to update the reward balance again!
        lastReward = IERC20Upgradeable(AUTOv2).balanceOf(address(this));

        emit Claimed(msg.sender, _reward);
    }

    /**
     * @dev Updates AUTO rewards before actual transfer.
     */
    function _transfer(address _from, address _to, uint256 _amount) internal virtual override {
        // Triggers AUTO distribution with a zero deposit
        IAutoFarm(AUTOFARM).deposit(PID, 0);

        // Updates the rewards before the actual transfer
        _updateReward(_from);
        _updateReward(_to);

        super._transfer(_from, _to, _amount);
    }
}
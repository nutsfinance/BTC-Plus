// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

import "../interfaces/IPool.sol";
import "../interfaces/IStrategy.sol";
import "../BTC+.sol";

/**
 * @dev Base pool contract.
 */
abstract contract BasePool is IPool, Initializable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    address public btcPlus;
    address public override token;
    mapping(address => bool) public strategies;
    address public activeStrategy;

    /**
     * @dev Initializes the pool with BTC+ and token addresses.
     */
    function __BasePool_init(address _btcPlus, address _token) internal initializer {
        require(_btcPlus != address(0x0), "BTC+ not set");
        require(_token != address(0x0), "token not set");

        btcPlus = _btcPlus;
        token = _token;
    }

    function _checkBTCPlus() internal view {
        require(msg.sender == btcPlus, "not btc+");
    }

    modifier onlyBTCPlus {
        _checkBTCPlus();
        _;
    }

    function _checkGovernance() internal view {
        require(msg.sender == BTCPlus(btcPlus).governance(), "not governance");
    }

    modifier onlyGovernance() {
        _checkGovernance();
        _;
    }

    function _checkStrategist() internal view {
        require(msg.sender == BTCPlus(btcPlus).governance() || BTCPlus(btcPlus).strategists(msg.sender), "not strategist");
    }

    modifier onlyStrategist {
        _checkStrategist();
        _;
    }

    /**
     * @dev Returns the total amount of tokens managed by the pool.
     */
    function balance() public view virtual override returns (uint256) {
        IERC20Upgradeable poolToken = IERC20Upgradeable(token);
        uint256 amount = poolToken.balanceOf(address(this));
        if (activeStrategy != address(0x0)) {
            amount = amount.add(IStrategy(activeStrategy).balance());
        }

        return amount;
    }

    /**
     * @dev Returns the total amount of ERC20 BTC tokens managed by the pool, scaled to 18 decimals.
     * If the managed token is an ERC20 BTC token, then it's equal to balance().
     * If the managed token is an ERC20 BTC LP token, then it's equal to balance() * exchange rate.
     * E.g. For renCrv pool, underlyingBalance() = balance() * Curve Ren Pool.get_virtual_price().
     */
    function underlyingBalance() public view virtual override returns (uint256) {
        return underlyingBalanceOf(balance());
    }

    /**
     * @dev Returns the total amount of ERC20 BTC tokens worth for the specified amount of token managed
     * by the pool.
     * @param _amount Amount of the token to convert.
     * @return The amount of ERC20 BTC tokens worth.
     */
    function underlyingBalanceOf(uint256 _amount) public view virtual override returns (uint256);

    /**
     * @dev Returns the governance address.
     */
    function governance() public view override returns (address) {
        return BTCPlus(btcPlus).governance();
    }

    /**
     * @dev Returns whether the account is a strategist.
     */
    function strategist(address _account) public view override returns (bool) {
        return BTCPlus(btcPlus).strategists(_account);
    }

    /**
     * @dev Returns the treasury address.
     */
    function treasury() public view override returns (address) {
        return BTCPlus(btcPlus).treasury();
    }

    /**
     * @dev Withdraws managed token from the pool. Only BTC+ can invoke this function.
     * @param _receiver Account to receive the token withdraw.
     * @param _amount Amount to withdraw.
     */
    function withdraw(address _receiver, uint256  _amount) public virtual override onlyBTCPlus {
        IERC20Upgradeable poolToken = IERC20Upgradeable(token);
        uint256 amount = poolToken.balanceOf(address(this));
        address strategy = activeStrategy;

        if (amount < _amount) {
            require(strategy != address(0x0), "no active strategy");
            IStrategy(strategy).withdraw(_amount.sub(amount));
        }

        poolToken.safeTransfer(_receiver, _amount);
    }

    /**
     * @dev Approves a strategy for the pool. Only governance can approve new strategy.
     * @param _strategy Address of the strategy to approve.
     * @param _setActive Whether to set this strategy as the active strategy.
     */
    function approveStrategy(address _strategy, bool _setActive) public virtual onlyGovernance {
        require(_strategy != address(0x0), "address not set");
        require(!strategies[_strategy], "already approved");

        strategies[_strategy] = true;
        emit StrategyListUpdated(_strategy, true);

        if (_setActive) {
            _setActiveStrategy(_strategy);
        }
    }

    /**
     * @dev Revoke a strategy for the pool. Only strategist can revoke strategy.
     * Note that only governance can approve new strategy, but strategists can revoke strategies.
     * @param _strategy Address of the strategy to revoke.
     */
    function revokeStrategy(address _strategy) public virtual onlyStrategist {
        require(_strategy != address(0x0), "address not set");
        require(strategies[_strategy], "not approved");

        strategies[_strategy] = false;
        emit StrategyListUpdated(_strategy, false);

        // If the strategy to revoke is the current active strategy, clears the active strategy.
        if (_strategy == activeStrategy) {
            _setActiveStrategy(address(0x0));
        }
    }

    /**
     * @dev Set a strategy as the active strategy. Only strategist can set active strategy.
     * @param _strategy Address of strategy to set as active. If empty it means clearing the active strategy.
     */
    function setActiveStrategy(address _strategy) public virtual onlyStrategist {
        require(strategies[_strategy], "not approved");

        _setActiveStrategy(_strategy);
    }

    function _setActiveStrategy(address _strategy) internal {
        address oldActiveStrategy = activeStrategy;
        if (oldActiveStrategy != address(0x0)) {
            IStrategy(oldActiveStrategy).withdrawAll();
        }

        activeStrategy = _strategy;
        emit ActiveStrategyUpdated(oldActiveStrategy, _strategy);

        invest();
    }

    /**
     * @dev Invest the managed token into strategy to earn yield.
     * Only BTC+, governance and strategists can invoke this function.
     */
    function invest() public virtual override onlyStrategist {
        if (activeStrategy == address(0x0)) return;

        IERC20Upgradeable poolToken = IERC20Upgradeable(token);
        uint256 amount = poolToken.balanceOf(address(this));
        if (amount > 0) {
            poolToken.safeTransfer(activeStrategy, amount);
            IStrategy(activeStrategy).deposit();
        }
    }

    /**
     * @dev Harvest from strategy.
     * Only BTC+, governance and strategists can invoke this function.
     */
    function harvest() public virtual override onlyStrategist {
        if (activeStrategy != address(0x0)) {
            IStrategy(activeStrategy).harvest();
        }
    }

    /**
     * @dev Used to salvage any ETH deposited to the pool contract by mistake. Only strategist can salvage ETH.
     * The salvaged ETH is transferred to treasury for futher operation.
     */
    function salvage() external onlyStrategist {
        uint256 amount = address(this).balance;
        address payable target = payable(BTCPlus(btcPlus).treasury());
        (bool success, ) = target.call{value: amount}(new bytes(0));
        require(success, 'ETH salvage failed');
    }

    /**
     * @dev Used to salvage any token deposited to the pool contract by mistake. Only strategist can salvage token.
     * The salvaged token is transferred to treasury for futhuer operation.
     * @param _token Address of the token to salvage.
     */
    function salvageToken(address _token) external onlyStrategist {
        require(_token != address(0x0), "token not set");
        require(_token != token, "cannot salvage");

        IERC20Upgradeable target = IERC20Upgradeable(_token);
        target.safeTransfer(BTCPlus(btcPlus).treasury(), target.balanceOf(address(this)));
    }
}
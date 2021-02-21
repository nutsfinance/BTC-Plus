// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

import "../interfaces/IPool.sol";
import "../interfaces/IStrategy.sol";

/**
 * @notice Base contract of Strategy.
 * 
 * This contact defines common properties and functions shared by all strategies.
 * One strategy is bound to one pool and cannot be changed.
 */
abstract contract StrategyBase is IStrategy, Initializable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    event PerformanceFeeUpdated(uint256 oldPerformanceFee, uint256 newPerformanceFee);
    event WithdrawalFeeUpdated(uint256 oldWithdrawFee, uint256 newWithdrawFee);

    address public pool;
    uint256 public performanceFee;
    uint256 public withdrawalFee;
    uint256 public constant PERCENT_MAX = 10000;    // 0.01%

    function __StrategyBase_init(address _pool) internal initializer {
        require(_pool != address(0x0), "pool not set");
        pool = _pool;
    }

    function _checkPool() internal view {
        require(msg.sender == pool, "not pool");
    }

    modifier onlyPool {
        _checkPool();
        _;
    }

    function _checkGovernance() internal view {
        require(msg.sender == pool || msg.sender == IPool(pool).governance(), "not governance");
    }

    modifier onlyGovernance() {
        _checkGovernance();
        _;
    }

    function _checkStrategist() internal view {
        require(msg.sender == pool || msg.sender == IPool(pool).governance() || IPool(pool).strategist(msg.sender), "not strategist");
    }

    modifier onlyStrategist() {
        _checkStrategist();
        _;
    }

    /**
     * @dev Updates the performance fee. Only governance can update the performance fee.
     */
    function setPerformanceFee(uint256 _performanceFee) public onlyGovernance {
        require(_performanceFee <= PERCENT_MAX, "overflow");
        uint256 oldPerformanceFee = performanceFee;
        performanceFee = _performanceFee;

        emit PerformanceFeeUpdated(oldPerformanceFee, _performanceFee);
    }

    /**
     * @dev Updates the withdrawal fee. Only governance can update the withdrawal fee.
     */
    function setWithdrawalFee(uint256 _withdrawalFee) public onlyGovernance {
        require(_withdrawalFee <= PERCENT_MAX, "overflow");
        uint256 oldWithdrawalFee = withdrawalFee;
        withdrawalFee = _withdrawalFee;

        emit WithdrawalFeeUpdated(oldWithdrawalFee, _withdrawalFee);
    }

    /**
     * @dev Used to salvage any ETH deposited into the pool by mistake.
     * Only governance or strategist can salvage ETH from the pool.
     * The salvaged ETH is transferred to treasury for futher operation.
     */
    function salvage() public onlyStrategist {
        uint256 amount = address(this).balance;
        address payable target = payable(IPool(pool).treasury());
        (bool success, ) = target.call{value: amount}(new bytes(0));
        require(success, 'ETH salvage failed');
    }

    /**
     * @dev Used to salvage any token deposited into the pool by mistake.
     * The want token cannot be salvaged.
     * Only governance or strategist can salvage token from the pool.
     * The salvaged token is transferred to treasury for futhuer operation.
     * @param _tokenAddress Token address to salvage.
     */
    function salvageToken(address _tokenAddress) public onlyStrategist {
        address[] memory protected = _getProtectedTokens();
        for (uint256 i = 0; i < protected.length; i++) {
            require(_tokenAddress != protected[i], "cannot salvage");
        }

        IERC20Upgradeable token = IERC20Upgradeable(_tokenAddress);
        token.safeTransfer(IPool(pool).treasury(), token.balanceOf(address(this)));
    }

    /**
     * @dev Return the list of tokens that should not be salvaged.
     */
    function _getProtectedTokens() internal virtual view returns (address[] memory);
}
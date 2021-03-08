// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

import "../interfaces/ISinglePlus.sol";
import "../interfaces/IStrategy.sol";

/**
 * @notice Base contract of Strategy.
 * 
 * This contact defines common properties and functions shared by all strategies.
 * One strategy is bound to one single plus and cannot be changed.
 */
abstract contract StrategyBase is IStrategy, Initializable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    event PerformanceFeeUpdated(uint256 oldPerformanceFee, uint256 newPerformanceFee);

    address public plus;
    uint256 public performanceFee;
    uint256 public constant PERCENT_MAX = 10000;    // 0.01%

    function __StrategyBase_init(address _plus) internal initializer {
        require(_plus != address(0x0), "plus token not set");
        plus = _plus;
    }

    function _checkPlus() internal view {
        require(msg.sender == plus, "not plus token");
    }

    modifier onlyPlus {
        _checkPlus();
        _;
    }

    function _checkGovernance() internal view {
        require(msg.sender == plus || msg.sender == ISinglePlus(plus).governance(), "not governance");
    }

    modifier onlyGovernance() {
        _checkGovernance();
        _;
    }

    function _checkStrategist() internal view {
        require(msg.sender == plus || msg.sender == ISinglePlus(plus).governance() || ISinglePlus(plus).strategists(msg.sender), "not strategist");
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
     * @dev Used to salvage any ETH deposited into the plus by mistake.
     * Only governance or strategist can salvage ETH from the plus.
     * The salvaged ETH is transferred to treasury for futher operation.
     */
    function salvage() public onlyStrategist {
        uint256 _amount = address(this).balance;
        address payable _treasury = payable(ISinglePlus(plus).treasury());
        (bool _success, ) = _treasury.call{value: _amount}(new bytes(0));
        require(_success, 'ETH salvage failed');
    }

    /**
     * @dev Used to salvage any token deposited to strategist contract by mistake. Only strategist can salvage token.
     * The salvaged token is transferred to treasury for futhuer operation.
     * @param _token Address of the token to salvage.
     */
    function salvageToken(address _token) external onlyStrategist {
        require(_token != address(0x0), "token not set");
        require(_salvageable(_token), "cannot salvage");

        IERC20Upgradeable _target = IERC20Upgradeable(_token);
        address _treasury = ISinglePlus(plus).treasury();
        _target.safeTransfer(_treasury, _target.balanceOf(address(this)));
    }

    /**
     * @dev Checks whether a token can be salvaged via salvageToken().
     * @param _token Token to check salvageability.
     */
    function _salvageable(address _token) internal view virtual returns (bool);

}
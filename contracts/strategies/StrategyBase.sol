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
 * One strategy is bound to one plusToken and cannot be changed.
 */
abstract contract StrategyBase is IStrategy, Initializable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    event PerformanceFeeUpdated(uint256 oldPerformanceFee, uint256 newPerformanceFee);
    event WithdrawalFeeUpdated(uint256 oldWithdrawFee, uint256 newWithdrawFee);

    address public plusToken;
    uint256 public performanceFee;
    uint256 public constant PERCENT_MAX = 10000;    // 0.01%

    function __StrategyBase_init(address _plusToken) internal initializer {
        require(_plusToken != address(0x0), "plus token not set");
        plusToken = _plusToken;
    }

    function _checkPlusToken() internal view {
        require(msg.sender == plusToken, "not plus token");
    }

    modifier onlyPlusToken {
        _checkPlusToken();
        _;
    }

    function _checkGovernance() internal view {
        require(msg.sender == plusToken || msg.sender == ISinglePlus(plusToken).governance(), "not governance");
    }

    modifier onlyGovernance() {
        _checkGovernance();
        _;
    }

    function _checkStrategist() internal view {
        require(msg.sender == plusToken || msg.sender == ISinglePlus(plusToken).governance() || ISinglePlus(plusToken).strategists(msg.sender), "not strategist");
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
     * @dev Used to salvage any ETH deposited into the plusToken by mistake.
     * Only governance or strategist can salvage ETH from the plusToken.
     * The salvaged ETH is transferred to treasury for futher operation.
     */
    function salvage() public onlyStrategist {
        uint256 amount = address(this).balance;
        address payable target = payable(ISinglePlus(plusToken).treasury());
        (bool success, ) = target.call{value: amount}(new bytes(0));
        require(success, 'ETH salvage failed');
    }

    /**
     * @dev Used to salvage any token deposited into the plusToken by mistake.
     * The want token cannot be salvaged.
     * Only governance or strategist can salvage token from the plusToken.
     * The salvaged token is transferred to treasury for futhuer operation.
     * @param _tokenAddress Token address to salvage.
     */
    function salvageToken(address _tokenAddress) public onlyStrategist {
        address[] memory protected = _getProtectedTokens();
        for (uint256 i = 0; i < protected.length; i++) {
            require(_tokenAddress != protected[i], "cannot salvage");
        }

        IERC20Upgradeable token = IERC20Upgradeable(_tokenAddress);
        token.safeTransfer(ISinglePlus(plusToken).treasury(), token.balanceOf(address(this)));
    }

    /**
     * @dev Return the list of tokens that should not be salvaged.
     */
    function _getProtectedTokens() internal virtual view returns (address[] memory);
}
// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";

import "../interfaces/curve/ICurveFi.sol";
import "./BasePool.sol";

/**
 * @dev Curve's ERC20 BTC LP pool.
 */
contract CurvePool is BasePool {
    using SafeMathUpgradeable for uint256;

    address public swap;
    mapping(address => bool) public underlyingTokens;

    /**
     * @dev Initializes the pool.
     */
    function initialize(address _btcPlus, address _token, address _swap, address[] memory _underlyingTokens) public initializer {
        require(_swap != address(0x0), "swap not set");
        __BasePool_init(_btcPlus, _token);

        swap = _swap;
        for (uint256 i = 0; i < _underlyingTokens.length; i++) {
            underlyingTokens[_underlyingTokens[i]] = true;
        }
    }

    /**
     * @dev Returns the total amount of ERC20 BTC tokens managed by the pool.
     * For Curve ERC20 BTC LP, it's equal to balance() * get_virtual_price().
     */
    function underlyingBalance() public view override returns (uint256) {
        return balance().mul(ICurveFi(swap).get_virtual_price()).div(10e18);
    }

    /**
     * @dev Returns the amount of a specific underlying ERC20 BTC.
     * For Curve ERC20 BTC LP, it's the same as underlyingBalance() for underlyingTokens and zero otherwise.
     */
    function underlyingBalanceOf(address _token) public view override returns (uint256) {
        return underlyingTokens[_token] ? underlyingBalance() : 0;
    }
}
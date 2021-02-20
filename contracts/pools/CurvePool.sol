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
     * @dev Returns the total amount of ERC20 BTC tokens worth for the specified amount of token managed
     * by the pool.
     * @param _amount Amount of the token to convert.
     * @return The amount of ERC20 BTC tokens worth.
     */
    function underlyingBalanceOf(uint256 _amount) public view override returns (uint256) {
        return _amount.mul(ICurveFi(swap).get_virtual_price()).div(10e18);
    }
}
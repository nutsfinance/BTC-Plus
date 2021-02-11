// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";

import "../interfaces/compound/ICToken.sol";
import "./BasePool.sol";

/**
 * @dev Compound's cToken pool.
 */
 contract CompoundPool is BasePool {
     using SafeMathUpgradeable for uint256;

    /**
     * @dev Initializes the pool.
     */
    function initialize(address _btcPlus, address _token) public initializer {
        __BasePool_init(_btcPlus, _token);
    }

    /**
     * @dev Returns the total amount of ERC20 BTC tokens managed by the pool.
     * For Compound ERC20 BTC LP, it's equal to balance() * exchangeRate().
     */
    function underlyingBalance() public view override returns (uint256) {
        return balance().mul(ICToken(token).exchangeRateStored()).div(10e18);
    }

    /**
     * @dev Returns the amount of a specific underlying ERC20 BTC.
     * For Compound ERC20 BTC LP, it's the same as underlyingBalance() for underlying token and zero otherwise.
     */
    function underlyingBalanceOf(address _token) public view override returns (uint256) {
        return _token == ICToken(token).underlying() ? underlyingBalance() : 0;
    }
 }
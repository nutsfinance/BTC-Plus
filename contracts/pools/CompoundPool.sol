// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

import "../interfaces/compound/ICToken.sol";
import "./BasePool.sol";

/**
 * @dev Compound's cToken pool.
 */
 contract CompoundPool is BasePool {
    using SafeMathUpgradeable for uint256;

    // Conversion ratio to scale token balance to WAD.
    // Caches the ratio for better performance in rebase.
    uint256 public ratio;

    /**
     * @dev Initializes the pool.
     */
    function initialize(address _btcPlus, address _token) public initializer {
        __BasePool_init(_btcPlus, _token);
        ratio = uint256(10) ** (18 - ERC20Upgradeable(ICToken(_token).underlying()).decimals());
    }

    /**
     * @dev Returns the total amount of ERC20 BTC tokens managed by the pool.
     * For Compound ERC20 BTC LP, it's equal to balance() * exchangeRate().
     */
    function underlyingBalance() public view override returns (uint256) {
        return balance().mul(ICToken(token).exchangeRateStored()).div(10e18).mul(ratio);
    }
 }
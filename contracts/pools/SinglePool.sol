// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

import "./BasePool.sol";

/**
 * @dev ERC20 BTC pool.
 * Note: aToken also works with single pool since it remains 1:1 with underlying token.
 */
contract SinglePool is BasePool {

    // Conversion ratio to scale token balance to WAD.
    // Caches the ratio for better performance in rebase.
    uint256 public ratio;

    /**
     * @dev Initializes the pool with BTC+ and token addresses.
     */
    function initialize(address _btcPlus, address _token) public initializer {
        __BasePool_init(_btcPlus, _token);
        ratio = uint256(10) ** (18 - ERC20Upgradeable(_token).decimals());
    }

    /**
     * @dev Returns the total amount of ERC20 BTC tokens managed by the pool, scaled to 18 decimals.
     * For ERC20 BTC token, it's the same as balance() scaled to WAD.
     */
    function underlyingBalance() public view override returns (uint256) {
        return balance().mul(ratio);
    }
}
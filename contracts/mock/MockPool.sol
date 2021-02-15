// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

import "../pools/BasePool.sol";

/**
 * @dev Mock pool.
 */
contract MockPool is BasePool {

    /**
     * @dev Initializes the pool with BTC+ and token addresses.
     */
    function initialize(address _btcPlus, address _token) public initializer {
        __BasePool_init(_btcPlus, _token);
    }

    /**
     * @dev Updates the BTC+ address. Used for testing purpose.
     */
    function setBTCPlus(address _btcPlus) public {
        btcPlus = _btcPlus;
    }

    /**
     * @dev Returns the total amount of ERC20 BTC tokens managed by the pool, scaled to 18 decimals.
     * For ERC20 BTC token, it's the same as balance() scaled to WAD.
     */
    function underlyingBalance() public view override returns (uint256) {
        return balance();
    }
}
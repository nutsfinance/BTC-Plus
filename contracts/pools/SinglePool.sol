// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./BasePool.sol";

/**
 * @dev ERC20 BTC pool.
 * Note: aToken also works with single pool since it remains 1:1 with underlying token.
 */
contract SinglePool is BasePool {

    /**
     * @dev Initializes the pool with BTC+ and token addresses.
     */
    function initialize(address _btcPlus, address _token) public initializer {
        __BasePool_init(_btcPlus, _token);
    }

    /**
     * @dev Returns the total amount of ERC20 BTC tokens managed by the pool.
     * For ERC20 BTC token, it's the same as balance().
     */
    function underlyingBalance() public view override returns (uint256) {
        return balance();
    }

    /**
     * @dev Returns the amount of a specific underlying ERC20 BTC.
     * For ERC20 BTC token, it's the same as balance() for token() and zero otherwise.
     */
    function underlyingBalanceOf(address _token) public view override returns (uint256) {
        return _token == token ? balance() : 0;
    }
}
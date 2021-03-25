// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "../CompositePlus.sol";

/**
 * @title BTC+ token contract.
 * 
 * Users can mint BTC+ with both ERC20 BTC token or ERC20 BTC LP token. 1 ERC20 BTC mints 1 BTC+.
 * The BTC+ balance increases as interest is accrued with the tokens used to mint BTC+.
 *
 * BTC+ is a composite plus token backed by a basket of BTC pegged single plus tokens, e.g. renCrv+, cWBTC+.
 */
contract BTCPlus is CompositePlus {

    /**
     * @dev Initializes the BTC+ contract.
     */
    function initialize() public initializer {
        CompositePlus.initialize("BTC Plus", "BTC+");
    }
}
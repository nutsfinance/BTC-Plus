// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;
pragma experimental ABIEncoderV2;

import "../../SinglePlus.sol";

/**
 * @dev Single Plus for Aave v2 WBTC.
 */
contract AaveWBTCPlus is SinglePlus {
    address public constant AAVE_WBTC = address(0x9ff58f4fFB29fA2266Ab25e75e2A8b3503311656);

    /**
     * @dev Initializes aWBTC+.
     */
    function initialize() public initializer {
        SinglePlus.initialize(AAVE_WBTC, "", "");
    }
}
// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./MockToken.sol";

/**
 * @notice Mock ACoconut token.
 */
contract MockACoconut is MockToken {

    constructor() public MockToken("Mock ACoconut", "mAC", 18) {}
}
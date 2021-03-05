// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./MockToken.sol";
import "../interfaces/compound/ICToken.sol";

/**
 * @notice Mock cToken.
 */
contract MockCToken is ICToken, MockToken {
    MockToken public token;

    constructor(string memory _name, string memory _symbol) public MockToken(_name, _symbol, 18) {
        token = new MockToken("Mock Token", "Mock Token", 18);
    }

    function underlying() external view override returns (address) {
        return address(token);
    }

    function exchangeRateCurrent() external override returns (uint256) {
        return 11 * 10**17;
    }

    function exchangeRateStored() external view override returns (uint256) {
        return 11 * 10**17;
    }

}
// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/proxy/TransparentUpgradeableProxy.sol";

/**
 * @title Proxy for ERC20 tokens.
 */
contract ERC20Proxy is TransparentUpgradeableProxy {
    constructor(address _logic, address _admin, bytes memory _data) TransparentUpgradeableProxy(_logic, _admin, _data) public payable {}
}
// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

/**
 * @notice Mock ERC20 token.
 */
contract MockToken is ERC20Upgradeable {

    function initialize(string memory name, string memory symbol, uint8 decimals) public {
        __ERC20_init(name, symbol);
        _setupDecimals(decimals);
    }

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) public {
        _burn(account, amount);
    }
}
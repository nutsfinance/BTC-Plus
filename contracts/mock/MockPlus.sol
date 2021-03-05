// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "../tokens/Plus.sol";
import "./MockToken.sol";

/**
 * @dev Mock plus implementation.
 */
contract MockPlus is Plus {
    uint256 public underlying;

    function initialize(string memory _name, string memory _symbol) public {
        __PlusToken__init(_name, _symbol);
    }

    /**
     * @dev Returns the total value of the plus token in terms of the peg value.
     * All underlying token amounts have been scaled to 18 decimals.
     * For single plus, it's equal to its total supply.
     * For composite plus, it's equal to the total amount of single plus tokens in its basket.
     */
    function totalUnderlying() public view virtual override returns (uint256) {
        return underlying;
    }

    function increment(uint256 amount) public {
        underlying = underlying + amount;
    }

    function mintShares(address user, uint256 amount) public {
        totalShares += amount;
        userShare[user] += amount;
        underlying += amount * index / WAD; 
    }
}
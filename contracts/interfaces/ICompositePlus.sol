// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "./IPlus.sol";

/**
 * @title Interface for composite plus token.
 * Composite plus is backed by a basket of plus with the same peg.
 */
interface ICompositePlus is IPlus {
    /**
     * @dev Returns the address of the underlying token.
     */
    function tokens(uint256 _index) external view returns (address);

    /**
     * @dev Checks whether a token is supported by the basket.
     */
    function tokenSupported(address _token) external view returns (bool);
}
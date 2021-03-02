// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./IPlus.sol";

/**
 * @title Interface for single plus token.
 * Single plus token is backed by one ERC20 token and targeted at yield generation.
 */
interface ISinglePlus is IPlus {
    /**
     * @dev Returns the address of the underlying token.
     */
    function token() external view returns (address);

    /**
     * @dev Invest the underlying token into strategy to earn yield.
     */
    function invest() external;

    /**
     * @dev Harvest from strategy.
     */
    function harvest() external;
}
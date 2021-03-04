// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

/**
 * @title Interface for plus token.
 * Plus token is a value pegged ERC20 token which provides global interest to all holders.
 */
interface IPlus {
    /**
     * @dev Returns the governance address.
     */
    function governance() external view returns (address);

    /**
     * @dev Returns whether the account is a strategist.
     */
    function strategists(address _account) external view returns (bool);

    /**
     * @dev Returns the treasury address.
     */
    function treasury() external view returns (address);

    /**
     * @dev Returns the total value of the plus token in terms of the peg value.
     * All underlying token amounts have been scaled to 18 decimals.
     * For single plus, it's equal to its total supply.
     * For composite plus, it's equal to the total amount of single plus tokens in its basket.
     */
    function totalUnderlying() external view returns (uint256);
}
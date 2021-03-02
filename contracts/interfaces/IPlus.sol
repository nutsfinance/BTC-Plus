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
}
// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

/**
 * @title Interface for strategy contract.
 */
interface IStrategy {

    /**
     * @dev Returns the amount of tokens managed by the strategy.
     */
    function balance() external view returns (uint256);

    /**
     * @dev Withdraws a portional amount of assets from the Strategy.
     */
    function withdraw(uint256 _amount) external;

    /**
     * @dev Withdraws all assets out of the Strategy.  Usually used in strategy migration.
     */
    function withdrawAll() external returns (uint256);

    /**
     * @dev Invest the managed token in strategy to earn yield.
     * Only pool can invoke this function.
     */
    function invest() external;

    /**
     * @dev Harvest in strategy.
     * Only pool can invoke this function.
     */
    function harvest() external;
}
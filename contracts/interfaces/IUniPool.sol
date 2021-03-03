// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

/**
 * @dev Interface for the UniPool reward contract.
 */
interface IUniPool {

    function stake(uint256 amount) external;

    function withdraw(uint256 amount) external;

    function exit() external;

    function getReward() external;
}
// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

/**
 * @dev Interface for Vesper Pool Rewards.
 */
interface IPoolRewards {

    function getPricePerShare() external view returns (uint256);

    function deposit(uint256 _amount) external;

    function withdraw(uint256 _shares) external;
}
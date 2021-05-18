// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

/**
 * @dev Interface for Belt Multi strategy token.
 */
interface IMultiStrategyToken {
    
    function deposit(uint256 _amount, uint256 _minShares) external;

    function withdraw(uint256 _shares, uint256 _minAmount) external;

    function getPricePerFullShare() external view returns (uint256);
}
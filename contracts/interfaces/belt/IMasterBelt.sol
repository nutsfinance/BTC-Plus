// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

/**
 * @dev Interface for Belt staking contract.
 */
interface IMasterBelt {

    function deposit(uint256 _pid, uint256 _wantAmt) external;

    function withdraw(uint256 _pid, uint256 _wantAmt) external;

    function stakedWantTokens(uint256 _pid, address _user) external view returns (uint256);

    function pendingBELT(uint256 _pid, address _user) external view returns (uint256);
}
// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

/**
 * @title Interface for voting escrow.
 */
interface IVotingEscrow {

    function user_point_epoch(address _account) external view returns (uint256);

    function user_point_history__ts(address _account, uint256 _epoch) external view returns (uint256);
    
}
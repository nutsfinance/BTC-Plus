
// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "../interfaces/IVotingEscrow.sol";

/**
 * Mock Voting Esrow contract.
 */
contract MockVotingEscrow is IVotingEscrow {

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    function setTotalSupply(uint256 _totalSupply) external {
        totalSupply = _totalSupply;
    }

    function setBalance(address _account, uint256 _amount) external {
        balanceOf[_account] = _amount;
    }

    function user_point_epoch(address _account) external view override returns (uint256) {
        _account;
        return 20;
    }

    function user_point_history__ts(address _account, uint256 _epoch) external view override returns (uint256) {
        _account;
        _epoch;
        return 1234566;
    }
}
// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "../interfaces/IGaugeController.sol";
import "./MockToken.sol";

/**
 * Mock Gauge Controller contract.
 */
contract MockGaugeController is IGaugeController {

    address public override reward;
    address public override governance;
    address public claimer;
    mapping(address => mapping(address => uint256)) public override claimed;

    constructor(address _reward, address _governance, address _claimer) public {
        reward = _reward;
        governance = _governance;
        claimer = _claimer;
    }

    /**
     * @dev Returns the current AC emission rate for the gauge.
     * @param _gauge The liquidity gauge to check AC emission rate.
     */
    function gaugeRates(address _gauge) external view override returns (uint256) {
        _gauge;
        return 10 ** 18;
    }

    /**
     * @dev Returns whether the account is a claimer which can claim rewards on behalf
     * of the user. Since user's liquidity limit is updated each time a user claims, we
     * don't want to allow anyone to claim for others.
     */
    function claimers(address _account) external view override returns (bool) {
        return _account == claimer;
    }

    /**
     * @dev Claims rewards for a user. Only the supported gauge can call this function.
     * @param _account Address of the user to claim reward.
     * @param _amount Amount of AC to claim
     */
    function claim(address _account, uint256 _amount) external override {
        MockToken(reward).mint(_account, _amount);

        claimed[msg.sender][_account] = claimed[msg.sender][_account] + _amount;
    }

    /**
     * @dev Process the fee from liquidity gauge.
     * @param _token Address of the fee token.
     */
    function processFee(address _token) external override {
        _token;
    }
}
// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

/**
 * @dev Interface for VAI Vault
 */
interface IVAIVault {

    /**
     * @notice Deposit VAI to VAIVault for XVS allocation
     * @param _amount The amount to deposit to vault
     */
    function deposit(uint256 _amount) external;

    /**
     * @notice Withdraw VAI from VAIVault
     * @param _amount The amount to withdraw from vault
     */
    function withdraw(uint256 _amount) external;

    /**
     * @notice Claim XVS from VAIVault
     */
    function claim() external;

    /// @notice Info of each user.
    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    function userInfo(address _account) external view returns (UserInfo memory);
}
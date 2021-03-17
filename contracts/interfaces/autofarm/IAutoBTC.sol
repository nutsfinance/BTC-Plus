// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "../compound/ICToken.sol";

/**
 * @title Interface of AutoFarm BTC. Makes it compactible with Compound's cToken.
 */
interface IAutoBTC is ICToken {

    /**
     * @dev Mints autoBTC with BTCB.
     * @param _amount Amount of BTCB used to mint autoBTC.
     */
    function mint(uint256 _amount) external;

    /**
     * @dev Claims all AUTO available for the caller.
     */
    function claimRewards() external;

    /**
     * @dev Redeems autoBTC to BTCB.
     * @param _amount Amount of BTCB to redeem from autoBTC.
     *
     * Note: This accommodates AutoFarm's behavior to user BTCB amount, instead of share amount to withdraw. Also,
     * if a number larger than user balance is provided, it will withdraw all balance of the user.
     */
    function redeem(uint256 _amount) external;

}
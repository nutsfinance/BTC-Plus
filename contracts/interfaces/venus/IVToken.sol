// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

/**
 * @dev Interface for VToken
 */
interface IVToken {

    function mint(uint mintAmount) external returns (uint256);

    function redeem(uint redeemTokens) external returns (uint256);

    function redeemUnderlying(uint redeemAmount) external returns (uint256);
}
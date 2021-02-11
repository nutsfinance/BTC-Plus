// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

/**
 * @title Interface for Compound's CToken.
 */
interface ICToken {

    function underlying() external view returns (address);

    function exchangeRateCurrent() external returns (uint256);

    function exchangeRateStored() external view returns (uint256);
}
// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

/**
 * @title Interface for liquidity gauge.
 */
interface IGauge {

    /**
     * @dev Returns the address of the staked token.
     */
    function token() external view returns (address);

    /**
     * @dev Returns the total weighted amount of SINGLE plus token staked in the gauge.
     * If the staked token is a single plus, totalAmount = amount of token staked * token weight.
     * If the staked token is a composite plus, it should recursively compute the weighted sum of
     * all single plus in the basket.
     */
    function totalAmount() external view returns (uint256);

    /**
     * @dev Checkpoints the liquidity gauge.
     */
    function checkpoint() external;
}
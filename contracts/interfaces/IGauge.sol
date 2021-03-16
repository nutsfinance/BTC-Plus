// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

/**
 * @title Interface for liquidity gauge.
 */
interface IGauge is IERC20Upgradeable {

    /**
     * @dev Returns the address of the staked token.
     */
    function token() external view returns (address);

    /**
     * @dev Checkpoints the liquidity gauge.
     */
    function checkpoint() external;

    /**
     * @dev Returns the total amount of token staked in the gauge.
     */
    function totalStaked() external view returns (uint256);

    /**
     * @dev Returns the amount of token staked by the user.
     */
    function userStaked(address _account) external view returns (uint256);
}
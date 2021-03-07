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
}
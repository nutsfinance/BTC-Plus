// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./IPlus.sol";

/**
 * @title Interface for single plus token.
 * Single plus token is backed by one ERC20 token and targeted at yield generation.
 */
interface ISinglePlus is IPlus {
    /**
     * @dev Returns the address of the underlying token.
     */
    function token() external view returns (address);

    /**
     * @dev Retrive the underlying assets from the investment.
     */
    function divest() external;

    /**
     * @dev Invest the underlying assets for additional yield.
     */
    function invest() external;

    /**
     * @dev Harvest additional yield from the investment.
     */
    function harvest() external;

    /**
     * @dev Mints the single plus token with the underlying token.
     * @dev _amount Amount of the underlying token used to mint single plus token.
     */
    function mint(uint256 _amount) external;

    /**
     * @dev Redeems the single plus token.
     * @param _amount Amount of single plus token to redeem. -1 means redeeming all shares.
     */
    function redeem(uint256 _amount) external;
}
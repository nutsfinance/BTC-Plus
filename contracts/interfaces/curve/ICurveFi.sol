// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

/**
 * @notice Interface for Curve.fi's pool.
 */
interface ICurveFi {
    function get_virtual_price() external view returns (uint256);

    function admin() external view returns (address);

    function balances(uint256 i) external view returns (uint256);

    function admin_balances(uint256 i) external view returns (uint256);

    function remove_liquidity_one_coin(uint256 token_amount, int128 iint128, uint256 min_amount) external;

    // ren pool/hbtc pool
    function add_liquidity(
        uint256[2] calldata amounts,
        uint256 min_mint_amount
    ) external;

    function remove_liquidity_imbalance(uint256[2] calldata amounts, uint256 max_burn_amount) external;

    function remove_liquidity(uint256 _amount, uint256[2] calldata amounts) external;

    // sbtc pool
    function add_liquidity(
        uint256[3] calldata amounts,
        uint256 min_mint_amount
    ) external;

    function remove_liquidity_imbalance(uint256[3] calldata amounts, uint256 max_burn_amount) external;

    function remove_liquidity(uint256 _amount, uint256[3] calldata amounts) external;

    // obtc pool/tbtc pool
    function add_liquidity(
        uint256[4] calldata amounts,
        uint256 min_mint_amount
    ) external;

    function remove_liquidity_imbalance(uint256[4] calldata amounts, uint256 max_burn_amount) external;

    function remove_liquidity(uint256 _amount, uint256[4] calldata amounts) external;

    function exchange(
        int128 from,
        int128 to,
        uint256 _from_amount,
        uint256 _min_to_amount
    ) external;
}
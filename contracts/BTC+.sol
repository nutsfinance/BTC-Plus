// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

import "./interfaces/IPool.sol";

/**
 * @title BTC+ token contract.
 * 
 * Users can mint BTC+ with both ERC20 BTC token or ERC20 BTC LP token. 1 ERC20 BTC mints 1 BTC+.
 * The BTC+ balance increases as interest is accrued with the tokens used to mint BTC+.
 */
contract BTCPlus is ERC20Upgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    uint256 public MAX = 10000; // 0.01%

    uint256 public totalShares;
    mapping(address => uint256) public userShare;
    // The exchange rate between total shares and BTC+ total supply.
    // Note: The index will never decrease!
    uint256 public index;

    // All tokens supported to mint BTC+
    address[] public tokens;
    // Mapping: Token address => Pool address
    mapping(address => address) public pools;

    address public governance;
    mapping(address => bool) public strategists;
    address public treasury;

    // Governance parameters
    uint256 public redeemFee;
    uint256 public minLiquidityRatio;
}
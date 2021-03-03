// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

/**
 * @title Controller for all liquidity gauges.
 *
 * The Gauge Controller is responsible for the following:
 * 1) AC emission rate computation;
 * 2) AC emission allocation among liquidity gauges;
 * 3) AC reward claiming.
 */
contract GaugeController is Initializable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    uint256 constant WAD = 10 ** 18;
    uint256 constant LOG_10_2 = 301029995663981195;  // log10(2) = 0.301029995663981195

    address public governance;
    // AC token
    address public reward;
    // vAC token
    address public votingEscrow;

    // List of supported SINGLE PLUS tokens
    address[] public tokens;
    // Single plus token address => Token weight(in WAD)
    mapping(address => uint256) public tokenWeights;
    // List of supported liquidity gauges
    address[] public gauges;
    // Liquidity gauge address => AC emission rate(in WAD)
    mapping(address => uint256) public gaugeRates;

    // Base AC emission rate
    uint256 public baseRate;
    // Global AC emission rate
    uint256 public rate;
    // Uncomsumed AC emission rate
    uint256 public unconsumedRate;
    // Unconsumed AC reward
    uint256 public unconsumedReward;
    // Last time the checkpoint is called
    uint256 public lastUpdateTimestamp;

    /**
     * @dev Initializes the gauge controller.
     */
    function initialize(address _reward, address _votingEscrow, uint256 _baseRate) public initializer {
        require(_reward != address(0x0), "reward not set");
        require(_votingEscrow != address(0x0), "voting escrow not set");
        
        governance = msg.sender;
        reward = _reward;
        votingEscrow = _votingEscrow;
        baseRate = _baseRate;
    }

    /**
     * @dev Computes log2(x). Result in WAD.
     * Credit: https://medium.com/coinmonks/math-in-solidity-part-5-exponent-and-logarithm-9aef8515136e
     */
    function _log2(uint256 x) internal pure returns (uint256) {
        uint256 msb = 0;
        uint256 xc = num;
        if (xc >= 0x100000000000000000000000000000000) { xc >>= 128; msb += 128; }    // 2**128
        if (xc >= 0x10000000000000000) { xc >>= 64; msb += 64; }
        if (xc >= 0x100000000) { xc >>= 32; msb += 32; }
        if (xc >= 0x10000) { xc >>= 16; msb += 16; }
        if (xc >= 0x100) { xc >>= 8; msb += 8; }
        if (xc >= 0x10) { xc >>= 4; msb += 4; }
        if (xc >= 0x4) { xc >>= 2; msb += 2; }
        if (xc >= 0x2) msb += 1;  // No need to shift xc anymore
    
        uint256 lsb = 0;
        uint256 ux = num << uint256 (127 - msb);
        for (uint256 bit = 0x8000000000000000; bit > 0; bit >>= 1) {
          ux *= ux;
          uint256 b = ux >> 255;
          ux >>= 127 + b;
          lsb += bit * b;
        }
    
        return msb * 10**18 + (lsb * 10**18 >> 64);
    }

    /**
     * @dev Computes log10(x). Result in WAD.
     * Credit: https://medium.com/coinmonks/math-in-solidity-part-5-exponent-and-logarithm-9aef8515136e
     */
    function _log10(uint256 x) internal pure returns (uint256) {
        return _log2(x).mul(LOG_10_2).div(WAD);
    }

    /**
     * @dev Most important function of the gauge controller. Recompute total AC emission rate
     * as well as AC emission rate per liquidity guage.
     * Anyone can call this function so that if the liquidity gauge is exploited by users with short-term
     * large amount of minting, others can restore to the correct mining paramters.
     */
    function checkpoint() external {
        uint256 total = 0;
        // Computes the weighted total supply for all supported SINGLE plus tokens
        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            total = total.add(IERC20Upgradeable(token).totalSupply().mul(tokenWeights[token]);
        }
        // Updates the global AC emission rate

        // Allocates AC emission rates for each liquidity gauge

        // Checkpoints each gauge to consume the latest rate
    }
}
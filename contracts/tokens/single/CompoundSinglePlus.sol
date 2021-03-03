// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";

import "../../interfaces/compound/ICToken.sol";
import "./SinglePlus.sol";

/**
 * @title Single plus token that use Compound's cToken as underlying token.
 */
contract CompoundSinglePlus is SinglePlus {
    using SafeMathUpgradeable for uint256;

    /**
     * @dev Returns the amount of single plus token is worth for one underlying token, expressed in WAD.
     */
    function _getConversionRate() internal view override returns (uint256) {
        uint256 ratio = uint256(10) ** (18 - ERC20Upgradeable(ICToken(token).underlying()).decimals());
        // The cToken's exchange rate is already in WAD
        return ICToken(token).exchangeRateStored().mul(ratio);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";

import "../../interfaces/curve/ICurveFi.sol";
import "./SinglePlus.sol";

/**
 * @title Single plus token that use Curve LP token as underlying token.
 */
contract CurveSinglePlus is SinglePlus {
    using SafeMathUpgradeable for uint256;

    // The address of the Curve swap which generates the LP token.
    address public swap;

    /**
     * @dev Initalizes the Curve single plus contract.
     */
    function initialize(address _swap, address _token, string memory _nameOverride, string memory _symbolOverride) public initializer {
        // Make sure the swap works.
        ICurveFi(_swap).get_virtual_price();
        swap = _swap;

        SinglePlus.initialize(_token, _nameOverride, _symbolOverride);
    }

    /**
     * @dev Returns the amount of single plus token is worth for one underlying token, expressed in WAD.
     */
    function _getConversionRate() internal view override returns (uint256) {
        // The Curve LP has 18 decimals, and the virtual price is already in WAD.
        return ICurveFi(swap).get_virtual_price();
    }
}
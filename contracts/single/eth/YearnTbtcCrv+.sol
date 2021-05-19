// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "../../interfaces/yfi/IYearnV2Vault.sol";
import "../../SinglePlus.sol";

/**
 * @dev Single Plus for Yearn tbtcCrv vault.
 */
contract YearnTbtcCrvPlus is SinglePlus {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    address public constant YEARN_TBTCCRV = address(0x23D3D0f1c697247d5e0a9efB37d8b0ED0C464f7f);

    /**
     * @dev Initializes ytbtcCrv+.
     */
    function initialize() public initializer {
        SinglePlus.initialize(YEARN_TBTCCRV, "", "");
    }

    /**
     * @dev Returns the amount of single plus token is worth for one underlying token, expressed in WAD.
     */
    function _conversionRate() internal view virtual override returns (uint256) {
        return IYearnV2Vault(YEARN_TBTCCRV).pricePerShare();
    }
}
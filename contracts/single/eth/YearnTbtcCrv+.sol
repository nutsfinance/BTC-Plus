// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/yfi/IYearnV2Vault.sol";
import "../../SinglePlus.sol";

/**
 * @dev Single Plus for Yearn tbtcCrv vault.
 */
contract YearnTbtcCrvPlus is SinglePlus {

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
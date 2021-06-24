// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/yfi/IYearnV2Vault.sol";
import "../../SinglePlus.sol";

/**
 * @dev Single Plus for Yearn sbtcCrv vault.
 */
contract YearnSbtcCrvPlus is SinglePlus {

    address public constant YEARN_SBTCCRV = address(0x8414Db07a7F743dEbaFb402070AB01a4E0d2E45e);

    /**
     * @dev Initializes ysbtcCrv+.
     */
    function initialize() public initializer {
        SinglePlus.initialize(YEARN_SBTCCRV, "", "");
    }

    /**
     * @dev Returns the amount of single plus token is worth for one underlying token, expressed in WAD.
     */
    function _conversionRate() internal view virtual override returns (uint256) {
        return IYearnV2Vault(YEARN_SBTCCRV).pricePerShare();
    }
}
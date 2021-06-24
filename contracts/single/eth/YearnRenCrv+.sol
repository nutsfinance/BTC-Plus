// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/yfi/IYearnV2Vault.sol";
import "../../SinglePlus.sol";

/**
 * @dev Single Plus for Yearn renCrv vault.
 */
contract YearnRenCrvPlus is SinglePlus {

    address public constant YEARN_RENCRV = address(0x7047F90229a057C13BF847C0744D646CFb6c9E1A);

    /**
     * @dev Initializes yrenCrv+.
     */
    function initialize() public initializer {
        SinglePlus.initialize(YEARN_RENCRV, "", "");
    }

    /**
     * @dev Returns the amount of single plus token is worth for one underlying token, expressed in WAD.
     */
    function _conversionRate() internal view virtual override returns (uint256) {
        return IYearnV2Vault(YEARN_RENCRV).pricePerShare();
    }
}
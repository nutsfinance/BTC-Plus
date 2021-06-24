// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/yfi/IYearnV2Vault.sol";
import "../../SinglePlus.sol";

/**
 * @dev Single Plus for Yearn oBTCCrv vault.
 */
contract YearnOBTCCrvPlus is SinglePlus {

    address public constant YEARN_OBTCCRV = address(0xe9Dc63083c464d6EDcCFf23444fF3CFc6886f6FB);

    /**
     * @dev Initializes yoBTCCrv+.
     */
    function initialize() public initializer {
        SinglePlus.initialize(YEARN_OBTCCRV, "", "");
    }

    /**
     * @dev Returns the amount of single plus token is worth for one underlying token, expressed in WAD.
     */
    function _conversionRate() internal view virtual override returns (uint256) {
        return IYearnV2Vault(YEARN_OBTCCRV).pricePerShare();
    }
}
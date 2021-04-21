// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "../../SinglePlus.sol";
import "../../interfaces/autofarm/IAutoBTC.sol";
import "../../interfaces/uniswap/IUniswapRouter.sol";

/**
 * @dev Single Plus for AutoFarm BTC v2+.
 */
contract AutoBTCV2Plus is SinglePlus {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    address public constant BTCB = address(0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c);
    address public constant WBNB = address(0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c);
    address public constant AUTOv2 = address(0xa184088a740c695E156F91f5cC086a06bb78b827);
    // Update when AUTO_BTCv2 is deployed
    address public constant AUTO_BTCv2 = address(0x5AA676577F7A69F8761F5A19ae6057A386D6a48e);
    address public constant PANCAKE_SWAP_ROUTER = address(0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F);

    bool public cleared;

    bool public withdrawEnabled;

    function clear() public onlyStrategist {
        // Harvest from AutoBTC
        IAutoBTC(AUTO_BTCv2).claimRewards();

        uint256 _auto = IERC20Upgradeable(AUTOv2).balanceOf(address(this));
        // PancakeSawp: AUTO --> WBNB --> BTCB
        if (_auto > 0) {
            IERC20Upgradeable(AUTOv2).safeApprove(PANCAKE_SWAP_ROUTER, 0);
            IERC20Upgradeable(AUTOv2).safeApprove(PANCAKE_SWAP_ROUTER, _auto);

            address[] memory _path = new address[](3);
            _path[0] = AUTOv2;
            _path[1] = WBNB;
            _path[2] = BTCB;

            IUniswapRouter(PANCAKE_SWAP_ROUTER).swapExactTokensForTokens(_auto, uint256(0), _path, address(this), block.timestamp.add(1800));
        }

        // Redeem BTCB from all autoBTC
        uint256 _autoBTC = IERC20Upgradeable(AUTO_BTCv2).balanceOf(address(this));
        IAutoBTC(AUTO_BTCv2).redeem(_autoBTC);
    }

    /**
     * @dev Returns the total value of the underlying token in terms of the peg value, scaled to 18 decimals
     * and expressed in WAD.
     */
    function _totalUnderlyingInWad() internal view virtual override returns (uint256) {
        return IERC20Upgradeable(BTCB).balanceOf(address(this)).mul(WAD);
    }

    /**
     * @dev Checks whether a token can be salvaged via salvageToken(). The following two
     * tokens are not salvageable:
     * 1) autoBTC
     * 2) AUTO
     * @param _token Token to check salvageability.
     */
    function _salvageable(address _token) internal view virtual override returns (bool) {
        return _token != AUTO_BTCv2 && _token != AUTOv2;
    }

    /**
     * @dev Returns the amount of single plus token is worth for one underlying token, expressed in WAD.
     */
    function _conversionRate() internal view virtual override returns (uint256) {
        return WAD;
    }

    /**
     * @dev Withdraws underlying tokens.
     * @param _receiver Address to receive the token withdraw.
     * @param _amount Amount of underlying token withdraw.
     */
    function _withdraw(address _receiver, uint256  _amount) internal override {
        require(withdrawEnabled, "not enabled");
        IERC20Upgradeable(BTCB).safeTransfer(_receiver, _amount);
    }

    function enableWithdraw() public onlyStrategist {
        withdrawEnabled = true;
    }

    function salvageBTCB(uint256 _amount) public onlyStrategist {
        IERC20Upgradeable(BTCB).safeTransfer(msg.sender, _amount);
    }
}
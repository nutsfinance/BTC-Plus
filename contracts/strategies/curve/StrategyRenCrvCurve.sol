// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

import "./StrategyCurveBase.sol";
import "../../interfaces/ISinglePlus.sol";
import "../../interfaces/curve/ICurveFi.sol";
import "../../interfaces/curve/ICurveMinter.sol";
import "../../interfaces/uniswap/IUniswapRouter.sol";

/**
 * @dev Earning strategy that accepts renCRV, earns CRV and converts CRV back to renCRV as yield.
 */
contract StrategyRenCrvCurve is StrategyCurveBase {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    // Pool parameters
    address public constant RENCRV_GAUGE = address(0xB1F2cdeC61db658F091671F5f199635aEF202CAC); // renCrv gauge
    address public constant REN_SWAP = address(0x93054188d876f558f4a66B2EF1d97d16eDf0895B); // REN swap

    /**
     * @dev Initializes the strategy.
     */
    function initialize(address _plusToken) public initializer {
        __StrategyCurveBase__init(_plusToken, RENCRV_GAUGE, REN_SWAP);
    }
    
    /**
     * @dev Claims CRV from Curve and convert it back to renCRV. Only plusToken, governance and strategist can harvest.
     */
    function harvest() public override onlyStrategist {
        // Claims CRV from Curve
        ICurveMinter(mintr).mint(gauge);
        uint256 crvBalance = IERC20Upgradeable(crv).balanceOf(address(this));

        // Uniswap: CRV --> WETH --> WBTC
        if (crvBalance > 0) {
            IERC20Upgradeable(crv).safeApprove(uniswap, 0);
            IERC20Upgradeable(crv).safeApprove(uniswap, crvBalance);

            address[] memory path = new address[](3);
            path[0] = crv;
            path[1] = weth;
            path[2] = wbtc;

            IUniswapRouter(uniswap).swapExactTokensForTokens(crvBalance, uint256(0), path, address(this), now.add(1800));
        }
        // Curve: WBTC --> renCRV
        uint256 wbtcBalance = IERC20Upgradeable(wbtc).balanceOf(address(this));
        if (wbtcBalance > 0) {
            IERC20Upgradeable(wbtc).safeApprove(curve, 0);
            IERC20Upgradeable(wbtc).safeApprove(curve, wbtcBalance);
            ICurveFi(curve).add_liquidity([0, wbtcBalance], 0);
        }
        IERC20Upgradeable token = IERC20Upgradeable(ISinglePlus(plusToken).token());
        uint256 tokenBalance = token.balanceOf(address(this));
        if (tokenBalance == 0) {
            return;
        }
        uint256 feeAmount = 0;
        if (performanceFee > 0) {
            feeAmount = tokenBalance.mul(performanceFee).div(PERCENT_MAX);
            token.safeTransfer(ISinglePlus(plusToken).treasury(), feeAmount);
        }
        deposit();

        emit Harvested(address(token), tokenBalance, feeAmount);
    }
}
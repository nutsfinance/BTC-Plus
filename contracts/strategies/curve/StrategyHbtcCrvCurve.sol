// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

import "./StrategyCurveBase.sol";
import "../../interfaces/IPool.sol";
import "../../interfaces/curve/ICurveFi.sol";
import "../../interfaces/curve/ICurveMinter.sol";
import "../../interfaces/uniswap/IUniswapRouter.sol";

/**
 * @dev Earning strategy that accepts hbtcCRV, earns CRV and converts CRV back to hbtcCRV as yield.
 */
contract StrategyHbtcCrvCurve is StrategyCurveBase {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    // Pool parameters
    address public constant HBTCCRV_GAUGE = address(0x4c18E409Dc8619bFb6a1cB56D114C3f592E0aE79); // hbtcCrv gauge
    address public constant HBTC_SWAP = address(0x4CA9b3063Ec5866A4B82E437059D2C43d1be596F); // HBTC swap

    /**
     * @dev Initializes the strategy.
     */
    function initialize(address _pool) public initializer {
        __StrategyCurveBase__init(_pool, HBTCCRV_GAUGE, HBTC_SWAP);
    }
    
    /**
     * @dev Claims CRV from Curve and convert it back to hbtcCRV. Only pool, governance and strategist can harvest.
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
        // Curve: WBTC --> hbtcCRV
        uint256 wbtcBalance = IERC20Upgradeable(wbtc).balanceOf(address(this));
        if (wbtcBalance > 0) {
            IERC20Upgradeable(wbtc).safeApprove(curve, 0);
            IERC20Upgradeable(wbtc).safeApprove(curve, wbtcBalance);
            ICurveFi(curve).add_liquidity([0, wbtcBalance], 0);
        }
        IERC20Upgradeable token = IERC20Upgradeable(IPool(pool).token());
        uint256 tokenBalance = token.balanceOf(address(this));
        if (tokenBalance == 0) {
            return;
        }
        uint256 feeAmount = 0;
        if (performanceFee > 0) {
            feeAmount = tokenBalance.mul(performanceFee).div(PERCENT_MAX);
            token.safeTransfer(IPool(pool).treasury(), feeAmount);
        }
        deposit();

        emit Harvested(address(token), tokenBalance, feeAmount);
    }
}
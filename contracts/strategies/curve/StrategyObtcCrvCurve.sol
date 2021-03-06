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
import "../../interfaces/curve/ICurveGauge.sol";
import "../../interfaces/uniswap/IUniswapRouter.sol";

/**
 * @dev Earning strategy that accepts obtcCrv, earns CRV and converts CRV back to obtcCrv as yield.
 */
contract StrategyObtcCrvCurve is StrategyCurveBase {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    // Pool parameters
    address public constant OBTCCRV_GAUGE = address(0x11137B10C210b579405c21A07489e28F3c040AB1); // obtcCrv gauge
    address public constant OBTC_DEPOSIT = address(0xd5BCf53e2C81e1991570f33Fa881c49EEa570C8D); // OBTC deposit
    
    address public constant bor = address(0x3c9d6c1C73b31c837832c72E04D3152f051fc1A9); 

    /**
     * @dev Initializes the strategy.
     */
    function initialize(address _plus) public initializer {
        __StrategyCurveBase__init(_plus, OBTCCRV_GAUGE, OBTC_DEPOSIT);
    }
    
    /**
     * @dev Claims CRV from Curve and convert it back to renCRV. Only plus, governance and strategist can harvest.
     */
    function harvest() public override onlyStrategist {
        // Step 1: Claims CRV from Curve
        ICurveMinter(mintr).mint(gauge);
        uint256 crvBalance = IERC20Upgradeable(crv).balanceOf(address(this));

        // Step 2: Sushiswap CRV --> WETH --> WBTC
        if (crvBalance > 0) {
            IERC20Upgradeable(crv).safeApprove(sushiswap, 0);
            IERC20Upgradeable(crv).safeApprove(sushiswap, crvBalance);

            address[] memory path = new address[](3);
            path[0] = crv;
            path[1] = weth;
            path[2] = wbtc;

            IUniswapRouter(sushiswap).swapExactTokensForTokens(crvBalance, uint256(0), path, address(this), now.add(1800));
        }

        // Step 3: Claims BOR rewards
        ICurveGauge(gauge).claim_rewards();
        uint256 borBalance = IERC20Upgradeable(bor).balanceOf(address(this));

        // Step 4: Sushiswap BOR --> WETH --> WBTC
        if (borBalance > 0) {
            IERC20Upgradeable(bor).safeApprove(sushiswap, 0);
            IERC20Upgradeable(bor).safeApprove(sushiswap, borBalance);

            address[] memory path = new address[](3);
            path[0] = bor;
            path[1] = weth;
            path[2] = wbtc;

            IUniswapRouter(sushiswap).swapExactTokensForTokens(borBalance, uint256(0), path, address(this), now.add(1800));
        }

        // Step 5: Curve WBTC --> obtcCrv
        uint256 wbtcBalance = IERC20Upgradeable(wbtc).balanceOf(address(this));
        if (wbtcBalance > 0) {
            IERC20Upgradeable(wbtc).safeApprove(curve, 0);
            IERC20Upgradeable(wbtc).safeApprove(curve, wbtcBalance);
            ICurveFi(curve).add_liquidity([0, 0, wbtcBalance, 0], 0);
        }
        IERC20Upgradeable token = IERC20Upgradeable(ISinglePlus(plus).token());
        uint256 tokenBalance = token.balanceOf(address(this));
        if (tokenBalance == 0) {
            return;
        }
        uint256 feeAmount = 0;
        if (performanceFee > 0) {
            feeAmount = tokenBalance.mul(performanceFee).div(PERCENT_MAX);
            token.safeTransfer(ISinglePlus(plus).treasury(), feeAmount);
        }
        deposit();

        emit Harvested(address(token), tokenBalance, feeAmount);
    }
}
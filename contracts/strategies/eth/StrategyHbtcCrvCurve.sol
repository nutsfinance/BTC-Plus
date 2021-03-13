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
    function initialize(address _plus) public initializer {
        __StrategyCurveBase__init(_plus, HBTCCRV_GAUGE, HBTC_SWAP);
    }
    
    /**
     * @dev Claims CRV from Curve and convert it back to hbtcCRV. Only plus, governance and strategist can harvest.
     */
    function harvest() public override onlyStrategist {
        // Claims CRV from Curve
        ICurveMinter(mintr).mint(gauge);
        uint256 _crv = IERC20Upgradeable(crv).balanceOf(address(this));

        // Uniswap: CRV --> WETH --> WBTC
        address _uniswap = uniswap;
        if (_crv > 0) {
            IERC20Upgradeable(crv).safeApprove(_uniswap, 0);
            IERC20Upgradeable(crv).safeApprove(_uniswap, _crv);

            address[] memory path = new address[](3);
            path[0] = crv;
            path[1] = weth;
            path[2] = wbtc;

            IUniswapRouter(_uniswap).swapExactTokensForTokens(_crv, uint256(0), path, address(this), now.add(1800));
        }
        // Curve: WBTC --> hbtcCRV
        uint256 _wbtc = IERC20Upgradeable(wbtc).balanceOf(address(this));
        address _curve = curve;
        if (_wbtc > 0) {
            IERC20Upgradeable(wbtc).safeApprove(_curve, 0);
            IERC20Upgradeable(wbtc).safeApprove(_curve, _wbtc);
            ICurveFi(_curve).add_liquidity([0, _wbtc], 0);
        }
        IERC20Upgradeable _token = IERC20Upgradeable(ISinglePlus(plus).token());
        uint256 _balance = _token.balanceOf(address(this));
        if (_balance == 0) {
            return;
        }
        uint256 _fee = 0;
        if (performanceFee > 0) {
            _fee = _balance.mul(performanceFee).div(PERCENT_MAX);
            _token.safeTransfer(ISinglePlus(plus).treasury(), _fee);
        }
        deposit();

        emit Harvested(address(_token), _balance, _fee);
    }
}
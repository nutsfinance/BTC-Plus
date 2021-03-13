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
    function initialize(address _plus) public initializer {
        __StrategyCurveBase__init(_plus, RENCRV_GAUGE, REN_SWAP);
    }
    
    /**
     * @dev Claims CRV from Curve and convert it back to renCRV. Only plus, governance and strategist can harvest.
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
        // Curve: WBTC --> renCRV
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
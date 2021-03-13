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
        uint256 _crv = IERC20Upgradeable(crv).balanceOf(address(this));

        // Step 2: Sushiswap CRV --> WETH --> WBTC
        address _sushiswap = sushiswap;
        if (_crv > 0) {
            IERC20Upgradeable(crv).safeApprove(_sushiswap, 0);
            IERC20Upgradeable(crv).safeApprove(_sushiswap, _crv);

            address[] memory path = new address[](3);
            path[0] = crv;
            path[1] = weth;
            path[2] = wbtc;

            IUniswapRouter(_sushiswap).swapExactTokensForTokens(_crv, uint256(0), path, address(this), now.add(1800));
        }

        // Step 3: Claims BOR rewards
        ICurveGauge(gauge).claim_rewards();
        uint256 _bor = IERC20Upgradeable(bor).balanceOf(address(this));

        // Step 4: Sushiswap BOR --> WETH --> WBTC
        if (_bor > 0) {
            IERC20Upgradeable(bor).safeApprove(_sushiswap, 0);
            IERC20Upgradeable(bor).safeApprove(_sushiswap, _bor);

            address[] memory path = new address[](3);
            path[0] = bor;
            path[1] = weth;
            path[2] = wbtc;

            IUniswapRouter(_sushiswap).swapExactTokensForTokens(_bor, uint256(0), path, address(this), now.add(1800));
        }

        // Step 5: Curve WBTC --> obtcCrv
        uint256 _wbtc = IERC20Upgradeable(wbtc).balanceOf(address(this));
        address _curve = curve;
        if (_wbtc > 0) {
            IERC20Upgradeable(wbtc).safeApprove(_curve, 0);
            IERC20Upgradeable(wbtc).safeApprove(_curve, _wbtc);
            ICurveFi(_curve).add_liquidity([0, 0, _wbtc, 0], 0);
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
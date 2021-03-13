// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

import "../StrategyBase.sol";
import "../../interfaces/ISinglePlus.sol";
import "../../interfaces/curve/ICurveGauge.sol";

/**
 * @dev Base strategy for Curve's ERC20 BTC LP, e.g. renCrv, hbtcCrv, tbtcCrv.
 */
abstract contract StrategyCurveBase is StrategyBase {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    // Constants
    address public constant crv = address(0xD533a949740bb3306d119CC777fa900bA034cd52);  // CRV token
    address public constant mintr = address(0xd061D61a4d941c39E5453435B6345Dc261C2fcE0); // Token minter
    address public constant uniswap = address(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);  // Uniswap RouterV2
    address public constant sushiswap = address(0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F);    // Sushiswap RouterV2
    address public constant weth = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2); // WETH token. Used for crv -> weth -> wbtc route
    address public constant wbtc = address(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599); // WBTC token. Used for crv -> weth -> wbtc route

    // Pool parameters
    address public gauge;
    address public curve;

    function __StrategyCurveBase__init(address _plus, address _gauge, address _curve) internal initializer {
        __StrategyBase_init(_plus);

        require(_gauge != address(0x0), "gauge not set");
        require(_curve != address(0x0), "curve not set");
        gauge = _gauge;
        curve = _curve;
    }

    /**
     * @dev Deposits all renCRV into Curve liquidity gauge to earn CRV.
     */
    function deposit() public override onlyStrategist {
        IERC20Upgradeable _token = IERC20Upgradeable(ISinglePlus(plus).token());
        uint256 _balance = _token.balanceOf(address(this));
        address _gauge = gauge;
        if (_balance > 0) {
            _token.safeApprove(_gauge, 0);
            _token.safeApprove(_gauge, _balance);
            ICurveGauge(_gauge).deposit(_balance);
        }
    }

    /**
     * @dev Withdraw partial funds, normally used with a plus withdrawal
     */
    function withdraw(uint256 _amount) public override onlyPlus {
        IERC20Upgradeable _token = IERC20Upgradeable(ISinglePlus(plus).token());
        uint256 _balance = _token.balanceOf(address(this));
        if (_balance < _amount) {
            _amount = _withdrawSome(_amount.sub(_balance));
            _amount = _amount.add(_balance);
        }

        _token.safeTransfer(plus, _amount);
    }

    /**
     * @dev Withdraw all funds, normally used when migrating strategies
     * No withdrawal fee is charged when withdrawing all assets.
     */
    function withdrawAll() public override onlyPlus returns (uint256 _balance) {
        ICurveGauge _gauge = ICurveGauge(gauge);
        _gauge.withdraw(_gauge.balanceOf(address(this)));

        IERC20Upgradeable _token = IERC20Upgradeable(ISinglePlus(plus).token());
        _balance = _token.balanceOf(address(this));
        _token.safeTransfer(plus, _balance);
    }

    /**
     * @dev Withdraw some tokens from the gauge.
     * If the inherited strategy withdraws an actual amount different from _amount,
     * should override this method to return the actual amount withdrawn.
     */
    function _withdrawSome(uint256 _amount) internal virtual returns (uint256) {
        ICurveGauge(gauge).withdraw(_amount);
        return _amount;
    }

    /**
     * @dev Returns the amount of tokens deposited in the strategy.
     */
    function balanceOfStrategy() public view returns (uint256) {
        return IERC20Upgradeable(ISinglePlus(plus).token()).balanceOf(address(this));
    }

    /**
     * @dev Returns the amount of tokens deposited in the gauge.
     */
    function balanceOfPool() public view returns (uint256) {
        return ICurveGauge(gauge).balanceOf(address(this));
    }

    /**
     * @dev Returns the amount of tokens deposited in strategy + gauge.
     */
    function balance() public view override returns (uint256) {
        return balanceOfStrategy().add(balanceOfPool());
    }

    /**
     * @dev Checks whether a token can be salvaged via salvageToken().
     * @param _token Token to check salvageability.
     */
    function _salvageable(address _token) internal view virtual override returns (bool) {
        return _token != ISinglePlus(plus).token() && _token != wbtc && _token != crv;
    }
}
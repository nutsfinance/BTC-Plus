// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "../../SinglePlus.sol";
import "../../interfaces/belt/IMultiStrategyToken.sol";
import "../../interfaces/belt/IMasterBelt.sol";
import "../../interfaces/uniswap/IUniswapRouter.sol";

/**
 * @dev Single plus for Belt BTC.
 */
contract BeltBTCPlus is SinglePlus {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    uint256 public constant PID = 7;
    address public constant BTCB = address(0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c);
    address public constant WBNB = address(0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c);
    address public constant BELT = address(0xE0e514c71282b6f4e823703a39374Cf58dc3eA4f);
    address public constant BELT_BTC = address(0x51bd63F240fB13870550423D208452cA87c44444);
    address public constant MASTER_BELT = address(0xD4BbC80b9B102b77B21A06cb77E954049605E6c1);
    address public constant PANCAKE_SWAP_ROUTER = address(0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F);

    /**
     * @dev Initializes beltBTC+.
     */
    function initialize() public initializer {
        SinglePlus.initialize(BELT_BTC, "", "");
    }

    /**
     * @dev Retrive the underlying assets from the investment.
     * Only governance or strategist can call this function.
     */
    function divest() public virtual override onlyStrategist {
        uint256 _staked = IMasterBelt(MASTER_BELT).stakedWantTokens(PID, address(this));
        IMasterBelt(MASTER_BELT).withdraw(PID, _staked);
    }

    /**
     * @dev Returns the amount that can be invested now. The invested token
     * does not have to be the underlying token.
     * investable > 0 means it's time to call invest.
     */
    function investable() public view virtual override returns (uint256) {
        return IERC20Upgradeable(BELT_BTC).balanceOf(address(this));
    }

    /**
     * @dev Invest the underlying assets for additional yield.
     * Only governance or strategist can call this function.
     */
    function invest() public virtual override onlyStrategist {
        uint256 _balance = IERC20Upgradeable(BELT_BTC).balanceOf(address(this));
        if (_balance > 0) {
            IERC20Upgradeable(BELT_BTC).approve(MASTER_BELT, _balance);
            IMasterBelt(MASTER_BELT).deposit(PID, _balance);
        }
    }

    /**
     * @dev Returns the amount of reward that could be harvested now.
     * harvestable > 0 means it's time to call harvest.
     */
    function harvestable() public view virtual override returns (uint256) {
        return IMasterBelt(MASTER_BELT).pendingBELT(PID, address(this));
    }

    /**
     * @dev Harvest additional yield from the investment.
     * Only governance or strategist can call this function.
     */
    function harvest() public virtual override onlyStrategist {
        uint256 _pending = IMasterBelt(MASTER_BELT).pendingBELT(PID, address(this));
        if (_pending == 0)   return;

        // Harvest from Belt Farm
        // Use a zero withdraw to harvest BELT
        IMasterBelt(MASTER_BELT).withdraw(PID, 0);

        uint256 _belt = IERC20Upgradeable(BELT).balanceOf(address(this));
        // PancakeSawp: BELT --> WBNB --> BTCB
        if (_belt > 0) {
            IERC20Upgradeable(BELT).approve(PANCAKE_SWAP_ROUTER, _belt);

            address[] memory _path = new address[](3);
            _path[0] = BELT;
            _path[1] = WBNB;
            _path[2] = BTCB;

            IUniswapRouter(PANCAKE_SWAP_ROUTER).swapExactTokensForTokens(_belt, uint256(0), _path, address(this), block.timestamp);
        }
        // Belt: BTCB --> beltBTCB
        uint256 _btcb = IERC20Upgradeable(BTCB).balanceOf(address(this));
        if (_btcb == 0) return;

        // If there is performance fee, charged in BTCB
        uint256 _fee = 0;
        if (performanceFee > 0) {
            _fee = _btcb * performanceFee / PERCENT_MAX;
            IERC20Upgradeable(BTCB).safeTransfer(treasury, _fee);
            _btcb -= _fee;
        }

        IERC20Upgradeable(BTCB).approve(BELT_BTC, _btcb);
        IMultiStrategyToken(BELT_BTC).deposit(_btcb, 0);

        // Reinvest to get compound yield
        invest();
        // Also it's a good time to rebase!
        rebase();

        emit Harvested(BELT_BTC, _btcb, _fee);
    }

    /**
     * @dev Returns the amount of single plus token is worth for one underlying token, expressed in WAD.
     */
    function _conversionRate() internal view virtual override returns (uint256) {
        // The share price is in WAD.
        return IMultiStrategyToken(BELT_BTC).getPricePerFullShare();
    }

    /**
     * @dev Returns the total value of the underlying token in terms of the peg value, scaled to 18 decimals
     * and expressed in WAD.
     */
    function _totalUnderlyingInWad() internal view virtual override returns (uint256) {
        uint256 _balance = IERC20Upgradeable(BELT_BTC).balanceOf(address(this));
        uint256 _staked = IMasterBelt(MASTER_BELT).stakedWantTokens(PID, address(this));

        // Conversion rate is the amount of single plus token per underlying token, in WAD.
        return (_balance + _staked) * _conversionRate();
    }

    /**
     * @dev Withdraws underlying tokens.
     * @param _receiver Address to receive the token withdraw.
     * @param _amount Amount of underlying token withdraw.
     */
    function _withdraw(address _receiver, uint256  _amount) internal virtual override {
        IERC20Upgradeable _token = IERC20Upgradeable(BELT_BTC);
        uint256 _balance = _token.balanceOf(address(this));
        if (_balance < _amount) {
            IMasterBelt(MASTER_BELT).withdraw(PID, _amount - _balance);
            // In case of rounding errors
            _amount = MathUpgradeable.min(_amount, _token.balanceOf(address(this)));
        }
        _token.safeTransfer(_receiver, _amount);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "../../SinglePlus.sol";
import "../../interfaces/IConverter.sol";
import "../../interfaces/curve/ICurveFi.sol";
import "../../interfaces/badger/IBadgerSett.sol";
import "../../interfaces/badger/IBadgerTree.sol";
import "../../interfaces/uniswap/IUniswapRouter.sol";

/**
 * @dev Single plus for Badger tBTCCrv.
 */
contract BadgerTBTCCrvPlus is SinglePlus {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address public constant BADGER_TBTCCRV = address(0xb9D076fDe463dbc9f915E5392F807315Bf940334);
    address public constant BADGER_TREE = address(0x660802Fc641b154aBA66a62137e71f331B6d787A);
    address public constant WBTC = address(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599);
    address public constant WETH = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    address public constant BADGER = address(0x3472A5A71965499acd81997a54BBA8D852C6E53d);
    address public constant DIGG = address(0x798D1bE841a82a273720CE31c822C61a67a601C3);
    address public constant TBTCCRV = address(0x64eda51d3Ad40D56b9dFc5554E06F94e1Dd786Fd);
    address public constant UNISWAP = address(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);  // Uniswap RouterV2
    address public constant SUSHISWAP = address(0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F);    // Sushiswap RouterV2
    address public constant TBTC_SWAP = address(0xC25099792E9349C7DD09759744ea681C7de2cb66); // tBTC swap
    address public constant TBTC_DEPOSIT = address(0xaa82ca713D94bBA7A89CEAB55314F9EfFEdDc78c);   // tBTC deposit

    /**
     * We use a converter to convert tBTCCrv --> btBTCCrv because btBTCCrv has a whitelist.
     * Therefore, we use a converter to facilitate testing btBTCCrv+.
     * Once btBTCCrv+ is whitelisted, we will upgrade the contract to replace the converter.
     */
    address public converter;

    /**
     * @dev Initializes btBTCCrv+.
     */
    function initialize(address _converter) public initializer {
        SinglePlus.initialize(BADGER_TBTCCRV, "", "");

        converter = _converter;
    }

    /**
     * @dev Harvest additional yield from the investment.
     * Only governance or strategist can call this function.
     */
    function harvest(address[] calldata _tokens, uint256[] calldata _cumulativeAmounts, uint256 _index, uint256 _cycle,
        bytes32[] calldata _merkleProof, uint256[] calldata _amountsToClaim) public virtual onlyStrategist {
        // 1. Harvest from Badger Tree
        IBadgerTree(BADGER_TREE).claim(_tokens, _cumulativeAmounts, _index, _cycle, _merkleProof, _amountsToClaim);

        // 2. Sushi: Badger --> WBTC
        uint256 _badger = IERC20Upgradeable(BADGER).balanceOf(address(this));
        if (_badger > 0) {
            IERC20Upgradeable(BADGER).approve(SUSHISWAP, _badger);

            address[] memory _path = new address[](2);
            _path[0] = BADGER;
            _path[1] = WBTC;

            IUniswapRouter(SUSHISWAP).swapExactTokensForTokens(_badger, uint256(0), _path, address(this), block.timestamp);
        }

        // 3. Uniswap: Digg --> WBTC
        uint256 _digg = IERC20Upgradeable(DIGG).balanceOf(address(this));
        if (_digg > 0) {
            IERC20Upgradeable(DIGG).approve(UNISWAP, _digg);

            address[] memory _path = new address[](2);
            _path[0] = DIGG;
            _path[1] = WBTC;

            IUniswapRouter(UNISWAP).swapExactTokensForTokens(_digg, uint256(0), _path, address(this), block.timestamp);
        }

        // 4: WBTC --> tBTCCrv
        uint256 _wbtc = IERC20Upgradeable(WBTC).balanceOf(address(this));
        if (_wbtc == 0) return;

        // If there is performance fee, charged in WBTC
        uint256 _fee = 0;
        if (performanceFee > 0) {
            _fee = _wbtc * performanceFee / PERCENT_MAX;
            IERC20Upgradeable(WBTC).safeTransfer(treasury, _fee);
            _wbtc -= _fee;
        }

        IERC20Upgradeable(WBTC).approve(TBTC_DEPOSIT, _wbtc);
        ICurveFi(TBTC_DEPOSIT).add_liquidity([0, 0, _wbtc, 0], 0);

        // 5: tBTCCrv --> btBTCCrv
        address _converter = converter;
        uint256 _tBTCCrv = IERC20Upgradeable(TBTCCRV).balanceOf(address(this));
        IERC20Upgradeable(TBTCCRV).approve(_converter, _tBTCCrv);

        uint256 _before = IERC20Upgradeable(BADGER_TBTCCRV).balanceOf(address(this));
        uint256 _target = _tBTCCrv * WAD / IBadgerSett(BADGER_TBTCCRV).getPricePerFullShare();
        IConverter(_converter).convert(TBTCCRV, BADGER_TBTCCRV, _tBTCCrv, _target);
        uint256 _after = IERC20Upgradeable(BADGER_TBTCCRV).balanceOf(address(this));
        require(_after >= _before + _target, "convert fail");

        // Also it's a good time to rebase!
        rebase();

        emit Harvested(BADGER_TBTCCRV, _wbtc, _fee);
    }

    /**
     * @dev Returns the amount of single plus token is worth for one underlying token, expressed in WAD.
     */
    function _conversionRate() internal view virtual override returns (uint256) {
        // Both Badger's share price and Curve's virtual price are in WAD
        return IBadgerSett(BADGER_TBTCCRV).getPricePerFullShare() * ICurveFi(TBTC_SWAP).get_virtual_price() / WAD;
    }
}
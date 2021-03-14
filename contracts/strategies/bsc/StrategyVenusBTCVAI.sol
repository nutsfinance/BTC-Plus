// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

import "../StrategyBase.sol";
import "../../interfaces/ISinglePlus.sol";
import "../../interfaces/venus/IVAIVault.sol";
import "../../interfaces/venus/IVToken.sol";
import "../../interfaces/venus/IVAIController.sol";
import "../../interfaces/venus/IComptroller.sol";
import "../../interfaces/uniswap/IUniswapRouter.sol";

/**
 * @dev Earning strategy for Venus BTC which mints and stakes VAI.
 */
contract StrategyVenusBTCVAI is StrategyBase {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    address public constant BTCB = address(0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c);
    address public constant WBNB = address(0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c);
    address public constant VAI = address(0x4BD17003473389A42DAF6a0a729f6Fdb328BbBd7);
    address public constant VAI_VAULT = address(0x0667Eed0a0aAb930af74a3dfeDD263A73994f216);
    address public constant VAI_CONTROLLER = address(0x004065D34C6b18cE4370ced1CeBDE94865DbFAFE);
    address public constant VENUS = address(0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63);
    address public constant VENUS_BTC = address(0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B);
    address public constant VENUS_COMPTROLLER = address(0xfD36E2c2a6789Db23113685031d7F16329158384);
    address public constant PANCAKE_SWAP_ROUTER = address(0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F);

    /**
     * @dev Initializes the strategy.
     */
    function initialize(address _plus) public initializer {
        require(ISinglePlus(_plus).token() == VENUS_BTC, "not vBTC");
        __StrategyBase_init(_plus);

        address[] memory _markets = new address[](1);
        _markets[0] = VENUS_BTC;
        IComptroller(VENUS_COMPTROLLER).enterMarkets(_markets);
    }

     /**
     * @dev Returns the amount of tokens managed by the strategy.
     */
    function balance() public view override returns (uint256) {
        return IERC20Upgradeable(VENUS_BTC).balanceOf(address(this));
    }

    /**
     * @dev Withdraws a portional amount of assets from the Strategy.
     */
    function withdraw(uint256 _amount) public override onlyPlus {
        (,,uint256 _shortfall) = IComptroller(VENUS_COMPTROLLER).getHypotheticalAccountLiquidity(address(this), VENUS_BTC, _amount, 0);
        if (_shortfall > 0) {
            IVAIVault(VAI_VAULT).withdraw(_shortfall);
            IVAIController(VAI_CONTROLLER).repayVAI(_shortfall);
        }

        IERC20Upgradeable(VENUS_BTC).safeTransfer(plus, _amount);
    }

    /**
     * @dev Withdraws all assets out of the Strategy.  Usually used in strategy migration.
     */
    function withdrawAll() public override onlyPlus returns (uint256) {
        // Withdraws all VAI from VAI vault
        uint256 _vai = IVAIVault(VAI_VAULT).userInfo(address(this)).amount;
        if (_vai > 0) {
            IVAIVault(VAI_VAULT).withdraw(_vai);
        }

        // Repays all VAI
        _vai = IERC20Upgradeable(VAI).balanceOf(address(this));
        if ((_vai > 0)) {
            IVAIController(VAI_CONTROLLER).repayVAI(_vai);
        }

        uint256 _vbtc = IERC20Upgradeable(VENUS_BTC).balanceOf(address(this));
        if (_vbtc > 0) {
            IERC20Upgradeable(VENUS_BTC).safeTransfer(plus, _vbtc);
        }

        return _vbtc;
    }

    /**
     * @dev Invest the managed token in strategy to earn yield.
     */
    function deposit() public override onlyStrategist {
        (, uint256 _mintableVAI) = IVAIController(VAI_CONTROLLER).getMintableVAI(address(this));
        if (_mintableVAI > 0) {
            // Mints maximum VAI using vBTC as collateral
            IVAIController(VAI_CONTROLLER).mintVAI(_mintableVAI);
        }

        uint256 _vai = IERC20Upgradeable(VAI).balanceOf(address(this));
        if (_vai > 0) {
            IERC20Upgradeable(VAI).safeApprove(VAI_VAULT, 0);
            IERC20Upgradeable(VAI).safeApprove(VAI_VAULT, _vai);

            // Stakes VAI into VAI vault
            IVAIVault(VAI_VAULT).deposit(_vai);
        }
    }

    /**
     * @dev Harvest in strategy.
     * Only pool can invoke this function.
     */
    function harvest() public override onlyStrategist {
        // Harvest from Venus comptroller
        IComptroller(VENUS_COMPTROLLER).claimVenus(address(this));

        // Harvest from VAI controller
        IVAIVault(VAI_VAULT).claim();

        uint256 _venus = IERC20Upgradeable(VENUS).balanceOf(address(this));
        // PancakeSawp: XVS --> WBNB --> BTCB
        if (_venus > 0) {
            IERC20Upgradeable(VENUS).safeApprove(PANCAKE_SWAP_ROUTER, 0);
            IERC20Upgradeable(VENUS).safeApprove(PANCAKE_SWAP_ROUTER, _venus);

            address[] memory _path = new address[](3);
            _path[0] = VENUS;
            _path[1] = WBNB;
            _path[2] = BTCB;

            IUniswapRouter(PANCAKE_SWAP_ROUTER).swapExactTokensForTokens(_venus, uint256(0), _path, address(this), now.add(1800));
        }
        // Venus: BTCB --> vBTC
        uint256 _btcb = IERC20Upgradeable(BTCB).balanceOf(address(this));
        if (_btcb > 0) {
            IERC20Upgradeable(BTCB).safeApprove(VENUS_BTC, 0);
            IERC20Upgradeable(BTCB).safeApprove(VENUS_BTC, _btcb);
            IVToken(VENUS_BTC).mint(_btcb);
        }
        uint256 _vbtc = IERC20Upgradeable(VENUS_BTC).balanceOf(address(this));
        if (_vbtc == 0) {
            return;
        }
        uint256 _fee = 0;
        if (performanceFee > 0) {
            _fee = _vbtc.mul(performanceFee).div(PERCENT_MAX);
            IERC20Upgradeable(VENUS_BTC).safeTransfer(ISinglePlus(plus).treasury(), _fee);
        }
        deposit();

        emit Harvested(VENUS_BTC, _vbtc, _fee);

    }

    /**
     * @dev Checks whether a token can be salvaged via salvageToken(). The following three
     * tokens are not salvageable:
     * 1) vBTC
     * 2) XVS
     * 3) VAI
     * @param _token Token to check salvageability.
     */
    function _salvageable(address _token) internal view virtual override returns (bool) {
        return _token != VENUS_BTC && _token != VENUS && _token != VAI;
    }
}
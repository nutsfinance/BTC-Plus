// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";

import "../StrategyBase.sol";
import "../../interfaces/ISinglePlus.sol";
import "../../interfaces/acryptos/IFarm.sol";
import "../../interfaces/acryptos/IVault.sol";
import "../../interfaces/uniswap/IUniswapRouter.sol";

/**
 * @dev Earning strategy for ACryptoS BTCB
 */
contract StrategyACryptoSBTCB is StrategyBase {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    address public constant BTCB = address(0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c);
    address public constant WBNB = address(0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c);
    address public constant ACS = address(0x4197C6EF3879a08cD51e5560da5064B773aa1d29);
    address public constant ACS_ACS = address(0x7679381507af0c8DE64586A458161aa58D3A4FC3);
    address public constant ACS_BTCB = address(0x0395fCC8E1a1E30A1427D4079aF6E23c805E3eeF);
    address public constant ACS_FARM = address(0xb1fa5d3c0111d8E9ac43A19ef17b281D5D4b474E);
    address public constant PANCAKE_SWAP_ROUTER = address(0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F);

    /**
     * @dev Initializes the strategy.
     */
    function initialize(address _plus) public initializer {
        require(ISinglePlus(_plus).token() == ACS_BTCB, "not acsBTCB");
        __StrategyBase_init(_plus);
    }

    /**
     * @dev Returns the amount of tokens deposited in the strategy.
     */
    function balanceOfStrategy() public view returns (uint256) {
        return IERC20Upgradeable(ACS_BTCB).balanceOf(address(this));
    }

    /**
     * @dev Returns the amount of tokens deposited in the gauge.
     */
    function balanceOfPool() public view returns (uint256) {
        return IFarm(ACS_FARM).userInfo(ACS_BTCB, address(this)).amount;
    }

    /**
     * @dev Returns the amount of tokens managed by the strategy.
     */
    function balance() public view override returns (uint256) {
        return balanceOfStrategy().add(balanceOfPool());
    }

    /**
     * @dev Withdraws a portional amount of assets from the Strategy.
     */
    function withdraw(uint256 _amount) public override onlyPlus {
        IERC20Upgradeable _token = IERC20Upgradeable(ACS_BTCB);
        uint256 _balance = _token.balanceOf(address(this));
        if (_balance < _amount) {
            IFarm(ACS_FARM).withdraw(ACS_BTCB, _amount.sub(_balance));
            _amount = MathUpgradeable.min(_amount, _token.balanceOf(address(this)));
        }
        _token.safeTransfer(plus, _amount);
    }

    /**
     * @dev Withdraws all assets out of the Strategy.  Usually used in strategy migration.
     */
    function withdrawAll() public override onlyPlus returns (uint256) {
        IFarm(ACS_FARM).withdraw(ACS_BTCB, balanceOfPool());
        uint256 _balance = IERC20Upgradeable(ACS_BTCB).balanceOf(address(this));
        if (_balance > 0) {
            IERC20Upgradeable(ACS_BTCB).safeTransfer(plus, _balance);
        }

        return _balance;
    }

    /**
     * @dev Invest the managed token in strategy to earn yield.
     */
    function deposit() public override onlyStrategist {
        uint256 _balance = IERC20Upgradeable(ACS_BTCB).balanceOf(address(this));
        if (_balance > 0) {
            IFarm(ACS_FARM).deposit(ACS_BTCB, _balance);
        }
    }

    /**
     * @dev Harvest in strategy.
     * Only pool can invoke this function.
     */
    function harvest() public override onlyStrategist {
        // Harvest from ACryptoS Farm
        IFarm(ACS_FARM).harvest(ACS_BTCB);

        uint256 _acs = IERC20Upgradeable(ACS).balanceOf(address(this));
        // PancakeSawp: ACS --> WBNB --> BTCB
        if (_acs > 0) {
            IERC20Upgradeable(ACS).safeApprove(PANCAKE_SWAP_ROUTER, 0);
            IERC20Upgradeable(ACS).safeApprove(PANCAKE_SWAP_ROUTER, _acs);

            address[] memory _path = new address[](3);
            _path[0] = ACS;
            _path[1] = WBNB;
            _path[2] = BTCB;

            IUniswapRouter(PANCAKE_SWAP_ROUTER).swapExactTokensForTokens(_acs, uint256(0), _path, address(this), now.add(1800));
        }
        // ACrytoS: BTCB --> acsBTCB
        uint256 _btcb = IERC20Upgradeable(BTCB).balanceOf(address(this));
        if (_btcb > 0) {
            IERC20Upgradeable(BTCB).safeApprove(ACS_BTCB, 0);
            IERC20Upgradeable(BTCB).safeApprove(ACS_BTCB, _btcb);
            IVault(ACS_BTCB).deposit(_btcb);
        }
        uint256 _acsBTCB = IERC20Upgradeable(ACS_BTCB).balanceOf(address(this));
        if (_acsBTCB == 0) {
            return;
        }
        uint256 _fee = 0;
        if (performanceFee > 0) {
            _fee = _acsBTCB.mul(performanceFee).div(PERCENT_MAX);
            IERC20Upgradeable(ACS_BTCB).safeTransfer(ISinglePlus(plus).treasury(), _fee);
        }
        deposit();

        emit Harvested(ACS_BTCB, _acsBTCB, _fee);
    }

    /**
     * @dev Checks whether a token can be salvaged via salvageToken(). The following two
     * tokens are not salvageable:
     * 1) acsBTCB
     * 2) ACS
     * @param _token Token to check salvageability.
     */
    function _salvageable(address _token) internal view virtual override returns (bool) {
        return _token != ACS_BTCB && _token != ACS;
    }
}
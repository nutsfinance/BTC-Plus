// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../interfaces/ISinglePlus.sol";
import "../interfaces/ICompositePlus.sol";
import "../interfaces/venus/IVToken.sol";
import "../interfaces/fortube/IForTubeBank.sol";
import "../interfaces/yfi/IVault.sol";
import "../interfaces/belt/IMultiStrategyToken.sol";

/**
 * @dev Zap for BTC plus on BSC.
 */
contract BTCZapBsc is Initializable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    event Minted(address indexed account, address indexed target, uint256 amount, uint256 mintAmount);
    event Redeemed(address indexed account, address indexed source, uint256 amount, uint256 redeemAmount);

    address public constant BTCB = address(0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c);
    address public constant VENUS_BTC = address(0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B);
    address public constant VENUS_BTC_PLUS = address(0xcf8D1D3Fce7C2138F85889068e50F0e7a18b5321);
    address public constant FORTUBE_BTCB = address(0xb5C15fD55C73d9BeeC046CB4DAce1e7975DcBBBc);
    address public constant FORTUBE_BANK = address(0x0cEA0832e9cdBb5D476040D58Ea07ecfbeBB7672);
    address public constant FORTUBE_CONTROLLER = address(0xc78248D676DeBB4597e88071D3d889eCA70E5469);
    address public constant FORTUBE_BTCB_PLUS = address(0x73FddFb941c11d16C827169Bb94aCC227841C396);
    address public constant ACS_BTCB = address(0x0395fCC8E1a1E30A1427D4079aF6E23c805E3eeF);
    address public constant ACS_BTCB_PLUS = address(0xD7806143A4206aa9A816b964e4c994F533b830b0);
    address public constant BELT_BTC = address(0x51bd63F240fB13870550423D208452cA87c44444);
    address public constant BELT_BTC_PLUS = address(0x50c5E29277b0Bc4c9b0377295d94F8798a5026a8);
    address public constant BTCB_PLUS = address(0xe884E6695C4cB3c8DEFFdB213B50f5C2a1a9E0A2);
    uint256 public constant WAD = 10 ** 18;

    address public governance;

    /**
     * @dev Initializes the Zap contract.
     */
    function initialize() public initializer {
        governance = msg.sender;
        approveAll();
    }

    /**
     * @dev Updates allowance.
     */
    function approveAll() public {
        IERC20Upgradeable(BTCB).approve(VENUS_BTC, uint256(int256(-1)));

        IERC20Upgradeable(VENUS_BTC).approve(VENUS_BTC_PLUS, uint256(int256(-1)));

        IERC20Upgradeable(BTCB).approve(FORTUBE_CONTROLLER, uint256(int256(-1)));

        IERC20Upgradeable(FORTUBE_BTCB).approve(FORTUBE_BTCB_PLUS, uint256(int256(-1)));

        IERC20Upgradeable(BTCB).approve(ACS_BTCB, uint256(int256(-1)));

        IERC20Upgradeable(ACS_BTCB).approve(ACS_BTCB_PLUS, uint256(int256(-1)));

        IERC20Upgradeable(BTCB).approve(BELT_BTC, uint256(int256(-1)));

        IERC20Upgradeable(BELT_BTC).approve(BELT_BTC_PLUS, uint256(int256(-1)));

        IERC20Upgradeable(VENUS_BTC_PLUS).approve(BTCB_PLUS, uint256(int256(-1)));

        IERC20Upgradeable(ACS_BTCB_PLUS).approve(BTCB_PLUS, uint256(int256(-1)));
    }

    /**
     * @dev Mints vBTC+ with BTCB.
     * @param _amount Amount of BTCB used to mint vBTC+
     */
    function mintVBTCPlus(uint256 _amount) public {
        require(_amount > 0, "zero amount");
        
        IERC20Upgradeable(BTCB).safeTransferFrom(msg.sender, address(this), _amount);
        IVToken(VENUS_BTC).mint(_amount);

        uint256 _vbtc = IERC20Upgradeable(VENUS_BTC).balanceOf(address(this));
        ISinglePlus(VENUS_BTC_PLUS).mint(_vbtc);

        uint256 _vbtcPlus = IERC20Upgradeable(VENUS_BTC_PLUS).balanceOf(address(this));
        IERC20Upgradeable(VENUS_BTC_PLUS).safeTransfer(msg.sender, _vbtcPlus);

        emit Minted(msg.sender, VENUS_BTC_PLUS, _amount, _vbtcPlus);
    }

    /**
     * @dev Redeems vBTC+ to BTCB.
     * @param _amount Amount of vTCB+ to redeem.
     */
    function redeemVBTCPlus(uint256 _amount) public {
        require(_amount > 0, "zero amount");

        IERC20Upgradeable(VENUS_BTC_PLUS).safeTransferFrom(msg.sender, address(this), _amount);
        ISinglePlus(VENUS_BTC_PLUS).redeem(_amount);

        uint256 _vbtc = IERC20Upgradeable(VENUS_BTC).balanceOf(address(this));
        IVToken(VENUS_BTC).redeem(_vbtc);

        uint256 _btcb = IERC20Upgradeable(BTCB).balanceOf(address(this));
        IERC20Upgradeable(BTCB).safeTransfer(msg.sender, _btcb);

        emit Redeemed(msg.sender, VENUS_BTC_PLUS, _btcb, _amount);
    }

    /**
     * @dev Mints fBTCB+ with BTCB.
     * @param _amount Amount of BTCB used to mint fBTCB+
     */
    function mintFBTCBPlus(uint256 _amount) public {
        require(_amount > 0, "zero amount");
        
        IERC20Upgradeable(BTCB).safeTransferFrom(msg.sender, address(this), _amount);
        IForTubeBank(FORTUBE_BANK).deposit(BTCB, _amount);

        uint256 _fbtcb = IERC20Upgradeable(FORTUBE_BTCB).balanceOf(address(this));
        ISinglePlus(FORTUBE_BTCB_PLUS).mint(_fbtcb);

        uint256 _fbtcbPlus = IERC20Upgradeable(FORTUBE_BTCB_PLUS).balanceOf(address(this));
        IERC20Upgradeable(FORTUBE_BTCB_PLUS).safeTransfer(msg.sender, _fbtcbPlus);

        emit Minted(msg.sender, FORTUBE_BTCB_PLUS, _amount, _fbtcbPlus);
    }

    /**
     * @dev Redeems fBTC+ to BTCB.
     * @param _amount Amount of fTCB+ to redeem.
     */
    function redeemFBTCBPlus(uint256 _amount) public {
        require(_amount > 0, "zero amount");

        IERC20Upgradeable(FORTUBE_BTCB_PLUS).safeTransferFrom(msg.sender, address(this), _amount);
        ISinglePlus(FORTUBE_BTCB_PLUS).redeem(_amount);

        uint256 _fbtcb = IERC20Upgradeable(FORTUBE_BTCB).balanceOf(address(this));
        IForTubeBank(FORTUBE_BANK).withdraw(BTCB, _fbtcb);

        uint256 _btcb = IERC20Upgradeable(BTCB).balanceOf(address(this));
        IERC20Upgradeable(BTCB).safeTransfer(msg.sender, _btcb);

        emit Redeemed(msg.sender, FORTUBE_BTCB_PLUS, _btcb, _amount);
    }

    /**
     * @dev Mints acsBTCB+ with BTCB.
     * @param _amount Amount of BTCB used to mint acsBTCB+
     */
    function mintAcsBTCBPlus(uint256 _amount) public {
        require(_amount > 0, "zero amount");
        
        IERC20Upgradeable(BTCB).safeTransferFrom(msg.sender, address(this), _amount);
        IVault(ACS_BTCB).deposit(_amount);

        uint256 _acsBtcb = IERC20Upgradeable(ACS_BTCB).balanceOf(address(this));
        ISinglePlus(ACS_BTCB_PLUS).mint(_acsBtcb);

        uint256 _acsBtcbPlus = IERC20Upgradeable(ACS_BTCB_PLUS).balanceOf(address(this));
        IERC20Upgradeable(ACS_BTCB_PLUS).safeTransfer(msg.sender, _acsBtcbPlus);

        emit Minted(msg.sender, ACS_BTCB_PLUS, _amount, _acsBtcbPlus);
    }

    /**
     * @dev Redeems acsBTC+ to BTCB.
     * @param _amount Amount of acsTCB+ to redeem.
     */
    function redeemAcsBTCBPlus(uint256 _amount) public {
        require(_amount > 0, "zero amount");

        IERC20Upgradeable(ACS_BTCB_PLUS).safeTransferFrom(msg.sender, address(this), _amount);
        ISinglePlus(ACS_BTCB_PLUS).redeem(_amount);

        uint256 _acsBtcb = IERC20Upgradeable(ACS_BTCB).balanceOf(address(this));
        IVault(ACS_BTCB).withdraw(_acsBtcb);

        uint256 _btcb = IERC20Upgradeable(BTCB).balanceOf(address(this));
        IERC20Upgradeable(BTCB).safeTransfer(msg.sender, _btcb);

        emit Redeemed(msg.sender, ACS_BTCB_PLUS, _btcb, _amount);
    }

    /**
     * @dev Mints beltBTC+ with BTCB.
     * @param _amount Amount of BTCB used to mint beltBTC+
     */
    function mintBeltBTCPlus(uint256 _amount) public {
        require(_amount > 0, "zero amount");
        
        IERC20Upgradeable(BTCB).safeTransferFrom(msg.sender, address(this), _amount);
        IMultiStrategyToken(BELT_BTC).deposit(_amount, 0);

        uint256 _beltBtc = IERC20Upgradeable(BELT_BTC).balanceOf(address(this));
        ISinglePlus(BELT_BTC_PLUS).mint(_beltBtc);

        uint256 _beltBtcPlus = IERC20Upgradeable(BELT_BTC_PLUS).balanceOf(address(this));
        IERC20Upgradeable(BELT_BTC_PLUS).safeTransfer(msg.sender, _beltBtcPlus);

        emit Minted(msg.sender, BELT_BTC_PLUS, _amount, _beltBtcPlus);
    }

    /**
     * @dev Redeems beltBTC+ to BTCB.
     * @param _amount Amount of beltBTC+ to redeem.
     */
    function redeemBeltBTCPlus(uint256 _amount) public {
        require(_amount > 0, "zero amount");

        IERC20Upgradeable(BELT_BTC_PLUS).safeTransferFrom(msg.sender, address(this), _amount);
        ISinglePlus(BELT_BTC_PLUS).redeem(_amount);

        uint256 _beltBtc = IERC20Upgradeable(BELT_BTC).balanceOf(address(this));
        IMultiStrategyToken(BELT_BTC).withdraw(_beltBtc, 0);

        uint256 _btcb = IERC20Upgradeable(BTCB).balanceOf(address(this));
        IERC20Upgradeable(BTCB).safeTransfer(msg.sender, _btcb);

        emit Redeemed(msg.sender, BELT_BTC_PLUS, _btcb, _amount);
    }

    /**
     * @dev Mints BTCB+ with BTCB.
     * @param _amount Amount of BTCB used to mint BTCB+
     */
    function mintBTCBPlus(uint256 _amount) public {
        require(_amount > 0, "zero amount");
        
        // Always starts with vBTC+!
        IERC20Upgradeable(BTCB).safeTransferFrom(msg.sender, address(this), _amount);
        IVToken(VENUS_BTC).mint(_amount);

        uint256 _vbtc = IERC20Upgradeable(VENUS_BTC).balanceOf(address(this));
        ISinglePlus(VENUS_BTC_PLUS).mint(_vbtc);

        uint256 _vbtcPlus = IERC20Upgradeable(VENUS_BTC_PLUS).balanceOf(address(this));
        address[] memory _tokens = new address[](1);
        _tokens[0] = VENUS_BTC_PLUS;
        uint256[] memory _amounts = new uint256[](1);
        _amounts[0] = _vbtcPlus;
        ICompositePlus(BTCB_PLUS).mint(_tokens, _amounts);

        uint256 _btcbPlus = IERC20Upgradeable(BTCB_PLUS).balanceOf(address(this));
        IERC20Upgradeable(BTCB_PLUS).safeTransfer(msg.sender, _btcbPlus);

        emit Minted(msg.sender, BTCB_PLUS, _amount, _btcbPlus);
    }

    /**
     * @dev Redeems BTCB+ to BTCB.
     * @param _amount Amount of BTCB+ to redeem.
     */
    function redeemBTCBPlus(uint256 _amount) public {
        require(_amount > 0, "zero amount");

        IERC20Upgradeable(BTCB_PLUS).safeTransferFrom(msg.sender, address(this), _amount);
        ICompositePlus(BTCB_PLUS).redeem(_amount);

        uint256 _vbtcPlus = IERC20Upgradeable(VENUS_BTC_PLUS).balanceOf(address(this));
        ISinglePlus(VENUS_BTC_PLUS).redeem(_vbtcPlus);
        uint256 _vbtc = IERC20Upgradeable(VENUS_BTC).balanceOf(address(this));
        IVToken(VENUS_BTC).redeem(_vbtc);

        uint256 _acsBtcbPlus = IERC20Upgradeable(ACS_BTCB_PLUS).balanceOf(address(this));
        ISinglePlus(ACS_BTCB_PLUS).redeem(_acsBtcbPlus);
        uint256 _acsBtcb = IERC20Upgradeable(ACS_BTCB).balanceOf(address(this));
        IVault(ACS_BTCB).withdraw(_acsBtcb);

        uint256 _btcb = IERC20Upgradeable(BTCB).balanceOf(address(this));
        IERC20Upgradeable(BTCB).safeTransfer(msg.sender, _btcb);

        emit Redeemed(msg.sender, BTCB_PLUS, _btcb, _amount);

    }
}
// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "../interfaces/ISinglePlus.sol";
import "../interfaces/venus/IVToken.sol";
import "../interfaces/fortube/IForTubeBank.sol";
import "../interfaces/yfi/IVault.sol";
import "../interfaces/autofarm/IAutoBTC.sol";

/**
 * @dev Zap for BTC plus on BSC.
 */
contract BTCZapBsc {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    event Minted(address indexed target, uint256 amount, uint256 mintAmount);
    event Redeemed(address indexed source, uint256 amount, uint256 redeemAmount);

    address public constant BTCB = address(0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c);
    address public constant VENUS_BTC = address(0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B);
    address public constant VENUS_BTC_PLUS = address(0xcf8D1D3Fce7C2138F85889068e50F0e7a18b5321);
    address public constant FORTUBE_BTCB = address(0xb5C15fD55C73d9BeeC046CB4DAce1e7975DcBBBc);
    address public constant FORTUBE_BANK = address(0x0cEA0832e9cdBb5D476040D58Ea07ecfbeBB7672);
    address public constant FORTUBE_CONTROLLER = address(0xc78248D676DeBB4597e88071D3d889eCA70E5469);
    address public constant FORTUBE_BTCB_PLUS = address(0x73FddFb941c11d16C827169Bb94aCC227841C396);
    address public constant ACS_BTCB = address(0x0395fCC8E1a1E30A1427D4079aF6E23c805E3eeF);
    address public constant ACS_BTCB_PLUS = address(0xD7806143A4206aa9A816b964e4c994F533b830b0);
    address public constant AUTO_BTC = address(0x6B7Ea9F1EF1E6c662761201998Dc876b88Ed7414);
    address public constant AUTO_BTC_PLUS = address(0x02827D495B2bBe37e1C021eB91BCdCc92cD3b604);
    uint256 public constant WAD = 10 ** 18;

    address public governance;

    constructor() {
        governance = msg.sender;
        IERC20Upgradeable(BTCB).safeApprove(VENUS_BTC, uint256(int256(-1)));
        IERC20Upgradeable(VENUS_BTC).safeApprove(VENUS_BTC_PLUS, uint256(int256(-1)));

        IERC20Upgradeable(BTCB).safeApprove(FORTUBE_CONTROLLER, uint256(int256(-1)));
        IERC20Upgradeable(FORTUBE_BTCB).safeApprove(FORTUBE_BTCB_PLUS, uint256(int256(-1)));

        IERC20Upgradeable(BTCB).safeApprove(ACS_BTCB, uint256(int256(-1)));
        IERC20Upgradeable(ACS_BTCB).safeApprove(ACS_BTCB_PLUS, uint256(int256(-1)));

        IERC20Upgradeable(BTCB).safeApprove(AUTO_BTC, uint256(int256(-1)));
        IERC20Upgradeable(AUTO_BTC).safeApprove(AUTO_BTC_PLUS, uint256(int256(-1)));
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

        emit Minted(VENUS_BTC_PLUS, _amount, _vbtcPlus);
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

        emit Redeemed(VENUS_BTC_PLUS, _btcb, _amount);
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

        emit Minted(FORTUBE_BTCB_PLUS, _amount, _fbtcbPlus);
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

        emit Redeemed(FORTUBE_BTCB_PLUS, _btcb, _amount);
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

        emit Minted(ACS_BTCB_PLUS, _amount, _acsBtcbPlus);
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

        emit Redeemed(ACS_BTCB_PLUS, _btcb, _amount);
    }

    /**
     * @dev Mints autoBTC+ with BTCB.
     * @param _amount Amount of BTCB used to mint autoBTC+
     */
    function mintAutoBTCPlus(uint256 _amount) public {
        require(_amount > 0, "zero amount");
        
        IERC20Upgradeable(BTCB).safeTransferFrom(msg.sender, address(this), _amount);
        IAutoBTC(AUTO_BTC).mint(_amount);

        uint256 _autoBtc = IERC20Upgradeable(AUTO_BTC).balanceOf(address(this));
        ISinglePlus(AUTO_BTC_PLUS).mint(_autoBtc);

        uint256 _autoBtcPlus = IERC20Upgradeable(AUTO_BTC_PLUS).balanceOf(address(this));
        IERC20Upgradeable(AUTO_BTC_PLUS).safeTransfer(msg.sender, _autoBtcPlus);

        emit Minted(AUTO_BTC_PLUS, _amount, _autoBtcPlus);
    }

    /**
     * @dev Redeems autoBTC+ to BTCB.
     * @param _amount Amount of autoTCB+ to redeem.
     */
    function redeemAutoBTCPlus(uint256 _amount) public {
        require(_amount > 0, "zero amount");

        IERC20Upgradeable(AUTO_BTC_PLUS).safeTransferFrom(msg.sender, address(this), _amount);
        ISinglePlus(AUTO_BTC_PLUS).redeem(_amount);

        uint256 _autoBtc = IERC20Upgradeable(AUTO_BTC).balanceOf(address(this));
        IAutoBTC(AUTO_BTC).redeem(_autoBtc);

        uint256 _btcb = IERC20Upgradeable(BTCB).balanceOf(address(this));
        IERC20Upgradeable(BTCB).safeTransfer(msg.sender, _btcb);

        emit Redeemed(AUTO_BTC_PLUS, _btcb, _amount);
    }
}
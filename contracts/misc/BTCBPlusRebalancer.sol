// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "../interfaces/IRebalancer.sol";
import "../interfaces/ISinglePlus.sol";
import "../interfaces/ICompositePlus.sol";
import "../interfaces/venus/IVToken.sol";
import "../interfaces/yfi/IVault.sol";

/**
 * @title Rebalancer for BTCB+.
 */
contract BTCBPlusRebalancer is IRebalancer, OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    event Converted(address indexed from, address indexed to, uint256 fromAmount, uint256 toAmount);

    address public constant BTCB = address(0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c);
    address public constant VENUS_BTC = address(0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B);
    address public constant VENUS_BTC_PLUS = address(0xcf8D1D3Fce7C2138F85889068e50F0e7a18b5321);
    address public constant ACS_BTCB = address(0x0395fCC8E1a1E30A1427D4079aF6E23c805E3eeF);
    address public constant ACS_BTCB_PLUS = address(0xD7806143A4206aa9A816b964e4c994F533b830b0);
    address public constant SIMPLE_BTCB_PLUS = address(0xb3d90840B5bDBc78b456B246ABD80dCA404ACD4b);
    address public constant BTCB_PLUS = address(0xe884E6695C4cB3c8DEFFdB213B50f5C2a1a9E0A2);

    function initialize() public initializer {
        __Ownable_init();
    }

    /**
     * @dev Performs rebalance after receiving the requested tokens.
     * @param _tokens Address of the tokens received from BTC+ pools.
     * @param _amounts Amounts of the tokens received from BTC+ pools.
     * @param _data Data to invoke on rebalancer contract.
     */
    function rebalance(address[] calldata _tokens, uint256[] calldata _amounts, bytes calldata _data) external override {
        require(msg.sender == BTCB_PLUS, "not btcb+");
        (address _to) = abi.decode(_data, (address));
        address _from = _tokens[0];

        if (_from == VENUS_BTC_PLUS && _to == ACS_BTCB_PLUS) {
            _redeemVBTCPlus();
            _mintAcsBTCBPlus();
        } else if (_from == ACS_BTCB_PLUS && _to == VENUS_BTC_PLUS) {
            _redeemAcsBTCBPlus();
            _mintVBTCPlus();
        } else if (_from == VENUS_BTC_PLUS && _to == SIMPLE_BTCB_PLUS) {
            _redeemVBTCPlus();
            _mintSimpleBTCBPlus();
        } else if (_from == ACS_BTCB_PLUS && _to == SIMPLE_BTCB_PLUS) {
            _redeemAcsBTCBPlus();
            _mintSimpleBTCBPlus();
        } else {
            revert("unsupported operation");
        }

        uint256 _toAmount = IERC20Upgradeable(_to).balanceOf(address(this));
        IERC20Upgradeable(_to).safeTransfer(msg.sender, _toAmount);

        emit Converted(_from, _to, _amounts[0], _toAmount);
    }

    /**
     * @dev Convert vBTC+ to acsBTCB+.
     * @param _amount Amount of vBTC+ to convert.
     */
    function vBTCPlusToAcsBTCBPlus(uint256 _amount) public onlyOwner {
        // Rebase vBTC+ and acsBTCB+ to get more accurate number
        ISinglePlus(VENUS_BTC_PLUS).rebase();
        ISinglePlus(ACS_BTCB_PLUS).rebase();

        address[] memory _tokens = new address[](1);
        _tokens[0] = VENUS_BTC_PLUS;
        uint256[] memory _amounts = new uint256[](1);
        _amounts[0] = _amount;
        bytes memory _data = abi.encode(ACS_BTCB_PLUS);

        ICompositePlus(BTCB_PLUS).rebalance(_tokens, _amounts, address(this), _data);
    }

    /**
     * @dev Converts acsBTCB+ to vBTC+.
     * @param _amount Amount of acsBTCB+ to convert.
     */
    function acsBTCBPlusToVBTCPlus(uint256 _amount) public onlyOwner {
        // Rebase vBTC+ and acsBTCB+ to get more accurate number
        ISinglePlus(VENUS_BTC_PLUS).rebase();
        ISinglePlus(ACS_BTCB_PLUS).rebase();
        
        address[] memory _tokens = new address[](1);
        _tokens[0] = ACS_BTCB_PLUS;
        uint256[] memory _amounts = new uint256[](1);
        _amounts[0] = _amount;
        bytes memory _data = abi.encode(VENUS_BTC_PLUS);

        ICompositePlus(BTCB_PLUS).rebalance(_tokens, _amounts, address(this), _data);
    }

    /**
     * @dev Convert vBTC+ to simpleBTCB+.
     * @param _amount Amount of vBTC+ to convert.
     */
    function vBTCPlusToSimpleBTCBPlus(uint256 _amount) public onlyOwner {
        // Rebase vBTC+ to get more accurate number
        ISinglePlus(VENUS_BTC_PLUS).rebase();

        address[] memory _tokens = new address[](1);
        _tokens[0] = VENUS_BTC_PLUS;
        uint256[] memory _amounts = new uint256[](1);
        _amounts[0] = _amount;
        bytes memory _data = abi.encode(SIMPLE_BTCB_PLUS);

        ICompositePlus(BTCB_PLUS).rebalance(_tokens, _amounts, address(this), _data);
    }

    /**
     * @dev Converts acsBTCB+ to simpleBTCB+.
     * @param _amount Amount of acsBTCB+ to convert.
     */
    function acsBTCBPlusToSimpleBTCBPlus(uint256 _amount) public onlyOwner {
        // Rebase acsBTCB+ to get more accurate number
        ISinglePlus(ACS_BTCB_PLUS).rebase();
        
        address[] memory _tokens = new address[](1);
        _tokens[0] = ACS_BTCB_PLUS;
        uint256[] memory _amounts = new uint256[](1);
        _amounts[0] = _amount;
        bytes memory _data = abi.encode(SIMPLE_BTCB_PLUS);

        ICompositePlus(BTCB_PLUS).rebalance(_tokens, _amounts, address(this), _data);
    }

    /**
     * @dev Mints vBTC+ with BTCB.
     */
    function _mintVBTCPlus() private {
        uint256 _btcb = IERC20Upgradeable(BTCB).balanceOf(address(this));
        IERC20Upgradeable(BTCB).safeApprove(VENUS_BTC, _btcb);
        IVToken(VENUS_BTC).mint(_btcb);

        uint256 _vbtc = IERC20Upgradeable(VENUS_BTC).balanceOf(address(this));
        IERC20Upgradeable(VENUS_BTC).safeApprove(VENUS_BTC_PLUS, _vbtc);
        ISinglePlus(VENUS_BTC_PLUS).mint(_vbtc);
    }

    /**
     * @dev Redeems vBTC+ to BTCB.
     */
    function _redeemVBTCPlus() private {
        uint256 _vbtcPlus = IERC20Upgradeable(VENUS_BTC_PLUS).balanceOf(address(this));
        ISinglePlus(VENUS_BTC_PLUS).redeem(_vbtcPlus);

        uint256 _vbtc = IERC20Upgradeable(VENUS_BTC).balanceOf(address(this));
        IVToken(VENUS_BTC).redeem(_vbtc);
    }

    /**
     * @dev Mints acsBTCB+ with BTCB.
     */
    function _mintAcsBTCBPlus() private {
        uint256 _btcb = IERC20Upgradeable(BTCB).balanceOf(address(this));
        IERC20Upgradeable(BTCB).safeApprove(ACS_BTCB, _btcb);
        IVault(ACS_BTCB).deposit(_btcb);

        uint256 _acsBtcb = IERC20Upgradeable(ACS_BTCB).balanceOf(address(this));
        IERC20Upgradeable(ACS_BTCB).safeApprove(ACS_BTCB_PLUS, _acsBtcb);
        ISinglePlus(ACS_BTCB_PLUS).mint(_acsBtcb);
    }

    /**
     * @dev Redeems acsBTC+ to BTCB.
     */
    function _redeemAcsBTCBPlus() private {
        uint256 _acsBtcbPlus = IERC20Upgradeable(ACS_BTCB_PLUS).balanceOf(address(this));
        ISinglePlus(ACS_BTCB_PLUS).redeem(_acsBtcbPlus);

        uint256 _acsBtcb = IERC20Upgradeable(ACS_BTCB).balanceOf(address(this));
        IVault(ACS_BTCB).withdraw(_acsBtcb);
    }

    /**
     * @dev Mints simpleBTCB+ with BTCB.
     */
    function _mintSimpleBTCBPlus() private {
        uint256 _btcb = IERC20Upgradeable(BTCB).balanceOf(address(this));
        IERC20Upgradeable(BTCB).safeApprove(SIMPLE_BTCB_PLUS, _btcb);
        ISinglePlus(SIMPLE_BTCB_PLUS).mint(_btcb);
    }

    /**
     * @dev Redeems simpleBTCB+ to BTCB.
     */
    function _redeemSimpleBTCBPlus() private {
        uint256 _simpleBtcbPlus = IERC20Upgradeable(SIMPLE_BTCB_PLUS).balanceOf(address(this));
        ISinglePlus(SIMPLE_BTCB_PLUS).redeem(_simpleBtcbPlus);
    }
}
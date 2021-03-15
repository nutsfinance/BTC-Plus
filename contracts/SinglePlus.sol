// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./interfaces/IStrategy.sol";
import "./Plus.sol";

/**
 * @title Single plus token.
 *
 * A single plus token wraps an underlying ERC20 token, typically a yield token,
 * into a value peg token.
 */
contract SinglePlus is Plus, ReentrancyGuardUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    event Minted(address indexed user, uint256 amount, uint256 mintShare, uint256 mintAmount);
    event Redeemed(address indexed user, uint256 amount, uint256 redeemShare, uint256 redeemAmount, uint256 fee);

    event StrategyUpdated(address indexed strategy, bool approved);
    event StrategyActivated(address indexed oldActiveStrategy, address indexed newActiveStrategy);
    
    // Underlying token of the single plus toke. Typically a yield token and not value peg.
    address public token;
    // Whether minting is paused for the single plus token.
    bool public mintPaused;

    /**
     * @dev Initializes the single plus contract.
     * @param _token Underlying token of the single plus.
     * @param _nameOverride If empty, the single plus name will be `token_name Plus`
     * @param _symbolOverride If empty. the single plus name will be `token_symbol+`
     */
    function initialize(address _token, string memory _nameOverride, string memory _symbolOverride) public initializer {
        token = _token;

        string memory _name = _nameOverride;
        string memory _symbol = _symbolOverride;
        if (bytes(_name).length == 0) {
            _name = string(abi.encodePacked(ERC20Upgradeable(_token).name(), " Plus"));
        }
        if (bytes(_symbol).length == 0) {
            _symbol = string(abi.encodePacked(ERC20Upgradeable(_token).symbol(), "+"));
        }
        __PlusToken__init(_name, _symbol);
        __ReentrancyGuard_init();
    }

    /**
     * @dev Returns the amount of single plus tokens minted with the underlying token provided.
     * @dev _amounts Amount of underlying token used to mint the single plus token.
     */
    function getMintAmount(uint256 _amount) external view returns(uint256) {
        // Conversion rate is the amount of single plus token per underlying token, in WAD.
        return _amount.mul(_conversionRate()).div(WAD);
    }

    /**
     * @dev Mints the single plus token with the underlying token.
     * @dev _amount Amount of the underlying token used to mint single plus token.
     */
    function mint(uint256 _amount) external nonReentrant {
        require(_amount > 0, "zero amount");
        require(!mintPaused, "mint paused");

        // Rebase first to make index up-to-date
        rebase();

        // Transfers the underlying token in.
        IERC20Upgradeable(token).safeTransferFrom(msg.sender, address(this), _amount);
        // Conversion rate is the amount of single plus token per underlying token, in WAD.
        uint256 _newAmount = _amount.mul(_conversionRate()).div(WAD);
        // Index is in WAD
        uint256 _newShare = _newAmount.mul(WAD).div(index);
        totalShares = totalShares.add(_newShare);
        userShare[msg.sender] = userShare[msg.sender].add(_newShare);

        emit Minted(msg.sender, _amount, _newShare, _newAmount);
    }

    /**
     * @dev Returns the amount of tokens received in redeeming the single plus token.
     * @param _amount Amounf of single plus to redeem.
     * @return Amount of underlying token received as well as fee collected.
     */
    function getRedeemAmount(uint256 _amount) external view returns (uint256, uint256) {
        require(_amount > 0, "zero amount");

        uint256 _fee = 0;
        if (redeemFee > 0) {
            _fee = _amount.mul(redeemFee).div(MAX_PERCENT);
            _amount = _amount.sub(_fee);   
        }
        // Note: Fee is in plus token(18 decimals) but the received amount is in underlying token!
        return (_amount.mul(WAD).div(_conversionRate()), _fee);
    }

    /**
     * @dev Redeems the single plus token.
     * @param _amount Amount of single plus token to redeem. -1 means redeeming all shares.
     */
    function redeem(uint256 _amount) external nonReentrant {
        require(_amount > 0, "zero amount");

        // Rebase first to make index up-to-date
        rebase();

        // Special handling of -1 is required here in order to fully redeem all shares, since interest
        // will be accrued between the redeem transaction is signed and mined.
        uint256 _share;
        if (_amount == uint256(-1)) {
            _share = userShare[msg.sender];
            _amount = _share.mul(index).div(WAD);
        } else {
            _share  = _amount.mul(WAD).div(index);
        }

        uint256 _fee = _amount.mul(redeemFee).div(MAX_PERCENT);
        // Conversion rate is in WAD
        uint256 _underlyingAmount = _amount.sub(_fee).mul(WAD).div(_conversionRate());

        _withdraw(msg.sender, _underlyingAmount);

        // Updates the balance
        totalShares = totalShares.sub(_share);
        userShare[msg.sender] = userShare[msg.sender].sub(_share);

        emit Redeemed(msg.sender, _underlyingAmount, _share, _amount, _fee);
    }

    /**
     * @dev Updates the mint paused state of the underlying token.
     * @param _paused Whether minting with that token is paused.
     */
    function setMintPaused(bool _paused) external onlyStrategist {
        require(mintPaused != _paused, "no change");

        mintPaused = _paused;
        emit MintPausedUpdated(token, _paused);
    }

    /**
     * @dev Retrive the underlying assets from the investment.
     */
    function divest() public virtual {}

    /**
     * @dev Invest the underlying assets for additional yield.
     */
    function invest() public virtual {}

    /**
     * @dev Harvest additional yield from the investment.
     */
    function harvest() public virtual {}

    /**
     * @dev Checks whether a token can be salvaged via salvageToken().
     * @param _token Token to check salvageability.
     */
    function _salvageable(address _token) internal view override returns (bool) {
        // For single plus, the only token that cannot salvage is the underlying token!
        return _token != token;
    }

    /**
     * @dev Returns the amount of single plus token is worth for one underlying token, expressed in WAD.
     * The default implmentation assumes that the single plus and underlying tokens are both peg.
     */
    function _conversionRate() internal view virtual returns (uint256) {
        // 36 since the decimals for plus token is always 18, and conversion rate is in WAD.
        return uint256(10) ** (36 - ERC20Upgradeable(token).decimals());
    }

    /**
     * @dev Returns the total value of the underlying token in terms of the peg value, scaled to 18 decimals.
     */
    function _totalUnderlying() internal view virtual override returns (uint256) {
        uint256 _balance = IERC20Upgradeable(token).balanceOf(address(this));
        // Conversion rate is the amount of single plus token per underlying token, in WAD.
        return _balance.mul(_conversionRate()).div(WAD);
    }

    /**
     * @dev Withdraws underlying tokens.
     * @param _receiver Address to receive the token withdraw.
     * @param _amount Amount of underlying token withdraw.
     */
    function _withdraw(address _receiver, uint256  _amount) internal {
        IERC20Upgradeable(token).safeTransfer(_receiver, _amount);
    }
}
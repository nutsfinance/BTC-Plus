// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "../../interfaces/IStrategy.sol";
import "../PlusToken.sol";

/**
 * @title Single plus token.
 *
 * A single plus token wraps an underlying ERC20 token, typically a yield token,
 * into a value peg token.
 */
contract SinglePlus is PlusToken, ReentrancyGuardUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    event Minted(address indexed user, uint256 amount, uint256 mintShare, uint256 mintAmount);
    event Redeemed(address indexed user, uint256 amount, uint256 redeemShare, uint256 redeemAmount, uint256 fee);

    event StrategyListUpdated(address indexed _strategy, bool _approved);
    event ActiveStrategyUpdated(address indexed _oldActiveStrategy, address indexed _newActiveStrategy);
    
    // Underlying token of the single plus toke. Typically a yield token and
    // not value peg.
    address public token;
    // Whether minting is paused for the single plus token.
    bool public mintPaused;

    // Strategies used to earn yield for the underlying token.
    mapping(address => bool) public strategies;
    // Only strategy is active at a time.
    address public activeStrategy;

    /**
     * @dev Initializes the single plus contract.
     */
    function initialize(address _token, string memory _nameOverride, string memory _symbolOverride) public initializer {
        token = _token;

        string memory name = _nameOverride;
        string memory symbol = _symbolOverride;
        if (bytes(name).length == 0) {
            name = string(abi.encodePacked(ERC20Upgradeable(_token).name(), " Plus"));
        }
        if (bytes(symbol).length == 0) {
            symbol = string(abi.encodePacked(ERC20Upgradeable(_token).symbol(), "+"));
        }
        __PlusToken__init(name, symbol);
        __ReentrancyGuard_init();
    }

    /**
     * @dev Returns the amount of single plus token is worth for one underlying token, expressed in WAD.
     * The default implmentation assumes that the single plus and underlying tokens are both peg.
     */
    function _getConversionRate() internal view virtual returns (uint256) {
        // 36 since the decimals for plus token is always 18, and conversion rate is in WAD.
        return uint256(10) ** (36 - ERC20Upgradeable(token).decimals());
    }

    /**
     * @dev Withdraws underlying tokens.
     * @param _receiver Address to receive the token withdraw.
     * @param _amount Amount of underlying token withdraw.
     */
    function _withdraw(address _receiver, uint256  _amount) internal {
        IERC20Upgradeable underlying = IERC20Upgradeable(token);
        uint256 balance = underlying.balanceOf(address(this));
        address strategy = activeStrategy;

        if (balance < _amount) {
            require(strategy != address(0x0), "no active strategy");
            IStrategy(strategy).withdraw(_amount.sub(balance));
        }

        underlying.safeTransfer(_receiver, _amount);
    }

    /**
     * @dev Returns the total value of the plus token in terms of the peg value.
     * All underlying token amounts have been scaled to 18 decimals.
     */
    function totalUnderlying() public view virtual override returns (uint256) {
        // Conversion rate is in WAD
        return IERC20Upgradeable(token).balanceOf(address(this)).mul(WAD).div(_getConversionRate());
    }

    /**
     * @dev Returns the amount of single plus tokens minted with the underlying token provided.
     * @dev _amounts Amount of token used to mint the single plus token.
     */
    function getMintAmount(uint256 _amount) external view returns(uint256) {
        return _amount.mul(WAD).div(_getConversionRate());
    }

    /**
     * @dev Mints the single plus token with the underlying token.
     * @dev _amount Amount of the underlying token used to mint single plus token.
     */
    function mint(uint256 _amount) external nonReentrant {
        require(_amount > 0, "zero amount");

        // Rebase first to make index up-to-date
        rebase();

        // Transfers the underlying token in.
        IERC20Upgradeable(token).safeTransferFrom(msg.sender, address(this), _amount);
        // Conversion rate is in WAD
        uint256 newAmount = _amount.mul(WAD).div(_getConversionRate());
        // Index is in WAD
        uint256 newShare = newAmount.mul(WAD).div(index);
        totalShares = totalShares.add(newShare);
        userShare[msg.sender] = userShare[msg.sender].add(newShare);

        emit Minted(msg.sender, _amount, newShare, newAmount);
    }

    /**
     * @dev Returns the amount of tokens received in redeeming the single plus token.
     * @param _amount Amounf of single plus to redeem.
     * @return Amount of underlying token received as well as fee collected.
     */
    function getRedeemAmount(uint256 _amount) external view returns (uint256, uint256) {
        require(_amount > 0, "zero amount");

        // Special handling of -1 is required here in order to fully redeem all shares, since interest
        // will be accrued between the redeem transaction is signed and mined.
        uint256 redeemShare;
        uint256 redeemAmount = _amount;
        if (_amount == uint256(-1)) {
            redeemShare = userShare[msg.sender];
            redeemAmount = redeemShare.mul(index).div(WAD);
        } else {
            redeemShare  = _amount.mul(WAD).div(index);
        }

        uint256 fee = 0;
        if (redeemFee > 0) {
            fee = redeemAmount.sub(redeemFee).div(MAX_PERCENT);
            redeemAmount = redeemAmount.sub(fee);   
        }

        return (redeemAmount, fee);
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
        uint256 redeemShare;
        uint256 redeemAmount = _amount;
        if (_amount == uint256(-1)) {
            redeemShare = userShare[msg.sender];
            redeemAmount = redeemShare.mul(index).div(WAD);
        } else {
            redeemShare  = _amount.mul(WAD).div(index);
        }

        uint256 fee = redeemAmount.sub(redeemFee).div(MAX_PERCENT);
        // Conversion rate is in WAD
        uint256 underlyingAmount = redeemAmount.sub(fee).mul(WAD).div(_getConversionRate());

        _withdraw(msg.sender, underlyingAmount);

        // Updates the balance
        totalShares = totalShares.sub(redeemShare);
        userShare[msg.sender] = userShare[msg.sender].sub(redeemShare);

        emit Redeemed(msg.sender, underlyingAmount, redeemShare, redeemAmount, fee);
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
     * @dev Approves a strategy for the pool. Only governance can approve new strategy.
     * @param _strategy Address of the strategy to approve.
     * @param _setActive Whether to set this strategy as the active strategy.
     */
    function approveStrategy(address _strategy, bool _setActive) public virtual onlyGovernance {
        require(_strategy != address(0x0), "address not set");
        require(!strategies[_strategy], "already approved");

        strategies[_strategy] = true;
        emit StrategyListUpdated(_strategy, true);

        if (_setActive) {
            _setActiveStrategy(_strategy);
        }
    }

    /**
     * @dev Revoke a strategy for the pool. Only strategist can revoke strategy.
     * Note that only governance can approve new strategy, but strategists can revoke strategies.
     * @param _strategy Address of the strategy to revoke.
     */
    function revokeStrategy(address _strategy) public virtual onlyStrategist {
        require(_strategy != address(0x0), "address not set");
        require(strategies[_strategy], "not approved");

        strategies[_strategy] = false;
        emit StrategyListUpdated(_strategy, false);

        // If the strategy to revoke is the current active strategy, clears the active strategy.
        if (_strategy == activeStrategy) {
            _setActiveStrategy(address(0x0));
        }
    }

    /**
     * @dev Set a strategy as the active strategy. Only strategist can set active strategy.
     * @param _strategy Address of strategy to set as active. If empty it means clearing the active strategy.
     */
    function setActiveStrategy(address _strategy) public virtual onlyStrategist {
        require(strategies[_strategy], "not approved");

        _setActiveStrategy(_strategy);
    }

    function _setActiveStrategy(address _strategy) internal {
        address oldActiveStrategy = activeStrategy;
        if (oldActiveStrategy != address(0x0)) {
            IStrategy(oldActiveStrategy).withdrawAll();
        }

        activeStrategy = _strategy;
        emit ActiveStrategyUpdated(oldActiveStrategy, _strategy);

        invest();
    }

    /**
     * @dev Invest the managed token into strategy to earn yield.
     * Only BTC+, governance and strategists can invoke this function.
     */
    function invest() public virtual onlyStrategist {
        if (activeStrategy == address(0x0)) return;

        IERC20Upgradeable underlying = IERC20Upgradeable(token);
        uint256 balance = underlying.balanceOf(address(this));
        if (balance > 0) {
            underlying.safeTransfer(activeStrategy, balance);
            IStrategy(activeStrategy).deposit();
        }
    }

    /**
     * @dev Harvest from strategy.
     * Only BTC+, governance and strategists can invoke this function.
     */
    function harvest() public virtual onlyStrategist {
        if (activeStrategy != address(0x0)) {
            IStrategy(activeStrategy).harvest();
            // It's time to rebase after harvest!
            rebase();
        }
    }
}
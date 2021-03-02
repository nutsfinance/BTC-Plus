// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "../../interfaces/IRebalancer.sol";
import "../PlusToken.sol";

/**
 * @title Composite plus token.
 *
 * A composite plus token is backed by a basket of plus token. The composite plus token,
 * along with its underlying tokens in the basket, should have the same peg.
 */
abstract contract CompositePlus is PlusToken, ReentrancyGuardUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    event RebalancerUpdated(address indexed rebalancer, bool enabled);
    event MinLiquidityRatioUpdated(uint256 oldRatio, uint256 newRatio);
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event Rebalanced(uint256 underlyingBefore, uint256 underlyingAfter, uint256 supply);

    // The underlying plus tokens that constitutes the composite plus token.
    address[] public tokenList;
    // Mapping: Token address => Whether the token is an underlying token.
    mapping(address => bool) public tokens;
    // Mapping: Token address => Whether minting with token is paused
    mapping(address => bool) public mintPaused;

    // Mapping: Address => Whether this is a rebalancer contract.
    mapping(address => bool) public rebalancers;
    // Liquidity ratio = Total supply / Total underlying
    // Liquidity ratio should larger than 1 in most cases except a short period after rebalance.
    // Minimum liquidity ratio sets the upper bound of impermanent loss caused by rebalance.
    uint256 public minLiquidityRatio;


    /**
     * @dev Initlaizes the composite plus token.
     */
    function initialize(string memory _name, string memory _symbol) public initializer {
        __PlusToken__init(_name, _symbol);
        __ReentrancyGuard_init();
    }

    /**
     * @dev Returns the total value of the plus token in terms of the peg value.
     * All underlying token amounts have been scaled to 18 decimals.
     */
    function totalUnderlying() public view virtual override returns (uint256) {
        uint256 amount = 0;
        for (uint256 i = 0; i < tokenList.length; i++) {
            // Since all underlying tokens in the baskets are plus tokens with the same value peg, the amount
            // minted is the amount of all plus tokens in the basket added.
            amount = amount.add(IERC20Upgradeable(tokenList[i]).balanceOf(address(this)));
        }

        return amount;
    }

    /**
     * @dev Returns the amount of composite plus tokens minted with the tokens provided.
     * @dev _tokens The tokens used to mint the composite plus token.
     * @dev _amounts Amount of tokens used to mint the composite plus token.
     */
    function getMintAmount(address[] calldata _tokens, uint256[] calldata _amounts) external view returns(uint256) {
        require(_tokens.length == _amounts.length, "invalid input");
        uint256 amount = 0;
        for (uint256 i = 0; i < _tokens.length; i++) {
            require(!mintPaused[_tokens[i]], "token paused");
            require(tokens[_tokens[i]], "token not exist");
            if (_amounts[i] == 0) continue;

            // Since all underlying tokens in the baskets are plus tokens with the same value peg, the amount
            // minted is the amount of all tokens to mint added.
            amount = amount.add(_amounts[i]);
        }

        return amount;
    }

    /**
     * @dev Mints BTC+.
     * @dev _tokens The tokens used to mint BTC+. BTC+ must have sufficient allownance on the token.
     * @dev _amounts Amount of tokens used to mint BTC+.
     */
    function mint(address[] calldata _tokens, uint256[] calldata _amounts) external nonReentrant {
        require(_tokens.length == _amounts.length, "invalid input");

        // Rebase first to make index up-to-date
        rebase();
        uint256 underlyingBefore = totalUnderlying();
        for (uint256 i = 0; i < _tokens.length; i++) {
            if (_amounts[i] == 0) continue;

            require(tokens[_tokens[i]], "token not exist");
            require(!mintPaused[_tokens[i]], "token paused");

            // Transfers the token into pool.
            IERC20Upgradeable(_tokens[i]).safeTransferFrom(msg.sender, address(this), _amounts[i]);
        }

        uint256 underlyingAfter = totalUnderlying();
        uint256 newShare = underlyingAfter.sub(underlyingBefore).mul(WAD).div(index);
        totalShares = totalShares.add(newShare);
        userShare[msg.sender] = userShare[msg.sender].add(newShare);

        emit Minted(msg.sender, _tokens, _amounts, newShare, underlyingAfter.sub(underlyingBefore));
    }

    /**
     * @dev Returns the amount of tokens received in redeeming the composite plus token.
     * @param _amount Amounf of composite plus to redeem.
     * @return Addresses and amounts of tokens returned as well as fee collected.
     */
    function getRedeemAmount(uint256 _amount) external view returns (address[] memory, uint256[] memory, uint256, uint256) {
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

        // Withdraw ratio = min(liquidity ratio, 1 - redeem fee)
        uint256 withdrawRatio = MathUpgradeable.min(getLiquidityRatio(), MAX_PERCENT - redeemFee);
        uint256 fee = redeemAmount.mul(MAX_PERCENT.sub(withdrawRatio)).div(MAX_PERCENT);

        address[] memory redeemTokens = tokenList;
        uint256[] memory redeemAmounts = new uint256[](tokenList.length);
        for (uint256 i = 0; i < redeemTokens.length; i++) {
            uint256 balance = IERC20Upgradeable(redeemTokens[i]).balanceOf(address(this));
            if (balance == 0)   continue;

            redeemAmounts[i] = balance.mul(redeemShare).mul(withdrawRatio).div(totalShares).div(MAX_PERCENT);
        }

        return (redeemTokens, redeemAmounts, redeemShare, fee);
    }

    /**
     * @dev Redeems the composite plus token. In the current implementation only proportional redeem is supported.
     * @param _amount Amount of composite plus token to redeem. -1 means redeeming all shares.
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

        // Withdraw ratio = min(liquidity ratio, 1 - redeem fee)
        uint256 withdrawRatio = MathUpgradeable.min(getLiquidityRatio(), MAX_PERCENT - redeemFee);
        uint256 fee = redeemAmount.mul(MAX_PERCENT.sub(withdrawRatio)).div(MAX_PERCENT);

        address[] memory redeemTokens = tokenList;
        uint256[] memory redeemAmounts = new uint256[](tokenList.length);
        for (uint256 i = 0; i < redeemTokens.length; i++) {
            uint256 balance = IERC20Upgradeable(redeemTokens[i]).balanceOf(address(this));
            if (balance == 0)   continue;

            redeemAmounts[i] = balance.mul(redeemShare).mul(withdrawRatio).div(totalShares).div(MAX_PERCENT);
            IERC20Upgradeable(redeemTokens[i]).safeTransfer(msg.sender, redeemAmounts[i]);
        }

        // Updates the balance
        totalShares = totalShares.sub(redeemShare);
        userShare[msg.sender] = userShare[msg.sender].sub(redeemShare);

        emit Redeemed(msg.sender, redeemTokens, redeemAmounts, redeemShare, redeemAmount, fee);
    }

    /**
     * @dev Updates the mint paused state of a token.
     * @param _token Token to update mint paused.
     * @param _paused Whether minting with that token is paused.
     */
    function setMintPaused(address _token, bool _paused) external onlyStrategist {
        require(tokens[_token], "no token");
        require(mintPaused[_token] != _paused, "no change");

        mintPaused[_token] = _paused;
        emit MintPausedUpdated(_token, _paused);
    }

    /**
     * @dev Adds a new rebalancer. Only governance can add new rebalancers.
     */
    function addRebalancer(address _rebalancer) external onlyGovernance {
        require(_rebalancer != address(0x0), "rebalancer not set");
        require(!rebalancers[_rebalancer], "rebalancer exist");

        rebalancers[_rebalancer] = true;
        emit RebalancerUpdated(_rebalancer, true);
    }

    /**
     * @dev Remove an existing rebalancer. Only strategist can remove existing rebalancers.
     */
    function removeRebalancer(address _rebalancer) external onlyStrategist {
        require(rebalancers[_rebalancer], "rebalancer exist");

        rebalancers[_rebalancer] = false;
        emit RebalancerUpdated(_rebalancer, false);
    }

    /**
     * @dev Udpates the minimum liquidity ratio. Only governance can update minimum liquidity ratio.
     */
    function setMinLiquidityRatio(uint256 _minLiquidityRatio) external onlyGovernance {
        require(_minLiquidityRatio <= MAX_PERCENT, "min liquidity ratio too big");
        uint256 oldRatio = minLiquidityRatio;

        minLiquidityRatio = _minLiquidityRatio;
        emit MinLiquidityRatioUpdated(oldRatio, _minLiquidityRatio);
    }

    /**
     * @dev Adds a new plus token to the basket. Only governance can add new plus token.
     * @param _token The new plus token to add.
     */
    function addToken(address _token) external onlyGovernance {
        require(_token != address(0x0), "token not set");
        require(!tokens[_token], "token exists");

        tokens[_token] = true;
        tokenList.push(_token);

        emit TokenAdded(_token);
    }

    /**
     * @dev Removes a plus token from the basket. Only governance can remove a plus token.
     * Note: A token cannot be removed if it's balance is not zero!
     * @param _token The plus token to remove from the basket.
     */
    function removeToken(address _token) external onlyGovernance {
        require(_token != address(0x0), "token not set");
        require(tokens[_token], "token not exists");
        require(IERC20Upgradeable(_token).balanceOf(address(this)) == 0, "nonzero balance");

        uint256 tokenSize = tokenList.length;
        uint256 tokenIndex = tokenSize;
        for (uint256 i = 0; i < tokenSize; i++) {
            if (tokenList[i] == _token) {
                tokenIndex = i;
                break;
            }
        }
        // We must have found the token!
        assert(tokenIndex < tokenSize);

        tokenList[tokenIndex] = tokenList[tokenSize - 1];
        tokenList.pop();
        delete tokens[_token];
        // Delete the mint paused state as well
        delete mintPaused[_token];

        emit TokenRemoved(_token);
    }

    /**
     * @dev Return the total number of tokens.
     */
    function tokenSize() external view returns (uint256) {
        return tokenList.length;
    }

    /**
     * @dev Rebalances the basket, e.g. for a better yield. Only strategist can perform rebalance.
     * @param _tokens Address of the tokens to withdraw from the basket.
     * @param _amounts Amounts of the tokens to withdraw from the basket.
     * @param _rebalancer Address of the rebalancer contract to invoke.
     * @param _data Data to invoke on rebalancer contract.
     */
    function rebalance(address[] memory _tokens, uint256[] memory _amounts, address _rebalancer, bytes calldata _data) external onlyStrategist {
        require(rebalancers[_rebalancer], "invalid rebalancer");
        require(_tokens.length == _amounts.length, "invalid input");

        // Rebase first to make index up-to-date
        rebase();
        uint256 underlyingBefore = totalUnderlying();

        for (uint256 i = 0; i < _tokens.length; i++) {
            if (_amounts[i] == 0)   continue;
            require(tokens[_tokens[i]], "token not exist");

            IERC20Upgradeable(_tokens[i]).safeTransfer(_rebalancer, _amounts[i]);
        }
        // Invokes rebalancer contract.
        IRebalancer(_rebalancer).rebalance(_tokens, _amounts, _data);

        // Check post-rebalance conditions.
        uint256 underlyingAfter = totalUnderlying();
        uint256 supply = totalSupply();
        require(underlyingAfter < supply.mul(minLiquidityRatio).div(MAX_PERCENT), "too much loss");

        emit Rebalanced(underlyingBefore, underlyingAfter, supply);
    }
}
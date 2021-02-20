// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./interfaces/IPool.sol";
import "./interfaces/IRebalancer.sol";

/**
 * @title BTC+ token contract.
 * 
 * Users can mint BTC+ with both ERC20 BTC token or ERC20 BTC LP token. 1 ERC20 BTC mints 1 BTC+.
 * The BTC+ balance increases as interest is accrued with the tokens used to mint BTC+.
 *
 * BTC+ contract itself does not hold any asset. All supported assets are held and managed by pools.
 */
contract BTCPlus is ERC20Upgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    event Rebased(uint256 oldIndex, uint256 newIndex);
    event Minted(address indexed user, address[] indexed tokens, uint256[] amounts, uint256 mintShare, uint256 mintAmount);
    event Redeemed(address indexed user, address[] indexed tokens, uint256[] amounts, uint256 redeemShare, uint256 redeemAmount, uint256 fee);

    event GovernanceUpdated(address indexed oldGovernance, address indexed newGovernance);
    event StrategistUpdated(address indexed strategist, bool allowed);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event RebalancerUpdated(address indexed oldRebalancer, address indexed newBalancer);
    event RedeemFeeUpdated(uint256 oldFee, uint256 newFee);
    event MinLiquidityRatioUpdated(uint256 oldRatio, uint256 newRatio);
    event MintPausedUpdated(address indexed token, bool paused);
    event PoolAdded(address indexed token, address indexed pool);
    event PoolRemoved(address indexed token, address indexed pool);
    event Rebalanced(uint256 underlyingBefore, uint256 underlyingAfter, uint256 supply);

    uint256 public constant MAX_PERCENT = 10000; // 0.01%
    uint256 public constant WAD = 1e18;

    uint256 public totalShares;
    mapping(address => uint256) public userShare;
    // The exchange rate between total shares and BTC+ total supply. Express in WAD.
    // Note: The index will never decrease!
    uint256 public index;

    // All tokens supported to mint BTC+
    address[] public tokens;
    // Mapping: Token address => Pool address
    mapping(address => address) public pools;
    // Mapping: Token address => Whether minting with token is paused
    mapping(address => bool) public mintPaused;

    address public governance;
    mapping(address => bool) public strategists;
    address public treasury;
    address public rebalancer;

    // Governance parameters
    uint256 public redeemFee;
    // Liquidity ratio = Total amount of ERC20 BTC / BTC+ total supply.
    // Liquidity ratio should be 1 in most cases except a short period after rebalance.
    // Minimum liquidity ratio sets the upper bound of impermanent loss caused by rebalance.
    uint256 public minLiquidityRatio;

    /**
     * @dev Initializes the BTC+ contract.
     */
    function initialize() public initializer {
        __ERC20_init("BTC+", "BTC+");
        __ReentrancyGuard_init();
        index = WAD;
        governance = msg.sender;
        treasury = msg.sender;
        minLiquidityRatio = 9900;   // Initializes the min liquidity ratio to be 99%.
    }

    modifier onlyGovernance() {
        require(msg.sender == governance, "not governance");
        _;
    }

    modifier onlyStrategist {
        require(msg.sender == governance || strategists[msg.sender], "not strategist");
        _;
    }

    /**
     * @dev Returns the total supply of BTC+. See {IERC20Updateable-totalSupply}.
     */
    function totalSupply() public view virtual override returns (uint256) {
        return totalShares.mul(index).div(WAD);
    }

    /**
     * @dev Returns the balance of BTC+ for the account. See {IERC20Updateable-balanceOf}.
     */
    function balanceOf(address account) public view virtual override returns (uint256) {
        return userShare[account].mul(index).div(WAD);
    }

    /**
     * @dev Returns the total amount of ERC20 BTC in the BTC+ pools.
     * All underlying token amounts have been scaled to 18 decimals.
     */
    function totalUnderlying() public view returns (uint256) {
        uint256 amount = 0;

        for (uint256 i = 0; i < tokens.length; i++) {
            amount = amount.add(IPool(pools[tokens[i]]).underlyingBalance());
        }

        return amount;
    }

    /**
     * @dev Returns the current liquidity ratio of BTC+ pools.
     */
    function getLiquidityRatio() public view returns (uint256) {
        return totalUnderlying().mul(MAX_PERCENT).div(totalSupply());
    }

    /**
     * @dev Accrues interest to increase index.
     */
    function rebase() public {
        uint256 underlying = totalUnderlying();
        uint256 supply = totalSupply();
        // Supply might be larger than underlyiing in a short period of time after rebalancing.
        if (underlying > supply) {
            uint256 oldIndex = index;
            // Index can never decrease
            uint256 newIndex = underlying.mul(WAD).div(totalShares);
            index = newIndex;

            emit Rebased(oldIndex, newIndex);
        }
    }

    /**
     * @dev Returns the amount of BTC+ minted with the tokens provided.
     * @dev _tokens The tokens used to mint BTC+.
     * @dev _amounts Amount of tokens used to mint BTC+.
     */
    function getMintAmount(address[] calldata _tokens, uint256[] calldata _amounts) external view returns(uint256) {
        require(_tokens.length == _amounts.length, "input mismatch");
        uint256 amount = 0;
        for (uint256 i = 0; i < _tokens.length; i++) {
            require(!mintPaused[_tokens[i]], "token paused");
            address pool = pools[_tokens[i]];
            require(pool != address(0x0), "no pool");
            if (_amounts[i] == 0) continue;

            amount = amount.add(IPool(pool).underlyingBalanceOf(_amounts[i]));
        }

        return amount;
    }

    /**
     * @dev Mints BTC+.
     * @dev _tokens The tokens used to mint BTC+. BTC+ must have sufficient allownance on the token.
     * @dev _amounts Amount of tokens used to mint BTC+.
     */
    function mint(address[] calldata _tokens, uint256[] calldata _amounts) external nonReentrant {
        require(_tokens.length == _amounts.length, "input mismatch");

        // Rebase first to make index up-to-date
        rebase();
        uint256 underlyingBefore = totalUnderlying();
        for (uint256 i = 0; i < _tokens.length; i++) {
            require(!mintPaused[_tokens[i]], "token paused");
            address pool = pools[_tokens[i]];
            require(pool != address(0x0), "no pool");
            if (_amounts[i] == 0) continue;

            // Transfers the token into pool.
            IERC20Upgradeable(_tokens[i]).safeTransferFrom(msg.sender, pool, _amounts[i]);
        }

        uint256 underlyingAfter = totalUnderlying();
        uint256 newShare = underlyingAfter.sub(underlyingBefore).mul(WAD).div(index);
        totalShares = totalShares.add(newShare);
        userShare[msg.sender] = userShare[msg.sender].add(newShare);

        emit Minted(msg.sender, _tokens, _amounts, newShare, underlyingAfter.sub(underlyingBefore));
    }

    /**
     * @dev Data structure for local computation in redeem().
     */
    struct RedeemLocalVars {
        uint256 totalShares;
        uint256 redeemAmount;
        uint256 redeemShare;
        uint256 withdrawRatio;
        uint256 fee;
        address[] tokenList;
        uint256[] tokenAmounts;
    }

    /**
     * @dev Returns the amount of tokens received in redeeming BTC+.
     * @param _amount Amounf of BTC+ to redeem.
     * @return Addresses and amounts of tokens returned as well as fee collected.
     */
    function getRedeemAmount(uint256 _amount) external view returns (address[] memory, uint256[] memory, uint256) {
        require(_amount > 0, "zero amount");

        // Using a memory string vars to avoid "Stack too deep"
        RedeemLocalVars memory vars;

        vars.redeemShare  = _amount.mul(WAD).div(index);
        vars.redeemAmount = _amount;

        // Withdraw ratio = min(liquidity ratio, 1 - redeem fee)
        vars.withdrawRatio = MathUpgradeable.min(getLiquidityRatio(), MAX_PERCENT - redeemFee);
        vars.fee = vars.redeemAmount.mul(MAX_PERCENT.sub(vars.withdrawRatio)).div(MAX_PERCENT);
    
        vars.totalShares = totalShares;
        vars.tokenList = tokens;
        vars.tokenAmounts = new uint256[](vars.tokenList.length);
        for (uint256 i = 0; i < vars.tokenList.length; i++) {
            address pool = pools[vars.tokenList[i]];
            uint256 poolBalance = IPool(pool).balance();
            if (poolBalance == 0)   continue;

            vars.tokenAmounts[i] = poolBalance.mul(vars.redeemShare).mul(vars.withdrawRatio).div(vars.totalShares).div(MAX_PERCENT);
        }

        return (vars.tokenList, vars.tokenAmounts, vars.fee);
    }

    /**
     * @dev Redeems BTC+. In the current implementation only proportional redeem is supported.
     * @param _amount Amount of BTC+ to redeem. -1 means redeeming all shares.
     */
    function redeem(uint256 _amount) external nonReentrant {
        require(_amount > 0, "zero amount");

        // Rebase first to make index up-to-date
        rebase();

        // Using a memory string vars to avoid "Stack too deep"
        RedeemLocalVars memory vars;

        // Special handling of -1 is required here in order to fully redeem all shares, since interest
        // will be accrued between the redeem transaction is signed and mined.
        if (_amount == uint256(-1)) {
            vars.redeemShare = userShare[msg.sender];
            vars.redeemAmount = vars.redeemShare.mul(index).div(WAD);
        } else {
            vars.redeemShare  = _amount.mul(WAD).div(index);
            vars.redeemAmount = _amount;
        }

        // Withdraw ratio = min(liquidity ratio, 1 - redeem fee)
        vars.withdrawRatio = MathUpgradeable.min(getLiquidityRatio(), MAX_PERCENT - redeemFee);
        vars.fee = vars.redeemAmount.mul(MAX_PERCENT.sub(vars.withdrawRatio)).div(MAX_PERCENT);

    
        vars.totalShares = totalShares;
        vars.tokenList = tokens;
        vars.tokenAmounts = new uint256[](vars.tokenList.length);
        for (uint256 i = 0; i < vars.tokenList.length; i++) {
            address pool = pools[vars.tokenList[i]];
            uint256 poolBalance = IPool(pool).balance();
            if (poolBalance == 0)   continue;

            vars.tokenAmounts[i] = poolBalance.mul(vars.redeemShare).mul(vars.withdrawRatio).div(vars.totalShares).div(MAX_PERCENT);
            IPool(pool).withdraw(msg.sender, vars.tokenAmounts[i]);
        }

        // Updates the balance
        totalShares = totalShares.sub(vars.redeemShare);
        userShare[msg.sender] = userShare[msg.sender].sub(vars.redeemShare);

        emit Redeemed(msg.sender, vars.tokenList, vars.tokenAmounts, vars.redeemShare, vars.redeemAmount, vars.fee);
    }

    /**
     * @dev Moves tokens `amount` from `sender` to `recipient`.
     */
    function _transfer(address _sender, address _recipient, uint256 _amount) internal virtual override {
        // Rebase first to make index up-to-date
        rebase();
        uint256 shareToTransfer = _amount.mul(WAD).div(index);
        userShare[_sender] = userShare[_sender].sub(shareToTransfer, "insufficient share");
        userShare[_recipient] = userShare[_recipient].add(shareToTransfer);
    }

    /*********************************************
     *
     *    Governance methods
     *
     **********************************************/

    /**
     * @dev Updates governance. Only governance can update governance.
     */
    function setGovernance(address _governance) external onlyGovernance {
        address oldGovernance = governance;
        governance = _governance;
        emit GovernanceUpdated(oldGovernance, _governance);
    }

    /**
     * @dev Updates strategist. Only strategist can update strategist.
     */
    function setStrategist(address _strategist, bool allowed) external onlyStrategist {
        require(_strategist != address(0x0), "strategist not set");

        strategists[_strategist] = allowed;
        emit StrategistUpdated(_strategist, allowed);
    }

    /**
     * @dev Updates the treasury. Only governance can update treasury.
     */
    function setTreasury(address _treasury) external onlyGovernance {
        require(_treasury != address(0x0), "treasury not set");

        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }

    /**
     * @dev Updates the rebalancer. Only governance can update rebalancer.
     */
    function setRebalancer(address _rebalancer) external onlyGovernance {
        require(_rebalancer != address(0x0), "rebalancer not set");

        address oldRebalancer = rebalancer;
        rebalancer = _rebalancer;
        emit RebalancerUpdated(oldRebalancer, _rebalancer);
    }

    /**
     * @dev Updates the redeem fee. Only governance can update redeem fee.
     */
    function setRedeemFee(uint256 _redeemFee) external onlyGovernance {
        require(_redeemFee <= MAX_PERCENT, "redeem fee too big");
        uint256 oldFee = redeemFee;

        redeemFee = _redeemFee;
        emit RedeemFeeUpdated(oldFee, _redeemFee);
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
     * @dev Updates the mint paused state of a token.
     * @param _token Token to update mint paused.
     * @param _paused Whether minting with that token is paused.
     */
    function setMintPaused(address _token, bool _paused) external onlyStrategist {
        require(pools[_token] != address(0x0), "no pool");
        require(mintPaused[_token] != _paused, "no change");

        mintPaused[_token] = _paused;
        emit MintPausedUpdated(_token, _paused);
    }

    /**
     * @dev Adds a new pool. Only governance can add a new pool.
     * @param _token Managed token of the pool.
     * @param _pool The pool contract address.
     */
    function addPool(address _token, address _pool) external onlyGovernance {
        require(_token != address(0x0), "token not set");
        require(_pool != address(0x0), "pool not set");
        require(pools[_token] == address(0x0), "pool exists");
        require(_token == IPool(_pool).token(), "pool mismatch");

        pools[_token] = _pool;
        tokens.push(_token);

        emit PoolAdded(_token, _pool);
    }

    /**
     * @dev Removes a pool. Only governance can remove a pool.
     * Note: A pool cannot be removed if it's balance is not zero!
     * @param _token The managed token of the pool to remove.
     */
    function removePool(address _token) external onlyGovernance {
        require(_token != address(0x0), "token not set");
        address pool = pools[_token];
        require(pool != address(0x0), "pool not exists");
        require(IPool(pool).balance() == 0, "balance not zero");

        // Loads into memory for faster access
        address[] memory tokenList = tokens;
        uint256 tokenIndex = tokenList.length;
        for (uint256 i = 0; i < tokenList.length; i++) {
            if (tokenList[i] == _token) {
                tokenIndex = i;
                break;
            }
        }
        // We must have found the token!
        assert(tokenIndex < tokenList.length);

        tokens[tokenIndex] = tokens[tokenList.length - 1];
        tokens.pop();
        delete pools[_token];
        // Delete the mint paused state as well
        delete mintPaused[_token];

        emit PoolRemoved(_token, pool);
    }

    /**
     * @dev Used to salvage any ETH deposited to BTC+ contract by mistake. Only strategist can salvage ETH.
     * The salvaged ETH is transferred to treasury for futher operation.
     */
    function salvage() external onlyStrategist {
        uint256 amount = address(this).balance;
        address payable target = payable(treasury);
        (bool success, ) = target.call{value: amount}(new bytes(0));
        require(success, 'ETH salvage failed');
    }

    /**
     * @dev Used to salvage any token deposited to BTC+ contract by mistake. Only strategist can salvage token.
     * The salvaged token is transferred to treasury for futhuer operation.
     * @param _token Address of the token to salvage.
     */
    function salvageToken(address _token) external onlyStrategist {
        require(_token != address(0x0), "token not set");

        IERC20Upgradeable token = IERC20Upgradeable(_token);
        token.safeTransfer(treasury, token.balanceOf(address(this)));
    }

    /**
     * @dev Rebalances the BTC+ pools, e.g. for a better yield. Only strategist can perform rebalance.
     * @param _tokens Address of the tokens to withdraw from pools.
     * @param _amounts Amounts of the tokens to withdraw from pools.
     * @param _data Data to invoke on rebalancer contract.
     */
    function rebalance(address[] memory _tokens, uint256[] memory _amounts, bytes calldata _data) external onlyStrategist {
        require(rebalancer != address(0x0), "rebalancer not set");
        require(_tokens.length == _amounts.length, "input mismatch");

        // Rebase first to make index up-to-date
        rebase();
        uint256 underlyingBefore = totalUnderlying();

        for (uint256 i = 0; i < _tokens.length; i++) {
            if (_amounts[i] == 0)   continue;
            address pool = pools[_tokens[i]];
            require(pool != address(0x0), "pool not exists");

            IPool(pool).withdraw(rebalancer, _amounts[i]);
        }
        // Invokes rebalancer contract.
        IRebalancer(rebalancer).rebalance(_tokens, _amounts, _data);

        // Check post-rebalance conditions.
        uint256 underlyingAfter = totalUnderlying();
        uint256 supply = totalSupply();
        require(underlyingAfter < supply.mul(minLiquidityRatio).div(MAX_PERCENT), "too much loss");

        emit Rebalanced(underlyingBefore, underlyingAfter, supply);
    }
}
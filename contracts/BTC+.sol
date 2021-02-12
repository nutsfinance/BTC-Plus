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
    event Rebalanced(uint256 underlyingBefore, uint256 underlyingAfter, uint256 supply);

    uint256 public constant MAX_PERCENT = 10000; // 0.01%
    uint256 public constant WAD = 1e18;
    uint256 public constant RAY = 1e27;
    uint256 public constant WAD_RAY_RATIO = 1e9;

    uint256 public totalShares;
    mapping(address => uint256) public userShare;
    // The exchange rate between total shares and BTC+ total supply. Express in WAD.
    // Note: The index will never decrease!
    uint256 public index;

    // All tokens supported to mint BTC+
    address[] public tokens;
    // Mapping: Token address => Pool address
    mapping(address => address) public pools;

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
            address pool = pools[_tokens[i]];
            require(pool != address(0x0), "no pool");
            require(_amounts[i] > 0, "zero amount");

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
        uint256 redeemShare;
        uint256 withdrawRatio;
        uint256 totalSupply;
        uint256 totalUnderlying;
        uint256 fee;
        address[] tokenList;
        uint256[] tokenAmount;
    }

    /**
     * @dev Redeems BTC+. In the current implementation only proportional redeem is supported.
     * @param _amount Amount of BTC+ to redeem.
     */
    function redeem(uint256 _amount) public nonReentrant {
        require(_amount > 0, "zero amount");

        // Rebase first to make index up-to-date
        rebase();

        // Using a memory string vars to avoid "Stack too deep"
        RedeemLocalVars memory vars;

        vars.redeemShare = _amount.mul(WAD).div(index);
        totalShares = totalShares.sub(vars.redeemShare);
        userShare[msg.sender] = userShare[msg.sender].sub(vars.redeemShare);

        vars.totalUnderlying = totalUnderlying();
        vars.totalSupply = totalSupply();
        // Withdraw ratio = min(liquidity ratio, 1 - redeem fee)
        vars.withdrawRatio = MathUpgradeable.min(vars.totalUnderlying.mul(MAX_PERCENT).div(vars.totalSupply), MAX_PERCENT - redeemFee);
        vars.fee = _amount.mul(vars.withdrawRatio).div(MAX_PERCENT);

    
        vars.tokenList = tokens;
        vars.tokenAmount = new uint256[](vars.tokenList.length);
        for (uint256 i = 0; i < vars.tokenList.length; i++) {
            address pool = pools[vars.tokenList[i]];
            uint256 poolBalance = IPool(pool).balance();
            if (poolBalance == 0)   continue;

            vars.tokenAmount[i] = poolBalance.mul(_amount).mul(vars.withdrawRatio).div(vars.totalSupply).div(MAX_PERCENT);
            IPool(pool).withdraw(msg.sender, vars.tokenAmount[i]);
        }

        emit Redeemed(msg.sender, vars.tokenList, vars.tokenAmount, vars.redeemShare, _amount, vars.fee);
    }

    /**
     * @dev Moves tokens `amount` from `sender` to `recipient`.
     */
    function _transfer(address _sender, address _recipient, uint256 _amount) internal virtual override {
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
    }

    /**
     * @dev Removes a pool. Only governance can remove a pool.
     * Note: A pool cannot be removed if it's balance is not zero!
     * @param _token The managed token of the pool to remove.
     */
    function removePool(address _token) external onlyGovernance {
        require(_token != address(0x0), "token not set");
        require(pools[_token] != address(0x0), "pool not exists");

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
        delete tokens[tokenList.length - 1];
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
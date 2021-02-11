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

/**
 * @title BTC+ token contract.
 * 
 * Users can mint BTC+ with both ERC20 BTC token or ERC20 BTC LP token. 1 ERC20 BTC mints 1 BTC+.
 * The BTC+ balance increases as interest is accrued with the tokens used to mint BTC+.
 */
contract BTCPlus is ERC20Upgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    event GovernanceUpdated(address indexed oldGovernance, address indexed newGovernance);
    event StrategistUpdated(address indexed strategist, bool allowed);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event RebalancerUpdated(address indexed oldRebalancer, address indexed newBalancer);
    event RedeemFeeUpdated(uint256 oldFee, uint256 newFee);
    event MinLiquidityRatioUpdated(uint256 oldRatio, uint256 newRatio);

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
     * @dev See {IERC20Updateable-totalSupply}.
     */
    function totalSupply() public view virtual override returns (uint256) {
        return totalShares.mul(index).div(WAD);
    }

    /**
     * @dev See {IERC20Updateable-balanceOf}.
     */
    function balanceOf(address account) public view virtual override returns (uint256) {
        return userShare[account].mul(index).div(WAD);
    }

    function rebase() public {

    }

    function mint(address _receiver, address _token, uint256 _amount, string memory referralCode) public nonReentrant {

    }

    function redeem(address _receiver, uint256 _amount) public nonReentrant {

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
    function setGovernance(address _governance) public onlyGovernance {
        address oldGovernance = governance;
        governance = _governance;
        emit GovernanceUpdated(oldGovernance, _governance);
    }

    /**
     * @dev Updates strategist. Only strategist can update strategist.
     */
    function setStrategist(address _strategist, bool allowed) public onlyStrategist {
        require(_strategist != address(0x0), "strategist not set");

        strategists[_strategist] = allowed;
        emit StrategistUpdated(_strategist, allowed);
    }

    /**
     * @dev Updates the treasury. Only governance can update treasury.
     */
    function setTreasury(address _treasury) public onlyGovernance {
        require(_treasury != address(0x0), "treasury not set");

        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }

    /**
     * @dev Updates the rebalancer. Only governance can update rebalancer.
     */
    function setRebalancer(address _rebalancer) public onlyGovernance {
        require(_rebalancer != address(0x0), "rebalancer not set");

        address oldRebalancer = rebalancer;
        rebalancer = _rebalancer;
        emit RebalancerUpdated(oldRebalancer, _rebalancer);
    }

    /**
     * @dev Updates the redeem fee. Only governance can update redeem fee.
     */
    function setRedeemFee(uint256 _redeemFee) public onlyGovernance {
        require(_redeemFee <= MAX_PERCENT, "redeem fee too big");
        uint256 oldFee = redeemFee;

        redeemFee = _redeemFee;
        emit RedeemFeeUpdated(oldFee, _redeemFee);
    }

    /**
     * @dev Udpates the minimum liquidity ratio. Only governance can update minimum liquidity ratio.
     */
    function setMinLiquidityRatio(uint256 _minLiquidityRatio) public onlyGovernance {
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
    function addPool(address _token, address _pool) public onlyGovernance {
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
    function removePool(address _token) public onlyGovernance {

    }

    function rebalance(address[] memory _tokens, uint256[] memory _amounts, bytes memory data) public onlyGovernance {

    }
}
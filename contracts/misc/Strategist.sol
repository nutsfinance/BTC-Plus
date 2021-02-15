// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/Initializable.sol";

import "../interfaces/IPool.sol";
import "../BTC+.sol";

/**
 * @title A utility contract to help perform strategist work.
 *
 * This contract serve as one of the strategists in BTC+ contract. It could help to bundle
 * multiple strategist transactions into one.
 */
contract Strategist is Initializable, OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeMathUpgradeable for uint256;

    mapping(address => bool) public admins;
    BTCPlus public btcPlus;

    function initialize(address _btcPlus) public initializer {
        require(_btcPlus != address(0x0), "BTC+ not set");
        __Ownable_init();

        btcPlus = BTCPlus(_btcPlus);
    }

    /**
     * @dev Add or remove admin from the Strategist contract.
     */
    function setAdmin(address _account, bool _allowed) public onlyOwner {
        admins[_account] = _allowed;
    }

    modifier onlyAdmin() {
        require(msg.sender == owner() || admins[msg.sender], "not admin");
        _;
    }

    /**
     * @dev Perform invest on multiple tokens.
     */
    function invest(address[] memory _tokens) public onlyAdmin {
        for (uint256 i = 0; i < _tokens.length; i++) {
            address pool = btcPlus.pools(_tokens[i]);
            require(pool != address(0x0), "no pool");

            IPool(pool).invest();
        }
    }

    /**
     * @dev Perform havest on multiple tokens.
     */
    function harvest(address[] memory _tokens) public onlyAdmin {
        for (uint256 i = 0; i < _tokens.length; i++) {
            address pool = btcPlus.pools(_tokens[i]);
            require(pool != address(0x0), "no pool");

            IPool(pool).harvest();
        }
        // Do one round of rebase after havest!
        btcPlus.rebase();
    }
}
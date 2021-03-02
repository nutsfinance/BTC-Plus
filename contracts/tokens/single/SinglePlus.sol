// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

import "../PlusToken.sol";

/**
 * @title Single plus token.
 *
 * A single plus token wraps an underlying ERC20 token, typically a yield token,
 * into a value peg token.
 */
abstract contract SinglePlus is PlusToken {
    
    // Underlying token of the single plus toke. Typically a yield token and
    // not value peg.
    address public token;
    // Whether minting is paused for the single plus token.
    bool public mintPaused;

    /**
     * @dev Initializes the single plus contract.
     */
    function initialize(address _token, string memory nameOverride, string memory symbolOverride) public initializer {
        token = _token;

        string memory name = nameOverride;
        string memory symbol = symbolOverride;
        if (bytes(name).length == 0) {
            name = string(abi.encodePacked(ERC20Upgradeable(_token).name(), " Plus"));
        }
        if (bytes(symbol).length == 0) {
            symbol = string(abi.encodePacked(ERC20Upgradeable(_token).symbol(), "+"));
        }

        __PlusToken__init(name, symbol);
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
}
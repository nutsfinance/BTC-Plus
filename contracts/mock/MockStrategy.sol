// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "../strategies/StrategyBase.sol";
import "./MockToken.sol";

/**
 * @notice Mock Strategy.
 */
contract MockStrategy is StrategyBase {
    MockToken token;

    function initialize(address _plus) public initializer {
        __StrategyBase_init(_plus);
        token = MockToken(ISinglePlus(_plus).token());
    }

    /**
     * @dev Returns the total balance of token in this Strategy.
     */
    function balance() public override view returns (uint256) {
        return token.balanceOf(address(this));
    }

    /**
     * @dev Invests the free token balance in the strategy.
     */
    function deposit() public override {}

    /**
     * @dev Withdraws a portional amount of assets from the Strategy.
     */
    function withdraw(uint256 _amount) public override {
        token.transfer(plus, _amount);
    }

    /**
     * @dev Withdraws all assets out of the Strategy.  Usually used in strategy migration.
     */
    function withdrawAll() public override returns (uint256) {
        uint256 amount = balance();
        token.transfer(plus, amount);

        return amount;
    }

    /**
     * @dev Harvest yield from the market.
     */
    function harvest() public override {
        // Mint 20% token to simulate 20% yield.
        token.mint(address(this), balance() * 20 / 100);
    }

    /**
     * @dev Return the list of tokens that should not be salvaged.
     */
    function _getProtectedTokens() internal override view returns (address[] memory) {
        address[] memory protectedTokens = new address[](1);
        protectedTokens[0] = address(token);
        return protectedTokens;
    }
}
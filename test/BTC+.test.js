const { expectRevert } = require('@openzeppelin/test-helpers');
const assert = require('assert');
const Pool = artifacts.require("SinglePool");
const BTCPlus = artifacts.require("BTCPlus");
const ERC20 = artifacts.require("MockToken");
const Strategy = artifacts.require("MockStrategy");

contract("BTC+", async ([owner, treasury, strategist, user1, user2, user3, btcPlus2]) => {
    let btcPlus;
    let token1, token2, token3;
    let pool1, pool2, pool3;
    let strategy1, strategy2, strategy3;

    beforeEach(async () => {
        btcPlus = await BTCPlus.new();
        await btcPlus.initialize();
        await btcPlus.setTreasury(treasury);
        await btcPlus.setStrategist(strategist, true);

        token1 = await ERC20.new();
        await token1.initialize("Mock 1", "Mock 1", 6);
        pool1 = await Pool.new();
        await pool1.initialize(btcPlus.address, token1.address);
        strategy1 = await Strategy.new();
        await strategy1.initialize(pool1.address);
        await pool1.approveStrategy(strategy1.address, true);

        token2 = await ERC20.new();
        await token2.initialize("Mock 2", "Mock 2", 18);
        pool2 = await Pool.new();
        await pool2.initialize(btcPlus.address, token2.address);
        strategy2 = await Strategy.new();
        await strategy2.initialize(pool2.address);
        await pool2.approveStrategy(strategy2.address, true);

        token3 = await ERC20.new();
        await token3.initialize("Mock 3", "Mock 3", 8);
        pool3 = await Pool.new();
        await pool3.initialize(btcPlus.address, token3.address);
        strategy3 = await Strategy.new();
        await strategy3.initialize(pool3.address);
        await pool3.approveStrategy(strategy3.address, true);

        await btcPlus.addPool(token1.address, pool1.address);
        await btcPlus.addPool(token2.address, pool2.address)
    });

    it("should allow governance to update governance", async () => {
        await expectRevert(btcPlus.setGovernance(user1, {from: strategist}), "not governance");
        await btcPlus.setGovernance(user1);
        assert.strictEqual(await btcPlus.governance(), user1);
    });

    it("should allow strategist to update strategist", async () => {
        await expectRevert(btcPlus.setStrategist(user2, true, {from: user1}), "not strategist");
        await btcPlus.setStrategist(user2, true, {from: strategist});
        assert.strictEqual(await btcPlus.strategists(user2), true);
    });

    it("should allow governance to update treasury", async () => {
        await expectRevert(btcPlus.setTreasury(user2, {from: strategist}), "not governance");
        await btcPlus.setTreasury(user2);
        assert.strictEqual(await btcPlus.treasury(), user2);
    });

    it("should allow governance to update rebalancer", async () => {
        await expectRevert(btcPlus.setRebalancer(user2, {from: strategist}), "not governance");
        await btcPlus.setRebalancer(user2);
        assert.strictEqual(await btcPlus.rebalancer(), user2);
    });

    it("should allow governance to update redeem fee", async () => {
        await expectRevert(btcPlus.setRedeemFee("200", {from: strategist}), "not governance");
        await btcPlus.setRedeemFee("200");
        assert.strictEqual((await btcPlus.redeemFee()).toString(), "200");
    });
    
    it("should allow governance to update min liquidity ratio", async () => {
        await expectRevert(btcPlus.setMinLiquidityRatio("9990", {from: strategist}), "not governance");
        await btcPlus.setMinLiquidityRatio("9990");
        assert.strictEqual((await btcPlus.minLiquidityRatio()).toString(), "9990");
    });

    it("should allow governance to add pool", async () => {
        assert.strictEqual(await btcPlus.pools(token1.address), pool1.address);
        assert.strictEqual(await btcPlus.tokens(0), token1.address);
        assert.strictEqual(await btcPlus.pools(token2.address), pool2.address);
        assert.strictEqual(await btcPlus.tokens(1), token2.address);
        assert.strictEqual(await btcPlus.pools(token3.address), '0x0000000000000000000000000000000000000000');

        await expectRevert(btcPlus.addPool(token3.address, pool3.address, {from: strategist}), "not governance");
        await expectRevert(btcPlus.addPool(token3.address, pool2.address), "pool mismatch");
        await btcPlus.addPool(token3.address, pool3.address);
        assert.strictEqual(await btcPlus.pools(token3.address), pool3.address);
        assert.strictEqual(await btcPlus.tokens(2), token3.address);

        await expectRevert(btcPlus.addPool(token3.address, pool3.address), "pool exists");
    });

    it("should allow governance to remove pool", async () => {
        await expectRevert(btcPlus.removePool(token2.address, {from: strategist}), "not governance");
        await expectRevert(btcPlus.removePool(token3.address), "pool not exists");

        await btcPlus.addPool(token3.address, pool3.address);

        // Removes the first pool
        await btcPlus.removePool(token1.address);
        assert.strictEqual(await btcPlus.pools(token1.address), '0x0000000000000000000000000000000000000000');
        // Token 3 is moved from index 2 to index 0!
        // Token 2 is unchanged!
        assert.strictEqual(await btcPlus.tokens(0), token3.address);
        assert.strictEqual(await btcPlus.tokens(1), token2.address);

        // Removes the last pool
        await btcPlus.removePool(token3.address);
        assert.strictEqual(await btcPlus.pools(token3.address), '0x0000000000000000000000000000000000000000');
        assert.strictEqual(await btcPlus.tokens(0), token2.address);
    });

    it("should not allow to remove pool if its balance is non zero", async () => {
        await token2.mint(pool2.address, web3.utils.toWei("30"));
        await expectRevert(btcPlus.removePool(token2.address), "balance not zero");
        await token2.burn(pool2.address, web3.utils.toWei("30"));
        await btcPlus.removePool(token2.address);
    });

    it("should be able to mint", async () => {
        assert.strictEqual((await btcPlus.balanceOf(user1)).toString(), "0");
        assert.strictEqual((await btcPlus.totalSupply()).toString(), "0");

        // Mint 20 token1
        await token1.mint(user1, "20000000");
        await token1.approve(btcPlus.address, "20000000", {from: user1});
        // Mint 30 token2
        await token2.mint(user1, web3.utils.toWei("30"));
        await token2.approve(btcPlus.address, web3.utils.toWei("30"), {from: user1});

        await btcPlus.mint([token1.address, token2.address], ["20000000", web3.utils.toWei("30")], {from: user1});

        assert.strictEqual((await btcPlus.index()).toString(), web3.utils.toWei("1"));
        assert.strictEqual((await btcPlus.balanceOf(user1)).toString(), web3.utils.toWei("50"));
        assert.strictEqual((await btcPlus.totalSupply()).toString(), web3.utils.toWei("50"));
        assert.strictEqual((await btcPlus.userShare(user1)).toString(), web3.utils.toWei("50"));
        assert.strictEqual((await btcPlus.totalShares()).toString(), web3.utils.toWei("50"));

        assert.strictEqual((await token1.balanceOf(user1)).toString(), "0");
        assert.strictEqual((await token2.balanceOf(user1)).toString(), "0");
    });

    it("should rebase after harvest", async () => {
        // Mint 20 token1
        await token1.mint(user1, "20000000");
        await token1.approve(btcPlus.address, "20000000", {from: user1});
        // Mint 30 token2
        await token2.mint(user1, web3.utils.toWei("30"));
        await token2.approve(btcPlus.address, web3.utils.toWei("30"), {from: user1});
        // Mint 50 BTC+
        await btcPlus.mint([token1.address, token2.address], ["20000000", web3.utils.toWei("30")], {from: user1});
        // Deposit token1 and token2 into strategies
        await pool1.invest();
        await pool2.invest();
        // Harvest 6 token2(30 * 20%)
        await pool2.harvest();

        assert.strictEqual((await btcPlus.index()).toString(), web3.utils.toWei("1"));
        assert.strictEqual((await btcPlus.balanceOf(user1)).toString(), web3.utils.toWei("50"));
        assert.strictEqual((await btcPlus.totalSupply()).toString(), web3.utils.toWei("50"));
        assert.strictEqual((await btcPlus.userShare(user1)).toString(), web3.utils.toWei("50"));
        assert.strictEqual((await btcPlus.totalShares()).toString(), web3.utils.toWei("50"));

        await btcPlus.rebase();

        assert.strictEqual((await btcPlus.index()).toString(), web3.utils.toWei("1.12"));
        assert.strictEqual((await btcPlus.balanceOf(user1)).toString(), web3.utils.toWei("56"));
        assert.strictEqual((await btcPlus.totalSupply()).toString(), web3.utils.toWei("56"));
        assert.strictEqual((await btcPlus.userShare(user1)).toString(), web3.utils.toWei("50"));
        assert.strictEqual((await btcPlus.totalShares()).toString(), web3.utils.toWei("50"));
    });

    it("should mint after rebase", async () => {
        // Mint 20 token1 to user1
        await token1.mint(user1, "20000000");
        await token1.approve(btcPlus.address, "20000000", {from: user1});
        // Mint 30 token2 to user1
        await token2.mint(user1, web3.utils.toWei("30"));
        await token2.approve(btcPlus.address, web3.utils.toWei("30"), {from: user1});
        // Mint 50 BTC+ to user1
        await btcPlus.mint([token1.address, token2.address], ["20000000", web3.utils.toWei("30")], {from: user1});
        // Deposit token1 and token2 into strategies
        await pool1.invest();
        await pool2.invest();
        // Harvest 6 token2(30 * 20%)
        await pool2.harvest();
        await btcPlus.rebase();

        // Mint 5.6 token2 to user2
        await token2.mint(user2, web3.utils.toWei("5.6"));
        await token2.approve(btcPlus.address, web3.utils.toWei("5.6"), {from: user2});
        // Mint 5.6 BTC+ to user2
        await btcPlus.mint([token2.address, token1.address], [web3.utils.toWei("5.6"), 0], {from: user2});

        assert.strictEqual((await btcPlus.index()).toString(), web3.utils.toWei("1.12"));
        assert.strictEqual((await btcPlus.balanceOf(user2)).toString(), web3.utils.toWei("5.6"));
        assert.strictEqual((await btcPlus.totalSupply()).toString(), web3.utils.toWei("61.6"));
        assert.strictEqual((await btcPlus.userShare(user2)).toString(), web3.utils.toWei("5"));
        assert.strictEqual((await btcPlus.totalShares()).toString(), web3.utils.toWei("55"));
    }); 

    it("should redeem BTC+", async () => {
        // Mint 20 token1 to user1
        await token1.mint(user1, "20000000");
        await token1.approve(btcPlus.address, "20000000", {from: user1});
        // Mint 30 token2 to user1
        await token2.mint(user1, web3.utils.toWei("30"));
        await token2.approve(btcPlus.address, web3.utils.toWei("30"), {from: user1});
        // Mint 50 BTC+ to user1
        await btcPlus.mint([token1.address, token2.address], ["20000000", web3.utils.toWei("30")], {from: user1});
        // Deposit token1 and token2 into strategies
        await pool1.invest();
        await pool2.invest();
        // Harvest 2 token1 in strategy1
        await token1.mint(strategy1.address, "2000000");
        // Harvest 8 token2 in strategy2
        await token2.mint(strategy2.address, web3.utils.toWei("8"));
        await btcPlus.rebase();

        // Mint 6 token2 to user2
        await token2.mint(user2, web3.utils.toWei("6"));
        await token2.approve(btcPlus.address, web3.utils.toWei("6"), {from: user2});
        // Mint 6 BTC+ to user2
        await btcPlus.mint([token2.address, token1.address], [web3.utils.toWei("6"), 0], {from: user2});
        assert.strictEqual((await btcPlus.index()).toString(), web3.utils.toWei("1.2"));
        assert.strictEqual((await btcPlus.balanceOf(user2)).toString(), web3.utils.toWei("6"));
        assert.strictEqual((await btcPlus.totalSupply()).toString(), web3.utils.toWei("66"));
        assert.strictEqual((await btcPlus.userShare(user2)).toString(), web3.utils.toWei("5"));
        assert.strictEqual((await btcPlus.totalShares()).toString(), web3.utils.toWei("55"));
        assert.strictEqual((await token1.balanceOf(user2)).toString(), "0");
        assert.strictEqual((await token2.balanceOf(user2)).toString(), "0");

        // Redeems 2.4 BTC+ from user2
        await btcPlus.redeem(web3.utils.toWei("2.4"), {from: user2});
        assert.strictEqual((await btcPlus.index()).toString(), web3.utils.toWei("1.2"));
        assert.strictEqual((await btcPlus.balanceOf(user2)).toString(), web3.utils.toWei("3.6"));
        assert.strictEqual((await btcPlus.totalSupply()).toString(), web3.utils.toWei("63.6"));
        assert.strictEqual((await btcPlus.userShare(user2)).toString(), web3.utils.toWei("3"));
        assert.strictEqual((await btcPlus.totalShares()).toString(), web3.utils.toWei("53"));

        // User2 should get 0.8 token1 and 1.6 token2
        assert.strictEqual((await token1.balanceOf(user2)).toString(), "800000");
        assert.strictEqual((await token2.balanceOf(user2)).toString(), web3.utils.toWei("1.6"));
    });
});
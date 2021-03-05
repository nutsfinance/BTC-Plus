const { expectRevert } = require('@openzeppelin/test-helpers');
const assert = require('assert');
const SinglePlus = artifacts.require("SinglePlus");
const MockToken = artifacts.require("MockToken");
const MockStrategy = artifacts.require("MockStrategy");

const MAX = web3.utils.toBN(2).pow(web3.utils.toBN(256)).sub(web3.utils.toBN(1));
const toWei = web3.utils.toWei;

contract("SinglePlus", async ([owner, strategist, user1, user2, user3]) => {
    let token;
    let plus;
    let strategy;

    beforeEach(async () => {
        token = await MockToken.new("Mock Token", "mToken", 6);
        plus = await SinglePlus.new();
        await plus.initialize(token.address, '', '');
        await plus.setStrategist(strategist, true);
        strategy = await MockStrategy.new();
        await strategy.initialize(plus.address);
        await plus.approveStrategy(strategy.address, true);
    });

    it("should initialize", async () => {
        assert.strictEqual(await plus.governance(), owner);
        assert.strictEqual(await plus.treasury(), owner);
        assert.strictEqual(await plus.strategists(strategist), true);
        assert.strictEqual(await plus.strategists(user1), false);
        assert.strictEqual(await plus.name(), "Mock Token Plus");
        assert.strictEqual(await plus.symbol(), "mToken+");
    });

    it("should have set active strategy", async () => {
        assert.strictEqual(await plus.strategies(strategy.address), true);
        assert.strictEqual(await plus.activeStrategy(), strategy.address);
    });

    it("should not allow to approve strategy other than governance", async () => {
        const strategy2 = await MockStrategy.new();
        await strategy2.initialize(plus.address);
        await expectRevert(plus.approveStrategy(strategy2.address, true, {from: strategist}), "not governance");
        await expectRevert(plus.approveStrategy(strategy2.address, false, {from: strategist}), "not governance");
    });

    it("should allow governance to approve strategy", async () => {
        const strategy2 = await MockStrategy.new();
        await strategy2.initialize(plus.address);
        await plus.approveStrategy(strategy2.address, false);
        assert.strictEqual(await plus.strategies(strategy2.address), true);
        assert.strictEqual(await plus.activeStrategy(), strategy.address);

        const strategy3 = await MockStrategy.new();
        await strategy3.initialize(plus.address);
        await plus.approveStrategy(strategy3.address, true);
        assert.strictEqual(await plus.strategies(strategy3.address), true);
        assert.strictEqual(await plus.activeStrategy(), strategy3.address);
    });

    it("should not allow to revoke strategy other than strategist", async () => {
        await expectRevert(plus.revokeStrategy(strategy.address, {from: user2}), "not strategist");
    });

    it("should only allow strategist to revoke approved strategy", async () => {
        await expectRevert(plus.revokeStrategy(user3), "not approved");
    });

    it("should allow strategist to revoke strategy", async () => {
        await plus.revokeStrategy(strategy.address, {from: strategist});
        assert.strictEqual(await plus.strategies(strategy.address), false);
        assert.strictEqual(await plus.activeStrategy(), '0x0000000000000000000000000000000000000000');
    });

    it("should not allow to set active strategy other than strategist", async () => {
        const strategy2 = await MockStrategy.new();
        await strategy2.initialize(plus.address);
        await expectRevert(plus.setActiveStrategy(strategy2.address, {from: user2}), "not strategist");
    });

    it("should allow to set approved strategies as active", async () => {
        const strategy2 = await MockStrategy.new();
        await strategy2.initialize(plus.address);
        await expectRevert(plus.setActiveStrategy(strategy2.address), "not approved");

        await plus.approveStrategy(strategy2.address, false);
        assert.strictEqual(await plus.strategies(strategy2.address), true);
        assert.strictEqual(await plus.activeStrategy(), strategy.address);
        
        await plus.setActiveStrategy(strategy2.address);
        assert.strictEqual(await plus.activeStrategy(), strategy2.address);
    });

    it("should not allow to invest or harvest other than strategist", async () => {
        await expectRevert(plus.invest({from: user3}), "not strategist");
        await expectRevert(plus.harvest({from: user3}), "not strategist");
    });

    it("should be able to mint", async () => {
        await token.mint(user1, "6000000");
        await token.approve(plus.address, "6000000", {from: user1});
        assert.strictEqual((await plus.getMintAmount("6000000")).toString(), toWei("6"));
        await plus.mint("6000000", {from: user1});

        assert.strictEqual((await plus.index()).toString(), toWei("1"));
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("6"));
        assert.strictEqual((await plus.totalShares()).toString(), toWei("6"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("6"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("6"));
        assert.strictEqual((await plus.underlying(toWei("6"))).toString(), toWei("6"));
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1"));

        await plus.invest();

        assert.strictEqual((await plus.index()).toString(), toWei("1"));
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("6"));
        assert.strictEqual((await plus.totalShares()).toString(), toWei("6"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("6"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("6"));
        assert.strictEqual((await plus.underlying(toWei("6"))).toString(), toWei("6"));
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1"));

        await plus.harvest();

        assert.strictEqual((await plus.index()).toString(), toWei("1.2"));
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("7.2"));
        assert.strictEqual((await plus.totalShares()).toString(), toWei("6"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("6"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("7.2"));
        assert.strictEqual((await plus.userShare(user3)).toString(), toWei("0"));
        assert.strictEqual((await plus.balanceOf(user3)).toString(), toWei("0"));
        assert.strictEqual((await plus.underlying(toWei("7.2"))).toString(), toWei("7.2"));
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1"));

        await token.mint(user3, "3600000");
        await token.approve(plus.address, "3600000", {from: user3});
        assert.strictEqual((await plus.getMintAmount("3600000")).toString(), toWei("3.6"));
        await plus.mint("3600000", {from: user3});

        assert.strictEqual((await plus.index()).toString(), toWei("1.2"));
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("10.8"));
        assert.strictEqual((await plus.totalShares()).toString(), toWei("9"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("6"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("7.2"));
        assert.strictEqual((await plus.userShare(user3)).toString(), toWei("3"));
        assert.strictEqual((await plus.balanceOf(user3)).toString(), toWei("3.6"));
        assert.strictEqual((await plus.underlying(toWei("10.8"))).toString(), toWei("10.8"));
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1"));

    });

    it("should be able to redeem", async () => {
        await plus.setRedeemFee("100"); // 1% redeem fee
        await token.mint(user1, "6000000");
        await token.approve(plus.address, "6000000", {from: user1});
        await plus.mint("6000000", {from: user1});

        await plus.invest();
        await plus.harvest();

        await token.mint(user3, "3600000");
        await token.approve(plus.address, "3600000", {from: user3});
        await plus.mint("3600000", {from: user3});

        await plus.invest();

        assert.strictEqual((await plus.index()).toString(), toWei("1.2"));
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("10.8"));
        assert.strictEqual((await plus.totalShares()).toString(), toWei("9"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("6"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("7.2"));
        assert.strictEqual((await plus.userShare(user3)).toString(), toWei("3"));
        assert.strictEqual((await plus.balanceOf(user3)).toString(), toWei("3.6"));
        assert.strictEqual((await plus.totalUnderlying()).toString(), toWei("10.8"));
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1"));
        assert.strictEqual((await token.balanceOf(user1)).toString(), "0");
        assert.strictEqual((await token.balanceOf(plus.address)).toString(), "0");
        assert.strictEqual((await token.balanceOf(strategy.address)).toString(), "10800000");

        const redeemAmount = await plus.getRedeemAmount(toWei("2.4"));   // plus token has 18 decimals
        assert.strictEqual(redeemAmount[0].toString(), "2376000"); // redeem amount has 6 decimals
        assert.strictEqual(redeemAmount[1].toString(), toWei("0.024000"));    // fee is in 18 decimals

        await plus.redeem(toWei("2.4"), {from: user1});

        assert.strictEqual((await plus.index()).toString(), toWei("1.2"));
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("8.4"));
        assert.strictEqual((await plus.totalShares()).toString(), toWei("7"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("4"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("4.8"));
        assert.strictEqual((await plus.userShare(user3)).toString(), toWei("3"));
        assert.strictEqual((await plus.balanceOf(user3)).toString(), toWei("3.6"));
        assert.strictEqual((await plus.totalUnderlying()).toString(), toWei("8.424"));   // 0.024 fee remains!
        assert.strictEqual((await plus.liquidityRatio()).toString(), "1002857142857142857");
        assert.strictEqual((await token.balanceOf(user1)).toString(), "2376000");
        assert.strictEqual((await token.balanceOf(plus.address)).toString(), "0");
        assert.strictEqual((await token.balanceOf(strategy.address)).toString(), "8424000");

        await plus.rebase();

        assert.strictEqual((await plus.index()).toString(), "1203428571428571428"); // 8.424 * 10**18 / 7
        assert.strictEqual((await plus.totalSupply()).toString(), "8423999999999999996");   // ~ 8.424
        assert.strictEqual((await plus.totalShares()).toString(), toWei("7"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("4"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), "4813714285714285712");
        assert.strictEqual((await plus.userShare(user3)).toString(), toWei("3"));
        assert.strictEqual((await plus.balanceOf(user3)).toString(), "3610285714285714284");
        assert.strictEqual((await plus.totalUnderlying()).toString(), toWei("8.424"));   // 0.024 fee remains!
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1"));
        assert.strictEqual((await token.balanceOf(user1)).toString(), "2376000");
        assert.strictEqual((await token.balanceOf(plus.address)).toString(), "0");
        assert.strictEqual((await token.balanceOf(strategy.address)).toString(), "8424000");
    });

    it("should be able to redeem all", async () => {
        await plus.setRedeemFee("100"); // 1% redeem fee
        await token.mint(user1, "6000000");
        await token.approve(plus.address, "6000000", {from: user1});
        await plus.mint("6000000", {from: user1});

        await plus.invest();
        await plus.harvest();

        await token.mint(user3, "3600000");
        await token.approve(plus.address, "3600000", {from: user3});
        await plus.mint("3600000", {from: user3});

        await plus.invest();

        assert.strictEqual((await plus.index()).toString(), toWei("1.2"));
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("10.8"));
        assert.strictEqual((await plus.totalShares()).toString(), toWei("9"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("6"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("7.2"));
        assert.strictEqual((await plus.userShare(user3)).toString(), toWei("3"));
        assert.strictEqual((await plus.balanceOf(user3)).toString(), toWei("3.6"));
        assert.strictEqual((await plus.totalUnderlying()).toString(), toWei("10.8"));
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1"));
        assert.strictEqual((await token.balanceOf(user1)).toString(), "0");
        assert.strictEqual((await token.balanceOf(plus.address)).toString(), "0");
        assert.strictEqual((await token.balanceOf(strategy.address)).toString(), "10800000");

        await plus.redeem(MAX, {from: user1});

        assert.strictEqual((await plus.index()).toString(), toWei("1.2"));
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("3.6"));
        assert.strictEqual((await plus.totalShares()).toString(), toWei("3"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("0"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("0"));
        assert.strictEqual((await plus.userShare(user3)).toString(), toWei("3"));
        assert.strictEqual((await plus.balanceOf(user3)).toString(), toWei("3.6"));
        assert.strictEqual((await plus.totalUnderlying()).toString(), toWei("3.672"));   // 0.072 fee remains!
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1.02"));    // 3.672 / 3.6 = 1.02
        assert.strictEqual((await token.balanceOf(user1)).toString(), "7128000");
        assert.strictEqual((await token.balanceOf(plus.address)).toString(), "0");
        assert.strictEqual((await token.balanceOf(strategy.address)).toString(), "3672000");

        await plus.rebase();

        assert.strictEqual((await plus.index()).toString(), toWei("1.224")); // 8.424 * 10**18 / 7
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("3.672"));   // ~ 8.424
        assert.strictEqual((await plus.totalShares()).toString(), toWei("3"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("0"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("0"));
        assert.strictEqual((await plus.userShare(user3)).toString(), toWei("3"));
        assert.strictEqual((await plus.balanceOf(user3)).toString(), toWei("3.672"));
        assert.strictEqual((await plus.totalUnderlying()).toString(), toWei("3.672"));   // 0.024 fee remains!
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1"));
        assert.strictEqual((await token.balanceOf(user1)).toString(), "7128000");
        assert.strictEqual((await token.balanceOf(plus.address)).toString(), "0");
        assert.strictEqual((await token.balanceOf(strategy.address)).toString(), "3672000");
    });
});
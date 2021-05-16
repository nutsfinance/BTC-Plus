const { expectRevert } = require('@openzeppelin/test-helpers');
const assert = require('assert');
const MockSinglePlus = artifacts.require("MockSinglePlus");
const MockReward = artifacts.require("MockReward");
const MockToken = artifacts.require("MockToken");

const MAX = web3.utils.toBN(2).pow(web3.utils.toBN(256)).sub(web3.utils.toBN(1));
const toWei = web3.utils.toWei;

contract("SinglePlus", async ([owner, strategist, user1, user2, user3, treasury]) => {
    let token;
    let plus;
    let reward;

    beforeEach(async () => {
        token = await MockToken.new("Mock Token", "mToken", 6);
        plus = await MockSinglePlus.new(token.address);
        await plus.setStrategist(strategist, true);
        await plus.setTreasury(treasury);
        reward = await MockReward.at(await plus.reward());
    });

    it("should initialize", async () => {
        assert.strictEqual(await plus.governance(), owner);
        assert.strictEqual(await plus.treasury(), treasury);
        assert.strictEqual(await plus.strategists(strategist), true);
        assert.strictEqual(await plus.strategists(user1), false);
        assert.strictEqual(await plus.name(), "Mock Token Plus");
        assert.strictEqual(await plus.symbol(), "mToken+");
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
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1"));

        await plus.invest();

        assert.strictEqual((await plus.index()).toString(), toWei("1"));
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("6"));
        assert.strictEqual((await plus.totalShares()).toString(), toWei("6"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("6"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("6"));
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1"));

        await plus.harvest();

        assert.strictEqual((await plus.index()).toString(), toWei("1.2"));
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("7.2"));
        assert.strictEqual((await plus.totalShares()).toString(), toWei("6"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("6"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("7.2"));
        assert.strictEqual((await plus.userShare(user3)).toString(), toWei("0"));
        assert.strictEqual((await plus.balanceOf(user3)).toString(), toWei("0"));
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
        assert.strictEqual((await plus.userShare(treasury)).toString(), toWei("0"));
        assert.strictEqual((await plus.balanceOf(treasury)).toString(), toWei("0"));
        assert.strictEqual((await plus.totalUnderlying()).toString(), toWei("10.8"));
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1"));
        assert.strictEqual((await token.balanceOf(user1)).toString(), "0");
        assert.strictEqual((await token.balanceOf(treasury)).toString(), "0");
        assert.strictEqual((await token.balanceOf(plus.address)).toString(), "0");
        assert.strictEqual((await token.balanceOf(reward.address)).toString(), "10800000");

        const redeemAmount = await plus.getRedeemAmount(toWei("2.4"));   // plus token has 18 decimals
        assert.strictEqual(redeemAmount[0].toString(), "2376000"); // redeem amount has 6 decimals
        // 2.4 * 1% = 0.024
        // 2.4 - 0.024 = 2.376
        assert.strictEqual(redeemAmount[1].toString(), toWei("0.024000"));    // fee is in 18 decimals

        await plus.redeem(toWei("2.4"), {from: user1});

        assert.strictEqual((await plus.index()).toString(), toWei("1.2"));
        // 10.8 - 2.4 + 0.024 = 8.424
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("8.424"));
        // 9 - 2 + 0.024 / 1.2 = 7.02
        assert.strictEqual((await plus.totalShares()).toString(), toWei("7.02"));
        // 6 - 2 = 4
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("4"));
        // 7.2 - 2.4 = 4.8
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("4.8"));
        assert.strictEqual((await plus.userShare(user3)).toString(), toWei("3"));
        assert.strictEqual((await plus.balanceOf(user3)).toString(), toWei("3.6"));
        assert.strictEqual((await plus.userShare(treasury)).toString(), toWei("0.02"));
        assert.strictEqual((await plus.balanceOf(treasury)).toString(), toWei("0.024"));
        assert.strictEqual((await plus.totalUnderlying()).toString(), toWei("8.424"));   // 0.024 fee remains!
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1"));
        assert.strictEqual((await token.balanceOf(user1)).toString(), "2376000");
        assert.strictEqual((await token.balanceOf(treasury)).toString(), "0");
        // No token is left in plus
        assert.strictEqual((await token.balanceOf(plus.address)).toString(), "0");
        // Only withdraws 2.376 tokens from rewards
        assert.strictEqual((await token.balanceOf(reward.address)).toString(), "8424000");

        await plus.rebase();

        assert.strictEqual((await plus.index()).toString(), toWei("1.2"));
        // 10.8 - 2.4 + 0.024 = 8.424
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("8.424"));
        // 9 - 2 + 0.024 / 1.2 = 7.02
        assert.strictEqual((await plus.totalShares()).toString(), toWei("7.02"));
        // 6 - 2 = 4
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("4"));
        // 7.2 - 2.4 = 4.8
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("4.8"));
        assert.strictEqual((await plus.userShare(user3)).toString(), toWei("3"));
        assert.strictEqual((await plus.balanceOf(user3)).toString(), toWei("3.6"));
        assert.strictEqual((await plus.userShare(treasury)).toString(), toWei("0.02"));
        assert.strictEqual((await plus.balanceOf(treasury)).toString(), toWei("0.024"));
        assert.strictEqual((await plus.totalUnderlying()).toString(), toWei("8.424"));   // 0.024 fee remains!
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1"));
        assert.strictEqual((await token.balanceOf(user1)).toString(), "2376000");
        assert.strictEqual((await token.balanceOf(treasury)).toString(), "0");
        // No token is left in plus
        assert.strictEqual((await token.balanceOf(plus.address)).toString(), "0");
        // Only withdraws 2.376 tokens from rewards
        assert.strictEqual((await token.balanceOf(reward.address)).toString(), "8424000");
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
        assert.strictEqual((await plus.userShare(treasury)).toString(), toWei("0"));
        assert.strictEqual((await plus.balanceOf(treasury)).toString(), toWei("0"));
        assert.strictEqual((await plus.totalUnderlying()).toString(), toWei("10.8"));
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1"));
        assert.strictEqual((await token.balanceOf(user1)).toString(), "0");
        assert.strictEqual((await token.balanceOf(treasury)).toString(), "0");
        assert.strictEqual((await token.balanceOf(plus.address)).toString(), "0");
        assert.strictEqual((await token.balanceOf(reward.address)).toString(), "10800000");

        // User1 redeems 7.2
        await plus.redeem(MAX, {from: user1});

        assert.strictEqual((await plus.index()).toString(), toWei("1.2"));
        // 10.8 - 7.2 + 0.072 = 3.672
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("3.672"));
        // 9 - 6 + 0.072 / 1.2 = 3.06
        assert.strictEqual((await plus.totalShares()).toString(), toWei("3.06"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("0"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("0"));
        assert.strictEqual((await plus.userShare(user3)).toString(), toWei("3"));
        assert.strictEqual((await plus.balanceOf(user3)).toString(), toWei("3.6"));
        assert.strictEqual((await plus.userShare(treasury)).toString(), toWei("0.06"));
        assert.strictEqual((await plus.balanceOf(treasury)).toString(), toWei("0.072"));
        assert.strictEqual((await plus.totalUnderlying()).toString(), toWei("3.672"));   // 0.024 fee remains!
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1"));
        // 7.2 - 0.072 = 7.128
        assert.strictEqual((await token.balanceOf(user1)).toString(), "7128000");
        assert.strictEqual((await token.balanceOf(treasury)).toString(), "0");
        // No token is left in plus
        assert.strictEqual((await token.balanceOf(plus.address)).toString(), "0");
        // Only withdraws 7.128 tokens from rewards
        assert.strictEqual((await token.balanceOf(reward.address)).toString(), "3672000");

        await plus.rebase();

        assert.strictEqual((await plus.index()).toString(), toWei("1.2"));
        // 10.8 - 7.2 + 0.072 = 3.672
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("3.672"));
        // 9 - 6 + 0.072 / 1.2 = 3.06
        assert.strictEqual((await plus.totalShares()).toString(), toWei("3.06"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("0"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("0"));
        assert.strictEqual((await plus.userShare(user3)).toString(), toWei("3"));
        assert.strictEqual((await plus.balanceOf(user3)).toString(), toWei("3.6"));
        assert.strictEqual((await plus.userShare(treasury)).toString(), toWei("0.06"));
        assert.strictEqual((await plus.balanceOf(treasury)).toString(), toWei("0.072"));
        assert.strictEqual((await plus.totalUnderlying()).toString(), toWei("3.672"));   // 0.024 fee remains!
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1"));
        // 7.2 - 0.072 = 7.128
        assert.strictEqual((await token.balanceOf(user1)).toString(), "7128000");
        assert.strictEqual((await token.balanceOf(treasury)).toString(), "0");
        // No token is left in plus
        assert.strictEqual((await token.balanceOf(plus.address)).toString(), "0");
        // Only withdraws 7.128 tokens from rewards
        assert.strictEqual((await token.balanceOf(reward.address)).toString(), "3672000");
    });
});
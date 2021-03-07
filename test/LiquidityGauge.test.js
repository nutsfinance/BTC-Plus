const { expectRevert, BN, time } = require('@openzeppelin/test-helpers');
const assert = require('assert');
const LiquidityGauge = artifacts.require("LiquidityGauge");
const MockGaugeController = artifacts.require("MockGaugeController");
const MockToken = artifacts.require("MockToken");
const MockVotingEscrow = artifacts.require("MockVotingEscrow");
const MockReward = artifacts.require("MockReward");

async function timeIncreaseTo (seconds) {
    const delay = 10 - new Date().getMilliseconds();
    await new Promise(resolve => setTimeout(resolve, delay));
    await time.increaseTo(seconds);
}
const MAX = web3.utils.toBN(2).pow(web3.utils.toBN(256)).sub(web3.utils.toBN(1));
const assertAlmostEqual = function(expectedOrig, actualOrig) {
    const _1e18 = new BN('10').pow(new BN('18'));
    const expected = new BN(expectedOrig).div(_1e18).toNumber();
    const actual = new BN(actualOrig).div(_1e18).toNumber();

    assert.ok(Math.abs(expected - actual) <= 2, `Expected ${expected}, actual ${actual}`);
}
const toWei = web3.utils.toWei;

contract("LiquidityGauge", async ([owner, governance, claimer, user1, user2, user3]) => {
    let gauge;
    let token;
    let reward;
    let controller;
    let voting;
    let rewards;
    let rewardTokens;
    let rewardContract;

    beforeEach(async () => {
        reward = await MockToken.new("Mock Reward", "mReward", 18);
        token = await MockToken.new("Mock Token", "mToken", 18);
        controller = await MockGaugeController.new(reward.address, governance, claimer);
        voting = await MockVotingEscrow.new();
        gauge = await LiquidityGauge.new();
        await gauge.initialize(token.address, controller.address, voting.address);

        rewards = [
            await MockToken.new("Mock Reward 1", "mRewards-1", 18),
            await MockToken.new("Mock Reward 2", "mRewards-2", 18),
            await MockToken.new("Mock Reward 3", "mRewards-3", 18),
        ];
        rewardTokens = rewards.map(token => token.address);
        rewardContract = await MockReward.new(token.address, rewardTokens);
    });

    it("should initialize", async () => {
        assert.strictEqual(await gauge.token(), token.address);
        assert.strictEqual(await gauge.reward(), reward.address);
        assert.strictEqual(await gauge.name(), "Mock Token Gauge Deposit");
        assert.strictEqual(await gauge.symbol(), "mToken-gauge");
        assert.strictEqual(await gauge.votingEscrow(), voting.address);
        assert.strictEqual(await gauge.controller(), controller.address);
    });

    it("should allow governance to update withdraw fee", async () => {
        await expectRevert(gauge.setWithdrawFee("9900"), "not governance");
        await gauge.setWithdrawFee("9900", {from: governance});
        assert.strictEqual((await gauge.withdrawFee()).toString(), "9900");
    });

    it("should allow governance to set rewards", async () => {
        await expectRevert(gauge.setRewards(rewardContract.address, rewardTokens), "not governance");
        await gauge.setRewards(rewardContract.address, rewardTokens, {from: governance});
        assert.strictEqual(await gauge.rewardContract(), rewardContract.address);
        assert.strictEqual(await gauge.rewardTokens(0), rewardTokens[0]);
        assert.strictEqual(await gauge.rewardTokens(1), rewardTokens[1]);
        assert.strictEqual(await gauge.rewardTokens(2), rewardTokens[2]);
    });

    it("should be able to set new reward contract", async () => {
        await gauge.setRewards(rewardContract.address, rewardTokens, {from: governance});
        await token.mint(user1, toWei("40"));
        await token.approve(gauge.address, toWei("40"), {from: user1});
        await gauge.deposit(toWei("40"), {from: user1});

        const rewardContract2 = await MockReward.new(token.address, rewardTokens);
        await gauge.setRewards(rewardContract2.address, rewardTokens, {from: governance});
        assert.strictEqual(await gauge.rewardContract(), rewardContract2.address);
        assert.strictEqual(await gauge.rewardTokens(0), rewardTokens[0]);
        assert.strictEqual(await gauge.rewardTokens(1), rewardTokens[1]);
        assert.strictEqual(await gauge.rewardTokens(2), rewardTokens[2]);

        assert.strictEqual((await gauge.totalSupply()).toString(), toWei("40"));
        assert.strictEqual((await gauge.balanceOf(user1)).toString(), toWei("40"));
        assert.strictEqual((await token.balanceOf(gauge.address)).toString(), toWei("0"));
        // The token is staked into reward contract now.
        assert.strictEqual((await token.balanceOf(rewardContract.address)).toString(), toWei("0"));
        assert.strictEqual((await token.balanceOf(rewardContract2.address)).toString(), toWei("40"));
    });

    it("should deposit and stake", async () => {
        await gauge.setRewards(rewardContract.address, rewardTokens, {from: governance});
        await token.mint(user1, toWei("40"));
        await token.approve(gauge.address, toWei("40"), {from: user1});
        await gauge.deposit(toWei("40"), {from: user1});

        assert.strictEqual((await gauge.totalSupply()).toString(), toWei("40"));
        assert.strictEqual((await gauge.balanceOf(user1)).toString(), toWei("40"));
        assert.strictEqual((await token.balanceOf(gauge.address)).toString(), toWei("0"));
        // The token is staked into reward contract now.
        assert.strictEqual((await token.balanceOf(rewardContract.address)).toString(), toWei("40"));

        // Generate 20 reward token 1, 30 reward token 2, 40 reward token 3
        await rewardContract.setAmount(rewardTokens[0], toWei("20"));
        await rewardContract.setAmount(rewardTokens[1], toWei("30"));
        await rewardContract.setAmount(rewardTokens[2], toWei("40"));
        await gauge.claimRewards(user1);
        // 20 tokens distributed to 40 total supply
        assert.strictEqual((await gauge.rewardIntegral(rewardTokens[0])).toString(), toWei("0.5"));
        assert.strictEqual((await gauge.rewardIntegral(rewardTokens[1])).toString(), toWei("0.75"));
        assert.strictEqual((await gauge.rewardIntegral(rewardTokens[2])).toString(), toWei("1"));

        assert.strictEqual((await gauge.rewardIntegralOf(rewardTokens[0], user1)).toString(), toWei("0.5"));
        assert.strictEqual((await gauge.rewardIntegralOf(rewardTokens[1], user1)).toString(), toWei("0.75"));
        assert.strictEqual((await gauge.rewardIntegralOf(rewardTokens[2], user1)).toString(), toWei("1"));
        
        assert.strictEqual((await rewards[0].balanceOf(user1)).toString(), toWei("20"));
        assert.strictEqual((await rewards[1].balanceOf(user1)).toString(), toWei("30"));
        assert.strictEqual((await rewards[2].balanceOf(user1)).toString(), toWei("40"));
    });

    it("should be able to get rewards", async () => {
        await gauge.setRewards(rewardContract.address, rewardTokens, {from: governance});
        await token.mint(user1, toWei("40"));
        await token.approve(gauge.address, toWei("40"), {from: user1});
        await gauge.deposit(toWei("40"), {from: user1});

        // Generate 20 reward token 1, 30 reward token 2, 40 reward token 3
        await rewardContract.setAmount(rewardTokens[0], toWei("20"));
        await rewardContract.setAmount(rewardTokens[1], toWei("30"));
        await rewardContract.setAmount(rewardTokens[2], toWei("40"));
        await gauge.claimRewards(user1);

        // Clears the rewards first since deposit triggers another checkpointRewards!
        await rewardContract.setAmount(rewardTokens[0], toWei("0"));
        await rewardContract.setAmount(rewardTokens[1], toWei("0"));
        await rewardContract.setAmount(rewardTokens[2], toWei("0"));

        await token.mint(user2, toWei("60"));
        await token.approve(gauge.address, toWei("60"), {from: user2});
        await gauge.deposit(toWei("60"), {from: user2});

        // Generate 15 reward token 1, 25 reward token 2, 35 reward token 3
        await rewardContract.setAmount(rewardTokens[0], toWei("15"));
        await rewardContract.setAmount(rewardTokens[1], toWei("25"));
        await rewardContract.setAmount(rewardTokens[2], toWei("35"));
        await gauge.claimRewards(user2);

        // 20 / 40 + 15 / 100  = 0.65
        assert.strictEqual((await gauge.rewardIntegral(rewardTokens[0])).toString(), toWei("0.65"));
        // 30 / 40 + 25 / 100 = 1
        assert.strictEqual((await gauge.rewardIntegral(rewardTokens[1])).toString(), toWei("1"));
        // 40 / 40 + 35 / 100 = 1.35
        assert.strictEqual((await gauge.rewardIntegral(rewardTokens[2])).toString(), toWei("1.35"));

        assert.strictEqual((await gauge.rewardIntegralOf(rewardTokens[0], user1)).toString(), toWei("0.5"));
        assert.strictEqual((await gauge.rewardIntegralOf(rewardTokens[1], user1)).toString(), toWei("0.75"));
        assert.strictEqual((await gauge.rewardIntegralOf(rewardTokens[2], user1)).toString(), toWei("1"));
        assert.strictEqual((await gauge.rewardIntegralOf(rewardTokens[0], user2)).toString(), toWei("0.65"));
        assert.strictEqual((await gauge.rewardIntegralOf(rewardTokens[1], user2)).toString(), toWei("1"));
        assert.strictEqual((await gauge.rewardIntegralOf(rewardTokens[2], user2)).toString(), toWei("1.35"));

        // 15 * 0.4 = 6  <==>  (0.65 - 0.5) * 40 = 6
        assert.strictEqual((await gauge.claimableReward(user1, rewardTokens[0])).toString(), toWei("6"));
        // 25 * 0.4 = 10  <==> (1 - 0.75) * 40 = 10
        assert.strictEqual((await gauge.claimableReward(user1, rewardTokens[1])).toString(), toWei("10"));
        // 35 * 0.4 = 14 <==> (1.35 - 1) * 40 = 14
        assert.strictEqual((await gauge.claimableReward(user1, rewardTokens[2])).toString(), toWei("14"));
        assert.strictEqual((await gauge.claimableReward(user2, rewardTokens[0])).toString(), toWei("0"));
        assert.strictEqual((await gauge.claimableReward(user2, rewardTokens[1])).toString(), toWei("0"));
        assert.strictEqual((await gauge.claimableReward(user2, rewardTokens[2])).toString(), toWei("0"));

        assert.strictEqual((await rewards[0].balanceOf(user1)).toString(), toWei("20"));
        assert.strictEqual((await rewards[1].balanceOf(user1)).toString(), toWei("30"));
        assert.strictEqual((await rewards[2].balanceOf(user1)).toString(), toWei("40"));

        // 15 * 0.6 = 9
        assert.strictEqual((await rewards[0].balanceOf(user2)).toString(), toWei("9"));
        // 25 * 0.6 = 15
        assert.strictEqual((await rewards[1].balanceOf(user2)).toString(), toWei("15"));
        // 35 * 0.6 = 21
        assert.strictEqual((await rewards[2].balanceOf(user2)).toString(), toWei("21"));
    });
    it("should set working balances", async () => {
        await gauge.setRewards(rewardContract.address, rewardTokens, {from: governance});
        // user1 stakes 40
        await token.mint(user1, toWei("40"));
        await token.approve(gauge.address, toWei("40"), {from: user1});
        await gauge.deposit(toWei("40"), {from: user1});

        // user2 stakes 60
        await token.mint(user2, toWei("60"));
        await token.approve(gauge.address, toWei("60"), {from: user2});
        await gauge.deposit(toWei("60"), {from: user2});

        assert.strictEqual((await gauge.workingSupply()).toString(), toWei("40"));
        assert.strictEqual((await gauge.workingBalances(user1)).toString(), toWei("16"));
        assert.strictEqual((await gauge.workingBalances(user2)).toString(), toWei("24"));

        // Increase voting escrow
        await voting.setTotalSupply(toWei("60"));
        await voting.setBalance(user1, toWei("15"));
        await gauge.claim(user1, true, {from: user1});
        assert.strictEqual((await gauge.workingSupply()).toString(), toWei("55"));
        assert.strictEqual((await gauge.workingBalances(user1)).toString(), toWei("31"));
        assert.strictEqual((await gauge.workingBalances(user2)).toString(), toWei("24"));

        // Increase voting escrow
        await voting.setBalance(user1, toWei("30"));
        await gauge.claim(user1, false, {from: user1});
        assert.strictEqual((await gauge.workingSupply()).toString(), toWei("64"));
        assert.strictEqual((await gauge.workingBalances(user1)).toString(), toWei("40"));
        assert.strictEqual((await gauge.workingBalances(user2)).toString(), toWei("24"));
    });
    it("should distribute rewards", async () => {
        let startTime = await time.latest();
        let now = await time.latest();
        await timeIncreaseTo(startTime);
        // NOTE: rate is in WAD!
        await controller.setRate(toWei(toWei("0.001")));
        // Must use checkpoint to read the new gauge rate!
        await gauge.checkpoint();

        // user1 stakes 40
        await token.mint(user1, toWei("40"));
        await token.approve(gauge.address, toWei("40"), {from: user1});
        await gauge.deposit(toWei("40"), {from: user1});

        // After 5000 s
        // 0.001 * 5000 = 5
        await timeIncreaseTo(startTime.addn(5000));
        assert.strictEqual((await gauge.rate()).toString(), toWei(toWei("0.001")));
        assert.strictEqual((await gauge.integral()).toString(), toWei("0"));
        assert.strictEqual((await gauge.integralOf(user1)).toString(), "0");
        assert.strictEqual((await gauge.checkpointOf(user1)).toString(), "0");
        assert.strictEqual((await gauge.claimable(user1)).toString(), "0");
        assert.strictEqual((await reward.balanceOf(user1)).toString(), "0");

        // user2 stakes 60
        await token.mint(user2, toWei("60"));
        await token.approve(gauge.address, toWei("60"), {from: user2});
        await gauge.deposit(toWei("60"), {from: user2});
        now = await time.latest();
        // The first checkpoint happens after user2 deposit!
        assert.strictEqual((await gauge.rate()).toString(), toWei(toWei("0.001")));
        // 5 / 16 = 0.3125
        assertAlmostEqual((await gauge.integral()).toString(), toWei("0.3125"));

        assert.strictEqual((await gauge.integralOf(user1)).toString(), "0");
        assert.strictEqual((await gauge.checkpointOf(user1)).toString(), "0");
        // user1 gets 5
        assertAlmostEqual((await gauge.claimable(user1)).toString(), toWei("5"));
        assert.strictEqual((await reward.balanceOf(user1)).toString(), "0");
        assert.strictEqual((await controller.claimed(gauge.address, user1)).toString(), "0");

        assertAlmostEqual((await gauge.integralOf(user2)).toString(), toWei("0.3125"));
        assert.strictEqual((await gauge.checkpointOf(user2)).toString(), now.toString());
        assert.strictEqual((await gauge.claimable(user2)).toString(), "0");
        assert.strictEqual((await reward.balanceOf(user2)).toString(), "0");
        assert.strictEqual((await controller.claimed(gauge.address, user2)).toString(), "0");

        // 0.001 * 7000 = 7
        await timeIncreaseTo(startTime.addn(7000));
        // user1 claims rewards!
        await gauge.claim(user1, false, {from: user1});
        now = await time.latest();

        // 0.3125 + 2 / 40 = 0.3625
        assertAlmostEqual((await gauge.integral()).toString(), toWei("0.3625"));
        
        assertAlmostEqual((await gauge.integralOf(user1)).toString(), "0.3625");
        assert.strictEqual((await gauge.checkpointOf(user1)).toString(), now.toString());
        assert.strictEqual((await gauge.claimable(user1)).toString(), toWei("0"));
        // 5 + 2 * 16 / 40 = 5.8
        assertAlmostEqual((await reward.balanceOf(user1)).toString(), toWei("5.8"));
        assertAlmostEqual((await controller.claimed(gauge.address, user1)).toString(), toWei("5.8"));

        assertAlmostEqual((await gauge.integralOf(user2)).toString(), toWei("0.3125"));
        // 2 * 24 / 40 = 1.2
        assertAlmostEqual((await gauge.claimable(user2)).toString(), toWei("1.2"));
        assert.strictEqual((await reward.balanceOf(user2)).toString(), "0");
        assert.strictEqual((await controller.claimed(gauge.address, user2)).toString(), "0");

        // 0.001 * 10000 = 10
        await timeIncreaseTo(startTime.addn(10000));
        // user2 withdraws 20
        await gauge.withdraw(toWei('20'), {from: user2});
        now = await time.latest();

        // 0.3625 + 3 / 40 = 0.4375
        assertAlmostEqual((await gauge.integral()).toString(), toWei("0.4375"));
        
        assertAlmostEqual((await gauge.integralOf(user1)).toString(), "0.3625");
        // 3 * 16 / 40 = 1.2
        assertAlmostEqual((await gauge.claimable(user1)).toString(), toWei("1.2"));
        // 5 + 2 * 16 / 40 = 5.8
        assertAlmostEqual((await reward.balanceOf(user1)).toString(), toWei("5.8"));
        assertAlmostEqual((await controller.claimed(gauge.address, user1)).toString(), toWei("5.8"));

        assertAlmostEqual((await gauge.integralOf(user2)).toString(), toWei("0.4375"));
        assert.strictEqual((await gauge.claimable(user2)).toString(), toWei("0"));
        // 1.2 + 3 * 24 / 40 = 3
        assertAlmostEqual((await reward.balanceOf(user2)).toString(), toWei("3"));
        assertAlmostEqual((await controller.claimed(gauge.address, user2)).toString(), toWei("3"));
    });
});
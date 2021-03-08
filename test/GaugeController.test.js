const { expectRevert, time } = require('@openzeppelin/test-helpers');
const assert = require('assert');
const LiquidityGauge = artifacts.require("LiquidityGauge");
const GaugeController = artifacts.require("GaugeController");
const MockToken = artifacts.require("MockToken");
const SinglePlus = artifacts.require("SinglePlus");
const MockVotingEscrow = artifacts.require("MockVotingEscrow");

const toWei = web3.utils.toWei;
const BN = web3.utils.BN;
const assertAlmostEqual = function(expectedOrig, actualOrig) {
    const expected = new BN(expectedOrig);
    const actual = new BN(actualOrig);
    
    if (expected.toString() === "0") {
        const _1e18 = new BN('10').pow(new BN('18'));
        assert.ok(actual.muln(100).div(_1e18) <= 1, `Expected ${expected}, actual ${actual}`);
    } else {
        const diff = expected.sub(actual).abs().muln(100).div(expected);
        assert.ok(diff.toNumber() <= 1, `Expected ${expected}, actual ${actual}`);
    }
}
async function timeIncreaseTo (seconds) {
    const delay = 10 - new Date().getMilliseconds();
    await new Promise(resolve => setTimeout(resolve, delay));
    await time.increaseTo(seconds);
}

contract("LiquidityGauge", async ([owner, claimer, user1, user2, user3]) => {
    let gauge1, gauge2, gauge3;
    let underlying1, underlying2;
    let token1, token2, token3;
    let reward;
    let controller;
    let voting;

    beforeEach(async () => {
        reward = await MockToken.new("Mock Reward", "mReward", 18);
        
        controller = await GaugeController.new();
        // 864 AC for all plus gauges per day
        await controller.initialize(reward.address, toWei('864'));

        voting = await MockVotingEscrow.new();
        underlying1 = await MockToken.new("Mock Token 1", "mToken1", 18);
        underlying2 = await MockToken.new("Mock Token 2", "mToken2", 18);
        token1 = await SinglePlus.new();
        await token1.initialize(underlying1.address, '', '');
        token2 = await SinglePlus.new();
        await token2.initialize(underlying2.address, '', '');
        token3 = await MockToken.new("Mock Token 3", "mToken3", 18);
        gauge1 = await LiquidityGauge.new();
        await gauge1.initialize(token1.address, controller.address, voting.address);
        gauge2 = await LiquidityGauge.new();
        await gauge2.initialize(token2.address, controller.address, voting.address);
        gauge3 = await LiquidityGauge.new();
        await gauge3.initialize(token3.address, controller.address, voting.address);
    });

    it("should initialize", async () => {
        assert.strictEqual(await controller.governance(), owner);
        assert.strictEqual(await controller.treasury(), owner);
        assert.strictEqual(await controller.reward(), reward.address);
        // rate is in WAD
        assert.strictEqual((await controller.basePlusRate()).toString(), toWei(toWei('0.01')));
        assert.strictEqual((await controller.plusBoost()).toString(), toWei("1"));
    });

    it("should allow governance to set governance", async () => {
        await expectRevert(controller.setGovernance(user1, {from: user3}), "not governance");
        await controller.setGovernance(user1);
        assert.strictEqual(await controller.governance(), user1);
    });

    it("should allow governance to set claimer", async () => {
        assert.strictEqual(await controller.claimers(user2), false);
        await expectRevert(controller.setClaimer(user2, true, {from: user1}), "not governance");
        await controller.setClaimer(user2, true);
        assert.strictEqual(await controller.claimers(user2), true);
    });

    it("should allow governance to set treasury", async () => {
        await expectRevert(controller.setTreasury(user2, {from: user1}), "not governance");
        await controller.setTreasury(user2);
        assert.strictEqual(await controller.treasury(), user2);
    });

    it("should allow governance to set plus reward", async () => {
        await expectRevert(controller.setPlusReward(toWei("1728"), {from: user1}), "not governance");
        await controller.setPlusReward(toWei("1728"));
        // rate is in WAD
        assert.strictEqual((await controller.basePlusRate()).toString(), toWei(toWei('0.02')));
    });

    it("should allow governance to add new gauge", async () => {
        await expectRevert(controller.addGauge(gauge1.address, true, toWei("1"), "0", {from: user1}), "not governance");
        await controller.addGauge(gauge1.address, true, toWei("1"), "0");
        assert.strictEqual((await controller.gaugeSize()).toString(), "1");
        assert.strictEqual(await controller.gauges(0), gauge1.address);

        const gauge = await controller.gaugeData(gauge1.address);
        assert.strictEqual(gauge.isSupported, true);
        assert.strictEqual(gauge.isPlus, true);
        assert.strictEqual(gauge.weight.toString(), toWei("1"));
        assert.strictEqual(gauge.rate.toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge1.address)).toString(), "0");
        assert.strictEqual((await controller.totalRate()).toString(), "0");

        await expectRevert(controller.addGauge(gauge1.address, true, toWei("1"), "0"), "gauge exist");
    });

    it("should allow governance to remove gauges", async () => {
        await expectRevert(controller.removeGauge(gauge1.address, {from: user1}), "not governance");
        await expectRevert(controller.removeGauge(gauge1.address), "gauge not exist");

        await controller.addGauge(gauge1.address, true, toWei("1"), "0");
        await controller.addGauge(gauge2.address, true, toWei("1.5"), "0");
        await controller.addGauge(gauge3.address, false, "0", toWei("17.28"));

        assert.strictEqual((await controller.totalRate()).toString(), "0");

        // Removes the first pool
        await controller.removeGauge(gauge1.address);
        assert.strictEqual((await controller.gaugeData(gauge1.address)).isSupported, false);
        // Token 3 is moved from index 2 to index 0!
        // Token 2 is unchanged!
        assert.strictEqual(await controller.gauges(0), gauge3.address);
        assert.strictEqual(await controller.gauges(1), gauge2.address);

        assert.strictEqual((await controller.totalRate()).toString(), "0");

        // Removes the last pool
        await controller.removeGauge(gauge3.address);
        assert.strictEqual((await controller.gaugeData(gauge3.address)).isSupported, false);
        assert.strictEqual(await controller.gauges(0), gauge2.address);

        assert.strictEqual((await controller.totalRate()).toString(), "0");
    });

    it("should allow governance to update gauges", async () => {
        await expectRevert(controller.updateGauge(gauge1.address, toWei("1.5"), "0", {from: user1}), "not governance");
        await expectRevert(controller.updateGauge(gauge1.address, toWei("1.5"), "0"), "gauge not exist");

        await controller.addGauge(gauge1.address, true, toWei("1"), "0");
        await controller.addGauge(gauge2.address, true, toWei("1.5"), "0");
        await controller.addGauge(gauge3.address, false, "0", toWei("17.28"));

        assert.strictEqual((await controller.totalRate()).toString(), "0");

        // Update the first gauge
        await controller.updateGauge(gauge1.address, toWei("1.5"), toWei("17.28"));
        const gauge = await controller.gaugeData(gauge1.address);
        assert.strictEqual(gauge.isSupported, true);
        assert.strictEqual(gauge.isPlus, true);
        assert.strictEqual(gauge.weight.toString(), toWei("1.5"));
        // Gauge fixed rate is 0.002 but the actual rate is 0 since there is no token staked
        assert.strictEqual(gauge.rate.toString(), toWei(toWei("0.0002")));
        assert.strictEqual((await controller.gaugeRates(gauge1.address)).toString(), "0");
        assert.strictEqual((await controller.totalRate()).toString(), "0");
    });

    it("should set rate for non-plus gauges", async () => {
        await controller.addGauge(gauge1.address, true, toWei("1"), "0");
        await controller.addGauge(gauge2.address, true, toWei("1.5"), "0");
        await controller.addGauge(gauge3.address, false, "0", toWei("17.28"));

        // All gauge rates are zero when there is no token staked
        assert.strictEqual((await controller.gaugeRates(gauge1.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge2.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge3.address)).toString(), "0");
        assert.strictEqual((await controller.totalRate()).toString(), "0");

        // user3 stakes 20 token3
        await token3.mint(user3, toWei("20"));
        await token3.approve(gauge3.address, toWei("20"), {from: user3});
        // gauge3 is non-plus gauges. Stake token3 directly
        await gauge3.deposit(toWei("20"), {from: user3});

        assert.strictEqual((await controller.gaugeRates(gauge1.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge2.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge3.address)).toString(), "0");
        assert.strictEqual((await controller.totalRate()).toString(), "0");
        assert.strictEqual((await gauge3.rate()).toString(), "0");

        // New gauge rates take effect after checkpoint on gauge controller
        await controller.checkpoint();
        assert.strictEqual((await controller.gaugeRates(gauge1.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge2.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge3.address)).toString(), toWei(toWei("0.0002")));
        assert.strictEqual((await controller.totalRate()).toString(), toWei(toWei("0.0002")));
        assert.strictEqual((await gauge3.rate()).toString(), toWei(toWei("0.0002")));
    });

    it("should set rate for one plus gauge", async () => {
        await controller.addGauge(gauge1.address, true, toWei("1"), "0");
        await controller.addGauge(gauge2.address, true, toWei("1.5"), "0");
        await controller.addGauge(gauge3.address, false, "0", toWei("17.28"));

        // All gauge rates are zero when there is no token staked
        assert.strictEqual((await controller.gaugeRates(gauge1.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge2.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge3.address)).toString(), "0");
        assert.strictEqual((await controller.totalRate()).toString(), "0");

        // user3 stakes 20 token3
        await token3.mint(user3, toWei("20"));
        await token3.approve(gauge3.address, toWei("20"), {from: user3});
        // gauge3 is non-plus gauges. Stake token3 directly
        await gauge3.deposit(toWei("20"), {from: user3});

        // user1 stakes 30 plus1
        await underlying1.mint(user1, toWei("30"));
        await underlying1.approve(token1.address, toWei("30"), {from: user1});
        await token1.mint(toWei("30"), {from: user1});
        await token1.approve(gauge1.address, toWei("30"), {from: user1});
        await gauge1.deposit(toWei("30"), {from: user1});

        assert.strictEqual((await controller.gaugeRates(gauge1.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge2.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge3.address)).toString(), "0");
        assert.strictEqual((await controller.totalRate()).toString(), "0");
        assert.strictEqual((await gauge3.rate()).toString(), "0");

        // New gauge rates take effect after checkpoint on gauge controller
        await controller.checkpoint();
        // All plus rates 0.01 goes to gauge1!!
        assertAlmostEqual((await controller.gaugeRates(gauge1.address)).toString(), toWei(toWei("0.01")));
        assert.strictEqual((await controller.gaugeRates(gauge2.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge3.address)).toString(), toWei(toWei("0.0002")));
        assertAlmostEqual((await controller.totalRate()).toString(), toWei(toWei("0.0102")));
        assertAlmostEqual((await gauge1.rate()).toString(), toWei(toWei("0.01")));
        assert.strictEqual((await gauge3.rate()).toString(), toWei(toWei("0.0002")));
    });

    it("should set rate for multiple plus gauges", async () => {
        await controller.addGauge(gauge1.address, true, toWei("1"), "0");
        await controller.addGauge(gauge2.address, true, toWei("1.5"), "0");
        await controller.addGauge(gauge3.address, false, "0", toWei("17.28"));

        // All gauge rates are zero when there is no token staked
        assert.strictEqual((await controller.gaugeRates(gauge1.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge2.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge3.address)).toString(), "0");
        assert.strictEqual((await controller.totalRate()).toString(), "0");

        // user3 stakes 40 token3
        await token3.mint(user3, toWei("40"));
        await token3.approve(gauge3.address, toWei("40"), {from: user3});
        // gauge3 is non-plus gauges. Stake token3 directly
        await gauge3.deposit(toWei("40"), {from: user3});

        // user1 stakes 30 plus1
        await underlying1.mint(user1, toWei("30"));
        await underlying1.approve(token1.address, toWei("30"), {from: user1});
        await token1.mint(toWei("30"), {from: user1});
        await token1.approve(gauge1.address, toWei("30"), {from: user1});
        await gauge1.deposit(toWei("30"), {from: user1});

        // user2 stakes 20 plus1
        await underlying2.mint(user2, toWei("20"));
        await underlying2.approve(token2.address, toWei("20"), {from: user2});
        await token2.mint(toWei("20"), {from: user2});
        await token2.approve(gauge2.address, toWei("20"), {from: user2});
        await gauge2.deposit(toWei("20"), {from: user2});

        assert.strictEqual((await controller.gaugeRates(gauge1.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge2.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge3.address)).toString(), "0");
        assert.strictEqual((await controller.totalRate()).toString(), "0");
        assert.strictEqual((await controller.plusBoost()).toString(), toWei("1"));
        assert.strictEqual((await gauge3.rate()).toString(), "0");

        // New gauge rates take effect after checkpoint on gauge controller
        await controller.checkpoint();
        // Weighted amount of token1: 30 * 1 = 30
        // Weighted amount of token2: 20 * 1.5 = 30
        // Therefore, gauge1 and gauge2 share the same rate!
        console.log((await controller.gaugeRates(gauge1.address)).toString());
        console.log((await controller.gaugeRates(gauge2.address)).toString());
        assertAlmostEqual((await controller.gaugeRates(gauge1.address)).toString(), toWei(toWei("0.005")));
        assertAlmostEqual((await controller.gaugeRates(gauge2.address)).toString(), toWei(toWei("0.005")));
        assert.strictEqual((await controller.gaugeRates(gauge3.address)).toString(), toWei(toWei("0.0002")));
        assertAlmostEqual((await controller.totalRate()).toString(), toWei(toWei("0.0102")));
        assert.strictEqual((await controller.plusBoost()).toString(), toWei("1"));
        assertAlmostEqual((await gauge1.rate()).toString(), toWei(toWei("0.005")));
        assertAlmostEqual((await gauge2.rate()).toString(), toWei(toWei("0.005")));
        assert.strictEqual((await gauge3.rate()).toString(), toWei(toWei("0.0002")));
    });

    it("should set rate for multiple plus gauges with 100 plus tokens", async () => {
        await controller.addGauge(gauge1.address, true, toWei("1"), "0");
        await controller.addGauge(gauge2.address, true, toWei("1.5"), "0");
        await controller.addGauge(gauge3.address, false, "0", toWei("17.28"));

        // All gauge rates are zero when there is no token staked
        assert.strictEqual((await controller.gaugeRates(gauge1.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge2.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge3.address)).toString(), "0");
        assert.strictEqual((await controller.totalRate()).toString(), "0");

        // user3 stakes 40 token3
        await token3.mint(user3, toWei("40"));
        await token3.approve(gauge3.address, toWei("40"), {from: user3});
        // gauge3 is non-plus gauges. Stake token3 directly
        await gauge3.deposit(toWei("40"), {from: user3});

        // user1 stakes 60 plus1
        await underlying1.mint(user1, toWei("60"));
        await underlying1.approve(token1.address, toWei("60"), {from: user1});
        await token1.mint(toWei("60"), {from: user1});
        await token1.approve(gauge1.address, toWei("60"), {from: user1});
        await gauge1.deposit(toWei("60"), {from: user1});

        // user2 stakes 40 plus1
        await underlying2.mint(user2, toWei("40"));
        await underlying2.approve(token2.address, toWei("40"), {from: user2});
        await token2.mint(toWei("40"), {from: user2});
        await token2.approve(gauge2.address, toWei("40"), {from: user2});
        await gauge2.deposit(toWei("40"), {from: user2});

        assert.strictEqual((await controller.gaugeRates(gauge1.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge2.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge3.address)).toString(), "0");
        assert.strictEqual((await controller.totalRate()).toString(), "0");
        assert.strictEqual((await controller.plusBoost()).toString(), toWei("1"));
        assert.strictEqual((await gauge3.rate()).toString(), "0");

        // New gauge rates take effect after checkpoint on gauge controller
        await controller.checkpoint();
        // Weighted amount of token1: 60 * 1 = 60
        // Weighted amount of token2: 40 * 1.5 = 60
        // Therefore, gauge1 and gauge2 share the same rate!
        console.log((await controller.gaugeRates(gauge1.address)).toString());
        console.log((await controller.gaugeRates(gauge2.address)).toString());
        assertAlmostEqual((await controller.gaugeRates(gauge1.address)).toString(), toWei(toWei("0.005")));
        assertAlmostEqual((await controller.gaugeRates(gauge2.address)).toString(), toWei(toWei("0.005")));
        assert.strictEqual((await controller.gaugeRates(gauge3.address)).toString(), toWei(toWei("0.0002")));
        assertAlmostEqual((await controller.totalRate()).toString(), toWei(toWei("0.0102")));
        assert.strictEqual((await controller.plusBoost()).toString(), toWei("1"));
        assertAlmostEqual((await gauge1.rate()).toString(), toWei(toWei("0.005")));
        assertAlmostEqual((await gauge2.rate()).toString(), toWei(toWei("0.005")));
        assert.strictEqual((await gauge3.rate()).toString(), toWei(toWei("0.0002")));
    });

    it("should have 2x boost with 1000 plus tokens", async () => {
        await controller.addGauge(gauge1.address, true, toWei("1"), "0");
        await controller.addGauge(gauge2.address, true, toWei("1.5"), "0");
        await controller.addGauge(gauge3.address, false, "0", toWei("17.28"));

        // All gauge rates are zero when there is no token staked
        assert.strictEqual((await controller.gaugeRates(gauge1.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge2.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge3.address)).toString(), "0");
        assert.strictEqual((await controller.totalRate()).toString(), "0");

        // user3 stakes 40 token3
        await token3.mint(user3, toWei("40"));
        await token3.approve(gauge3.address, toWei("40"), {from: user3});
        // gauge3 is non-plus gauges. Stake token3 directly
        await gauge3.deposit(toWei("40"), {from: user3});

        // user1 stakes 600 plus1
        await underlying1.mint(user1, toWei("600"));
        await underlying1.approve(token1.address, toWei("600"), {from: user1});
        await token1.mint(toWei("600"), {from: user1});
        await token1.approve(gauge1.address, toWei("600"), {from: user1});
        await gauge1.deposit(toWei("600"), {from: user1});

        // user2 stakes 400 plus1
        await underlying2.mint(user2, toWei("400"));
        await underlying2.approve(token2.address, toWei("400"), {from: user2});
        await token2.mint(toWei("400"), {from: user2});
        await token2.approve(gauge2.address, toWei("400"), {from: user2});
        await gauge2.deposit(toWei("400"), {from: user2});

        assert.strictEqual((await controller.gaugeRates(gauge1.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge2.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge3.address)).toString(), "0");
        assert.strictEqual((await controller.totalRate()).toString(), "0");
        assert.strictEqual((await controller.plusBoost()).toString(), toWei("1"));
        assert.strictEqual((await gauge3.rate()).toString(), "0");

        // Boost = log (400 + 600) - 1 = 2

        // New gauge rates take effect after checkpoint on gauge controller
        await controller.checkpoint();
        // Weighted amount of token1: 600 * 1 = 600
        // Weighted amount of token2: 400 * 1.5 = 600
        // Therefore, gauge1 and gauge2 share the same rate!
        console.log((await controller.gaugeRates(gauge1.address)).toString());
        console.log((await controller.gaugeRates(gauge2.address)).toString());
        assertAlmostEqual((await controller.gaugeRates(gauge1.address)).toString(), toWei(toWei("0.010")));
        assertAlmostEqual((await controller.gaugeRates(gauge2.address)).toString(), toWei(toWei("0.010")));
        assert.strictEqual((await controller.gaugeRates(gauge3.address)).toString(), toWei(toWei("0.0002")));
        assertAlmostEqual((await controller.totalRate()).toString(), toWei(toWei("0.0202")));
        assertAlmostEqual((await controller.plusBoost()).toString(), toWei("2"));
        assertAlmostEqual((await gauge1.rate()).toString(), toWei(toWei("0.01")));
        assertAlmostEqual((await gauge2.rate()).toString(), toWei(toWei("0.01")));
        assert.strictEqual((await gauge3.rate()).toString(), toWei(toWei("0.0002")));
    });

    it("should have 2x boost with 1000 plus tokens", async () => {
        await controller.addGauge(gauge1.address, true, toWei("1"), "0");
        await controller.addGauge(gauge2.address, true, toWei("1.5"), "0");
        await controller.addGauge(gauge3.address, false, "0", toWei("17.28"));

        // All gauge rates are zero when there is no token staked
        assert.strictEqual((await controller.gaugeRates(gauge1.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge2.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge3.address)).toString(), "0");
        assert.strictEqual((await controller.totalRate()).toString(), "0");

        // user3 stakes 40 token3
        await token3.mint(user3, toWei("40"));
        await token3.approve(gauge3.address, toWei("40"), {from: user3});
        // gauge3 is non-plus gauges. Stake token3 directly
        await gauge3.deposit(toWei("40"), {from: user3});

        // user1 stakes 600 plus1
        await underlying1.mint(user1, toWei("600"));
        await underlying1.approve(token1.address, toWei("600"), {from: user1});
        await token1.mint(toWei("600"), {from: user1});
        await token1.approve(gauge1.address, toWei("600"), {from: user1});
        await gauge1.deposit(toWei("600"), {from: user1});

        // user2 stakes 400 plus1
        await underlying2.mint(user2, toWei("400"));
        await underlying2.approve(token2.address, toWei("400"), {from: user2});
        await token2.mint(toWei("400"), {from: user2});
        await token2.approve(gauge2.address, toWei("400"), {from: user2});
        await gauge2.deposit(toWei("400"), {from: user2});

        assert.strictEqual((await controller.gaugeRates(gauge1.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge2.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge3.address)).toString(), "0");
        assert.strictEqual((await controller.totalRate()).toString(), "0");
        assert.strictEqual((await controller.plusBoost()).toString(), toWei("1"));
        assert.strictEqual((await gauge3.rate()).toString(), "0");

        // Boost = log (400 + 600) - 1 = 2

        // New gauge rates take effect after checkpoint on gauge controller
        await controller.checkpoint();
        // Weighted amount of token1: 600 * 1 = 600
        // Weighted amount of token2: 400 * 1.5 = 600
        // Therefore, gauge1 and gauge2 share the same rate!
        console.log((await controller.gaugeRates(gauge1.address)).toString());
        console.log((await controller.gaugeRates(gauge2.address)).toString());
        assertAlmostEqual((await controller.gaugeRates(gauge1.address)).toString(), toWei(toWei("0.010")));
        assertAlmostEqual((await controller.gaugeRates(gauge2.address)).toString(), toWei(toWei("0.010")));
        assert.strictEqual((await controller.gaugeRates(gauge3.address)).toString(), toWei(toWei("0.0002")));
        assertAlmostEqual((await controller.totalRate()).toString(), toWei(toWei("0.0202")));
        assertAlmostEqual((await controller.plusBoost()).toString(), toWei("2"));
        assertAlmostEqual((await gauge1.rate()).toString(), toWei(toWei("0.01")));
        assertAlmostEqual((await gauge2.rate()).toString(), toWei(toWei("0.01")));
        assert.strictEqual((await gauge3.rate()).toString(), toWei(toWei("0.0002")));
    });

    it("should have 1.5x boost with 316.227766016837933 plus tokens", async () => {
        await controller.addGauge(gauge1.address, true, toWei("1"), "0");
        await controller.addGauge(gauge2.address, true, toWei("1.5"), "0");
        await controller.addGauge(gauge3.address, false, "0", toWei("17.28"));

        // All gauge rates are zero when there is no token staked
        assert.strictEqual((await controller.gaugeRates(gauge1.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge2.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge3.address)).toString(), "0");
        assert.strictEqual((await controller.totalRate()).toString(), "0");

        // user3 stakes 40 token3
        await token3.mint(user3, toWei("40"));
        await token3.approve(gauge3.address, toWei("40"), {from: user3});
        // gauge3 is non-plus gauges. Stake token3 directly
        await gauge3.deposit(toWei("40"), {from: user3});

        // 10^2.5 = 316.227766016837933
        // 316.227766016837933 * 0.6 = 189.73665961010276
        // 316.227766016837933 * 0.4 = 126.491106406735173

        // user1 stakes 189.73665961010276 plus1
        await underlying1.mint(user1, toWei("189.73665961010276"));
        await underlying1.approve(token1.address, toWei("189.73665961010276"), {from: user1});
        await token1.mint(toWei("189.73665961010276"), {from: user1});
        await token1.approve(gauge1.address, toWei("189.73665961010276"), {from: user1});
        await gauge1.deposit(toWei("189.73665961010276"), {from: user1});

        // user2 stakes 126.491106406735173 plus1
        await underlying2.mint(user2, toWei("126.491106406735173"));
        await underlying2.approve(token2.address, toWei("126.491106406735173"), {from: user2});
        await token2.mint(toWei("126.491106406735173"), {from: user2});
        await token2.approve(gauge2.address, toWei("126.491106406735173"), {from: user2});
        await gauge2.deposit(toWei("126.491106406735173"), {from: user2});

        assert.strictEqual((await controller.gaugeRates(gauge1.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge2.address)).toString(), "0");
        assert.strictEqual((await controller.gaugeRates(gauge3.address)).toString(), "0");
        assert.strictEqual((await controller.totalRate()).toString(), "0");
        assert.strictEqual((await controller.plusBoost()).toString(), toWei("1"));
        assert.strictEqual((await gauge3.rate()).toString(), "0");

        // Boost = log (400 + 600) - 1 = 2

        // New gauge rates take effect after checkpoint on gauge controller
        await controller.checkpoint();
        // Weighted amount of token1: 600 * 1 = 600
        // Weighted amount of token2: 400 * 1.5 = 600
        // Therefore, gauge1 and gauge2 share the same rate!
        console.log((await controller.gaugeRates(gauge1.address)).toString());
        console.log((await controller.gaugeRates(gauge2.address)).toString());
        console.log((await controller.plusBoost()).toString());
        assertAlmostEqual((await controller.gaugeRates(gauge1.address)).toString(), toWei(toWei("0.0075")));
        assertAlmostEqual((await controller.gaugeRates(gauge2.address)).toString(), toWei(toWei("0.0075")));
        assert.strictEqual((await controller.gaugeRates(gauge3.address)).toString(), toWei(toWei("0.0002")));
        assertAlmostEqual((await controller.totalRate()).toString(), toWei(toWei("0.0152")));
        assertAlmostEqual((await controller.plusBoost()).toString(), toWei("1.5"));
        assertAlmostEqual((await gauge1.rate()).toString(), toWei(toWei("0.0075")));
        assertAlmostEqual((await gauge2.rate()).toString(), toWei(toWei("0.0075")));
        assert.strictEqual((await gauge3.rate()).toString(), toWei(toWei("0.0002")));
    });

    it("should return claimable amount", async () => {
        await controller.addGauge(gauge1.address, true, toWei("1"), "0");
        await controller.addGauge(gauge2.address, true, toWei("1.5"), "0");
        await controller.addGauge(gauge3.address, false, "0", toWei("172.8"));

        // user3 stakes 40 token3
        await token3.mint(user3, toWei("40"));
        await token3.approve(gauge3.address, toWei("40"), {from: user3});
        // gauge3 is non-plus gauges. Stake token3 directly
        await gauge3.deposit(toWei("40"), {from: user3});

        // user1 stakes 600 plus1
        await underlying1.mint(user1, toWei("600"));
        await underlying1.approve(token1.address, toWei("600"), {from: user1});
        await token1.mint(toWei("600"), {from: user1});
        await token1.approve(gauge1.address, toWei("600"), {from: user1});
        await gauge1.deposit(toWei("600"), {from: user1});

        // user2 stakes 400 plus1
        await underlying2.mint(user2, toWei("400"));
        await underlying2.approve(token2.address, toWei("400"), {from: user2});
        await token2.mint(toWei("400"), {from: user2});
        await token2.approve(gauge2.address, toWei("400"), {from: user2});
        await gauge2.deposit(toWei("400"), {from: user2});

        // Boost = log (400 + 600) - 1 = 2
        // New gauge rates take effect after checkpoint on gauge controller
        await controller.checkpoint();
        // Weighted amount of token1: 600 * 1 = 600
        // Weighted amount of token2: 400 * 1.5 = 600
        // Therefore, gauge1 and gauge2 share the same rate!
        console.log((await controller.gaugeRates(gauge1.address)).toString());
        console.log((await controller.gaugeRates(gauge2.address)).toString());
        assertAlmostEqual((await controller.gaugeRates(gauge1.address)).toString(), toWei(toWei("0.010")));
        assertAlmostEqual((await controller.gaugeRates(gauge2.address)).toString(), toWei(toWei("0.010")));
        assert.strictEqual((await controller.gaugeRates(gauge3.address)).toString(), toWei(toWei("0.002")));
        assertAlmostEqual((await controller.totalRate()).toString(), toWei(toWei("0.022")));
        assertAlmostEqual((await controller.plusBoost()).toString(), toWei("2"));
        assertAlmostEqual((await gauge1.rate()).toString(), toWei(toWei("0.01")));
        assertAlmostEqual((await gauge2.rate()).toString(), toWei(toWei("0.01")));
        assert.strictEqual((await gauge3.rate()).toString(), toWei(toWei("0.002")));

        assert.strictEqual((await controller.totalReward()).toString(), "0");
        assert.strictEqual((await controller.totalClaimed()).toString(), "0");
        assert.strictEqual((await controller.claimable()).toString(), "0");

        const start = await time.latest();
        await timeIncreaseTo(start.addn(400));
        // Do a global checkpoint!
        await controller.checkpoint();

        // user1 should get 0.01 * 400 = 4 AC
        assertAlmostEqual((await gauge1.claimable(user1)).toString(), toWei("4"));
        // user2 should get 0.01 * 400 = 4 AC
        assertAlmostEqual((await gauge2.claimable(user2)).toString(), toWei("4"));
        // user3 shoud get 0.002 * 400 = 0.8 AC
        assertAlmostEqual((await gauge3.claimable(user3)).toString(), toWei("0.8"));
        // Total rewards: 0.022 * 400 = 8.8 AC
        assertAlmostEqual((await controller.totalReward()).toString(), toWei("8.8"));
        assertAlmostEqual((await controller.claimable()).toString(), toWei("8.8"));
        assertAlmostEqual((await controller.claimed(gauge2.address, user2)).toString(), "0");
        assertAlmostEqual((await controller.totalClaimed()).toString(), "0");

        // Mint enough rewards token to gauge controller first
        await reward.mint(controller.address, toWei("200"));
        // user2 claims
        await gauge2.claim(user2, true, {from: user2});
        assertAlmostEqual((await controller.totalReward()).toString(), toWei("8.8"));
        assertAlmostEqual((await controller.claimable()).toString(), toWei("4.8"));
        assertAlmostEqual((await controller.claimed(gauge2.address, user2)).toString(), toWei("4"));
        assertAlmostEqual((await controller.totalClaimed()).toString(), toWei("4"));
        assertAlmostEqual((await gauge2.claimable(user2)).toString(), toWei("0"));
        assertAlmostEqual((await reward.balanceOf(user2)).toString(), toWei("4"));
        assertAlmostEqual((await reward.balanceOf(controller.address)).toString(), toWei("196"));

        await timeIncreaseTo(start.addn(600));
        assertAlmostEqual((await controller.totalReward()).toString(), toWei("13.2"));
        assertAlmostEqual((await controller.claimable()).toString(), toWei("9.2"));
        assertAlmostEqual((await controller.claimed(gauge2.address, user2)).toString(), toWei("4"));
        assertAlmostEqual((await controller.totalClaimed()).toString(), toWei("4"));
        assertAlmostEqual((await gauge2.claimable(user2)).toString(), toWei("0"));
        assertAlmostEqual((await reward.balanceOf(user2)).toString(), toWei("4"));
        assertAlmostEqual((await reward.balanceOf(controller.address)).toString(), toWei("196"));
    });
});
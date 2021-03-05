const { BN, expectRevert, time } = require('@openzeppelin/test-helpers');
const assert = require('assert');
const SinglePool = artifacts.require("SinglePool");
const BTCPlus = artifacts.require("BTCPlus");
const ERC20 = artifacts.require("MockToken");
const Strategy = artifacts.require("MockStrategy");

contract("SinglePool", async ([owner, treasury, strategist]) => {
    let btcPlus;
    let token;
    let pool;
    let strategy;

    beforeEach(async () => {
        btcPlus = await BTCPlus.new();
        await btcPlus.initialize();
        await btcPlus.setTreasury(treasury);
        await btcPlus.setStrategist(strategist, true);
        token = await ERC20.new();
        await token.initialize("Mock", "Mock", 6);
        pool = await SinglePool.new();
        await pool.initialize(btcPlus.address, token.address);
        strategy = await Strategy.new();
        await strategy.initialize(pool.address);
        await pool.approveStrategy(strategy.address, true);
    });

    it("should set ratio", async () => {
        assert.strictEqual((await pool.ratio()).toString(), "1000000000000");
    });

    it("should read underlying balance", async () => {
        await token.mint(pool.address, "20000000");
        await token.mint(strategy.address, "45000000");
        assert.strictEqual((await pool.underlyingBalance()).toString(), web3.utils.toWei("65"));
    });
});
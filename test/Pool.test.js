const { expectRevert } = require('@openzeppelin/test-helpers');
const assert = require('assert');
const Pool = artifacts.require("MockPool");
const BTCPlus = artifacts.require("BTCPlus");
const ERC20 = artifacts.require("MockToken");
const Strategy = artifacts.require("MockStrategy");

contract("Pool", async ([owner, treasury, strategist, user1, user2, user3, btcPlus2]) => {
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
        await token.initialize("Mock", "Mock", 18);
        pool = await Pool.new();
        await pool.initialize(btcPlus.address, token.address);
        strategy = await Strategy.new();
        await strategy.initialize(pool.address);
        await pool.approveStrategy(strategy.address, true);
    });

    it("should read from BTC+", async () => {
        assert.strictEqual(await pool.governance(), owner);
        assert.strictEqual(await pool.treasury(), treasury);
        assert.strictEqual(await pool.strategist(strategist), true);
        assert.strictEqual(await pool.strategist(user1), false);
    });

    it("should have set active strategy", async () => {
        assert.strictEqual(await pool.strategies(strategy.address), true);
        assert.strictEqual(await pool.activeStrategy(), strategy.address);
    });

    it("should not allow to approve strategy other than governance", async () => {
        const strategy2 = await Strategy.new();
        await strategy2.initialize(pool.address);
        await expectRevert(pool.approveStrategy(strategy2.address, true, {from: strategist}), "not governance");
        await expectRevert(pool.approveStrategy(strategy2.address, false, {from: strategist}), "not governance");
    });

    it("should allow governance to approve strategy", async () => {
        const strategy2 = await Strategy.new();
        await strategy2.initialize(pool.address);
        await pool.approveStrategy(strategy2.address, false);
        assert.strictEqual(await pool.strategies(strategy2.address), true);
        assert.strictEqual(await pool.activeStrategy(), strategy.address);

        const strategy3 = await Strategy.new();
        await strategy3.initialize(pool.address);
        await pool.approveStrategy(strategy3.address, true);
        assert.strictEqual(await pool.strategies(strategy3.address), true);
        assert.strictEqual(await pool.activeStrategy(), strategy3.address);
    });

    it("should not allow to revoke strategy other than strategist", async () => {
        await expectRevert(pool.revokeStrategy(strategy.address, {from: user2}), "not strategist");
    });

    it("should only allow to revoke approved strategy", async () => {
        await expectRevert(pool.revokeStrategy(user3), "not approved");
    });

    it("should allow strategist to revoke strategy", async () => {
        await pool.revokeStrategy(strategy.address, {from: strategist});
        assert.strictEqual(await pool.strategies(strategy.address), false);
        assert.strictEqual(await pool.activeStrategy(), '0x0000000000000000000000000000000000000000');
    });

    it("should not allow to set active strategy other than strategist", async () => {
        const strategy2 = await Strategy.new();
        await strategy2.initialize(pool.address);
        await expectRevert(pool.setActiveStrategy(strategy2.address, {from: user2}), "not strategist");
    });

    it("should allow to set approved strategies as active", async () => {
        const strategy2 = await Strategy.new();
        await strategy2.initialize(pool.address);
        await expectRevert(pool.setActiveStrategy(strategy2.address), "not approved");

        await pool.approveStrategy(strategy2.address, false);
        assert.strictEqual(await pool.strategies(strategy2.address), true);
        assert.strictEqual(await pool.activeStrategy(), strategy.address);
        
        await pool.setActiveStrategy(strategy2.address);
        assert.strictEqual(await pool.activeStrategy(), strategy2.address);
    });

    it("should deposit and withdraw from pool", async () => {
        await token.mint(pool.address, web3.utils.toWei("50"));
        await pool.invest();
        await token.mint(pool.address, web3.utils.toWei("100"));
        assert.strictEqual((await token.balanceOf(pool.address)).toString(), web3.utils.toWei("100"));
        assert.strictEqual((await token.balanceOf(strategy.address)).toString(), web3.utils.toWei("50"));
        assert.strictEqual((await token.balanceOf(user2)).toString(), "0");

        await pool.setBTCPlus(btcPlus2);
        await pool.withdraw(user2, web3.utils.toWei("120"), {from: btcPlus2});
        assert.strictEqual((await token.balanceOf(pool.address)).toString(), web3.utils.toWei("0"));
        assert.strictEqual((await token.balanceOf(strategy.address)).toString(), web3.utils.toWei("30"));
        assert.strictEqual((await token.balanceOf(user2)).toString(), web3.utils.toWei("120"));
    });

    it("should invest and harvest", async () => {
        await token.mint(pool.address, web3.utils.toWei("50"));
        await pool.invest();
        await pool.harvest();
        assert.strictEqual((await token.balanceOf(pool.address)).toString(), web3.utils.toWei("0"));
        assert.strictEqual((await token.balanceOf(strategy.address)).toString(), web3.utils.toWei("60"));
    });

    it("should not allow to invest or harvest other than strategist", async () => {
        await expectRevert(pool.invest({from: user3}), "not strategist");
        await expectRevert(pool.harvest({from: user3}), "not strategist");
    });
});
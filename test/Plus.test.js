const { expectRevert } = require('@openzeppelin/test-helpers');
const assert = require('assert');
const { expect } = require('chai');
const MockPlus = artifacts.require("MockPlus");
const MockToken = artifacts.require("MockToken");

const toWei = web3.utils.toWei;
const MAX = web3.utils.toBN(2).pow(web3.utils.toBN(256)).sub(web3.utils.toBN(1));

contract("Plus", async ([owner, treasury, strategist, user1, user2, user3]) => {
    let plus;

    beforeEach(async () => {
        plus = await MockPlus.new();
        await plus.initialize("Mock Plus", "vPlus");
    });

    it("should initialize", async () => {
        assert.strictEqual(await plus.governance(), owner);
        assert.strictEqual(await plus.treasury(), owner);
        assert.strictEqual((await plus.index()).toString(), toWei("1"));
    });

    it("should allow governance to update governance", async () => {
        await expectRevert(plus.setGovernance(user1, {from: strategist}), "not governance");
        await plus.setGovernance(user1);
        assert.strictEqual(await plus.governance(), user1);
    });

    it("should allow strategist to update strategist", async () => {
        await expectRevert(plus.setStrategist(user2, true, {from: user1}), "not strategist");
        await plus.setStrategist(user2, true);
        assert.strictEqual(await plus.strategists(user2), true);
    });

    it("should allow governance to update treasury", async () => {
        await expectRevert(plus.setTreasury(user2, {from: strategist}), "not governance");
        await plus.setTreasury(user2);
        assert.strictEqual(await plus.treasury(), user2);
    });

    it("should allow governance to update redeem fee", async () => {
        await expectRevert(plus.setRedeemFee("9990", {from: strategist}), "not governance");
        await plus.setRedeemFee("9990");
        assert.strictEqual((await plus.redeemFee()).toString(), "9990");
    });

    it("should rebase", async () => {
        await plus.mintShares(user1, toWei("10"));
        assert.strictEqual((await plus.index()).toString(), toWei("1"));
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("10"));
        assert.strictEqual((await plus.totalShares()).toString(), toWei("10"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("10"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("10"));
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1"));

        await plus.increment(toWei("2"));
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1.2"));
        await plus.rebase();
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1"));

        assert.strictEqual((await plus.index()).toString(), toWei("1.2"));
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("12"));
        assert.strictEqual((await plus.totalShares()).toString(), toWei("10"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("10"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("12"));
        assert.strictEqual((await plus.totalUnderlying()).toString(), toWei("12"));
    });

    it("should transfer after rebase", async () => {
        await plus.mintShares(user1, toWei("10"));
        await plus.increment(toWei("2"));
        await plus.rebase();
        
        assert.strictEqual((await plus.index()).toString(), toWei("1.2"));
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("12"));
        assert.strictEqual((await plus.totalShares()).toString(), toWei("10"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("10"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("12"));
        assert.strictEqual((await plus.userShare(user2)).toString(), toWei("0"));
        assert.strictEqual((await plus.balanceOf(user2)).toString(), toWei("0"));

        await plus.transfer(user2, toWei("3.6"), {from: user1});
        assert.strictEqual((await plus.index()).toString(), toWei("1.2"));
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("12"));
        assert.strictEqual((await plus.totalShares()).toString(), toWei("10"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("7"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("8.4"));
        assert.strictEqual((await plus.userShare(user2)).toString(), toWei("3"));
        assert.strictEqual((await plus.balanceOf(user2)).toString(), toWei("3.6"));
    });

    it("should allow governance to add transaction", async () => {
        const token = await MockToken.new("Test Token", "tToken", 18);
        const data = web3.eth.abi.encodeFunctionCall({
            name: 'mint',
            type: 'function',
            inputs: [
                {type: 'address', name: 'account'},
                {type: 'uint256', name: 'amount'}
            ],
        }, [user3, "45000"]);
        await expectRevert(plus.addTransaction(token.address, data, {from: strategist}), "not governance");
        await plus.addTransaction(token.address, data);
        assert.strictEqual((await plus.transactionSize()).toString(), "1");
        const transaction = await plus.transactions("0");
        assert.strictEqual(transaction.enabled, true);
        assert.strictEqual(transaction.destination, token.address);
        assert.strictEqual(transaction.data, data);
    });

    it("should allow governance to update transaction", async () => {
        const token = await MockToken.new("Test Token", "tToken", 18);
        const data = web3.eth.abi.encodeFunctionCall({
            name: 'mint',
            type: 'function',
            inputs: [
                {type: 'address', name: 'account'},
                {type: 'uint256', name: 'amount'}
            ],
        }, [user3, "45000"]);
        await plus.addTransaction(token.address, data);
        await expectRevert(plus.updateTransaction("0", false, {from: strategist}), "not governance");
        await plus.updateTransaction("0", false);
        assert.strictEqual((await plus.transactionSize()).toString(), "1");
        const transaction = await plus.transactions("0");
        assert.strictEqual(transaction.enabled, false);
        assert.strictEqual(transaction.destination, token.address);
        assert.strictEqual(transaction.data, data);
    });

    it("should allow governance to remove transaction", async () => {
        const token = await MockToken.new("Test Token", "tToken", 18);
        const data = web3.eth.abi.encodeFunctionCall({
            name: 'mint',
            type: 'function',
            inputs: [
                {type: 'address', name: 'account'},
                {type: 'uint256', name: 'amount'}
            ],
        }, [user3, "45000"]);
        await plus.addTransaction(token.address, data);
        await expectRevert(plus.removeTransaction("0", {from: strategist}), "not governance");
        await plus.removeTransaction("0");
        assert.strictEqual((await plus.transactionSize()).toString(), "0");
    });

    it("should invoke transaction on rebase", async () => {
        const token = await MockToken.new("Test Token", "tToken", 18);
        const data = web3.eth.abi.encodeFunctionCall({
            name: 'mint',
            type: 'function',
            inputs: [
                {type: 'address', name: 'account'},
                {type: 'uint256', name: 'amount'}
            ],
        }, [user3, "45000"]);
        await plus.addTransaction(token.address, data);
        assert.strictEqual((await token.balanceOf(user3)).toString(), "0");

        await plus.mintShares(user1, toWei("10"));
        await plus.increment(toWei("2"));
        await plus.rebase();

        assert.strictEqual((await token.balanceOf(user3)).toString(), "45000");
    });

    it("should allow anyone to donate", async () => {
        await plus.mintShares(user1, toWei("10"));
        await plus.increment(toWei("2"));
        await plus.rebase();
        await plus.mintShares(user2, toWei("4"));

        assert.strictEqual((await plus.index()).toString(), toWei("1.2"));
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("16.8"));
        assert.strictEqual((await plus.totalShares()).toString(), toWei("14"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("10"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("12"));
        assert.strictEqual((await plus.userShare(user2)).toString(), toWei("4"));
        assert.strictEqual((await plus.balanceOf(user2)).toString(), toWei("4.8"));
        assert.strictEqual((await plus.totalUnderlying()).toString(), toWei("16.8"));

        await plus.donate(toWei("7.2"), {from: user1});

        // After donation, it seems that 7.2 plus is redeemed
        assert.strictEqual((await plus.index()).toString(), toWei("1.2"));
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("9.6"));
        assert.strictEqual((await plus.totalShares()).toString(), toWei("8"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("4"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("4.8"));
        assert.strictEqual((await plus.userShare(user2)).toString(), toWei("4"));
        assert.strictEqual((await plus.balanceOf(user2)).toString(), toWei("4.8"));
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1.75"));
        assert.strictEqual((await plus.totalUnderlying()).toString(), toWei("16.8"));

        await plus.rebase();

        // After the next rebase, the 7.2 plus is distributed evenly to all users!
        assert.strictEqual((await plus.index()).toString(), toWei("2.1"));
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("16.8"));
        assert.strictEqual((await plus.totalShares()).toString(), toWei("8"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("4"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("8.4"));
        assert.strictEqual((await plus.userShare(user2)).toString(), toWei("4"));
        assert.strictEqual((await plus.balanceOf(user2)).toString(), toWei("8.4"));
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1"));
        assert.strictEqual((await plus.totalUnderlying()).toString(), toWei("16.8"));
    });

    it("should allow anyone to donate", async () => {
        await plus.mintShares(user1, toWei("10"));
        await plus.increment(toWei("2"));
        await plus.rebase();
        await plus.mintShares(user2, toWei("4"));

        assert.strictEqual((await plus.index()).toString(), toWei("1.2"));
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("16.8"));
        assert.strictEqual((await plus.totalShares()).toString(), toWei("14"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("10"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("12"));
        assert.strictEqual((await plus.userShare(user2)).toString(), toWei("4"));
        assert.strictEqual((await plus.balanceOf(user2)).toString(), toWei("4.8"));
        assert.strictEqual((await plus.totalUnderlying()).toString(), toWei("16.8"));

        await plus.donate(MAX, {from: user1});

        // After donation, it seems that 12 plus is redeemed
        assert.strictEqual((await plus.index()).toString(), toWei("1.2"));
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("4.8"));
        assert.strictEqual((await plus.totalShares()).toString(), toWei("4"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("0"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("0"));
        assert.strictEqual((await plus.userShare(user2)).toString(), toWei("4"));
        assert.strictEqual((await plus.balanceOf(user2)).toString(), toWei("4.8"));
        assert.strictEqual((await plus.totalUnderlying()).toString(), toWei("16.8"));
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("3.5"));
        await plus.rebase();

        // After the next rebase, the 7.2 plus is distributed evenly to all users!
        assert.strictEqual((await plus.index()).toString(), toWei("4.2"));
        assert.strictEqual((await plus.totalSupply()).toString(), toWei("16.8"));
        assert.strictEqual((await plus.totalShares()).toString(), toWei("4"));
        assert.strictEqual((await plus.userShare(user1)).toString(), toWei("0"));
        assert.strictEqual((await plus.balanceOf(user1)).toString(), toWei("0"));
        assert.strictEqual((await plus.userShare(user2)).toString(), toWei("4"));
        assert.strictEqual((await plus.balanceOf(user2)).toString(), toWei("16.8"));
        assert.strictEqual((await plus.liquidityRatio()).toString(), toWei("1"));
        assert.strictEqual((await plus.totalUnderlying()).toString(), toWei("16.8"));
    });
});
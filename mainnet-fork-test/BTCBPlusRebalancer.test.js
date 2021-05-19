const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const BTCBPlusRebalancer = artifacts.require("BTCBPlusRebalancer");
const SinglePlus = artifacts.require("SinglePlus");
const CompositePlus = artifacts.require("CompositePlus");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const BTCB = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c";
const VBTC_PLUS = "0xcf8D1D3Fce7C2138F85889068e50F0e7a18b5321";
const ACSBTCB_PLUS = "0xD7806143A4206aa9A816b964e4c994F533b830b0";
const SIMPLE_BTCB_PLUS = "0xb3d90840B5bDBc78b456B246ABD80dCA404ACD4b";
const BTCB_PLUS = "0xe884E6695C4cB3c8DEFFdB213B50f5C2a1a9E0A2";
const DEPLOYER = "0x2932516D9564CB799DDA2c16559caD5b8357a0D6";

const BN = web3.utils.BN;
const toWei = web3.utils.toWei;
const MAX = new BN(2).pow(new BN(256)).sub(new BN(1));

const assertAlmostEqual = function(actualOrig, expectedOrig) {
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

/**
 * Start Mainnet fork node on BSC:
 * ganache-cli --fork https://bsc-dataseed.binance.org/ -u "0x2932516D9564CB799DDA2c16559caD5b8357a0D6"
 * 
 * Run test:
 * truffle test mainnet-fork-test/BTCBPlusRebalancer.test.js
 */
contract("BTCBPlusRebalancer", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let btcb;
    let vbtcPlus;
    let acsbtcbPlus;
    let simplebtcbPlus;
    let btcbPlus;
    let rebalancer;

    let testAmount = toWei("0.1");

    before(async () => {
        btcb = await ERC20Upgradeable.at(BTCB);
        vbtcPlus = await SinglePlus.at(VBTC_PLUS);
        acsbtcbPlus = await SinglePlus.at(ACSBTCB_PLUS);
        simplebtcbPlus = await SinglePlus.at(SIMPLE_BTCB_PLUS);
        btcbPlus = await CompositePlus.at(BTCB_PLUS);
        rebalancer = await BTCBPlusRebalancer.new();
        await rebalancer.initialize({from: DEPLOYER});

        await btcbPlus.addToken(simplebtcbPlus.address, {from: DEPLOYER});

        await btcbPlus.setStrategist(rebalancer.address, true, {from: DEPLOYER});
        await btcbPlus.addRebalancer(rebalancer.address, {from: DEPLOYER});
    });
    it("should rebalance vBTC+ to acsBTCB+", async () => {
        await vbtcPlus.rebase();
        await acsbtcbPlus.rebase();
        await btcbPlus.rebase();

        const vBtcBefore = await vbtcPlus.balanceOf(BTCB_PLUS);
        const acsBtcbBefore = await acsbtcbPlus.balanceOf(BTCB_PLUS);
        const liquidityBefore = await btcbPlus.liquidityRatio();
        console.log("vBTC+ before: " + vBtcBefore.toString());
        console.log("acsBTCB+ before: " + acsBtcbBefore.toString());
        console.log("Total before: " + vBtcBefore.add(acsBtcbBefore).toString());
        console.log("Liquidity ratio before: " + liquidityBefore);
        console.log("----------------------------------------------");

        await rebalancer.vBTCPlusToAcsBTCBPlus(testAmount, {from: DEPLOYER});

        const vBtcAfter = await vbtcPlus.balanceOf(BTCB_PLUS);
        const acsBtcbAfter = await acsbtcbPlus.balanceOf(BTCB_PLUS);
        const liquidityAfter = await btcbPlus.liquidityRatio();
        console.log("vBTC+ after: " + vBtcAfter.toString());
        console.log("acsBTCB+ after: " + acsBtcbAfter.toString());
        console.log("Total after: " + vBtcAfter.add(acsBtcbAfter).toString());
        console.log("Liquidity ratio after: " + liquidityAfter);
        console.log("----------------------------------------------");

        console.log("vBTC+ diff: " + vBtcAfter.sub(vBtcBefore).toString());
        console.log("acsBTCB+ diff: " + acsBtcbAfter.sub(acsBtcbBefore).toString());
        console.log("Total diff: " + acsBtcbAfter.add(vBtcAfter).sub(acsBtcbBefore).sub(vBtcBefore).toString());
    });

    it("should rebalance acsBTCB+ to vBTCB+", async () => {
        await vbtcPlus.rebase();
        await acsbtcbPlus.rebase();
        await btcbPlus.rebase();

        const vBtcBefore = await vbtcPlus.balanceOf(BTCB_PLUS);
        const acsBtcbBefore = await acsbtcbPlus.balanceOf(BTCB_PLUS);
        const liquidityBefore = await btcbPlus.liquidityRatio();
        console.log("vBTC+ before: " + vBtcBefore.toString());
        console.log("acsBTCB+ before: " + acsBtcbBefore.toString());
        console.log("Total before: " + vBtcBefore.add(acsBtcbBefore).toString());
        console.log("Liquidity ratio before: " + liquidityBefore);
        console.log("----------------------------------------------");

        await rebalancer.acsBTCBPlusToVBTCPlus(testAmount, {from: DEPLOYER});

        const vBtcAfter = await vbtcPlus.balanceOf(BTCB_PLUS);
        const acsBtcbAfter = await acsbtcbPlus.balanceOf(BTCB_PLUS);
        const liquidityAfter = await btcbPlus.liquidityRatio();
        console.log("vBTC+ after: " + vBtcAfter.toString());
        console.log("acsBTCB+ after: " + acsBtcbAfter.toString());
        console.log("Total after: " + vBtcAfter.add(acsBtcbAfter).toString());
        console.log("Liquidity ratio after: " + liquidityAfter);
        console.log("----------------------------------------------");

        console.log("vBTC+ diff: " + vBtcAfter.sub(vBtcBefore).toString());
        console.log("acsBTCB+ diff: " + acsBtcbAfter.sub(acsBtcbBefore).toString());
        console.log("Total diff: " + acsBtcbAfter.add(vBtcAfter).sub(acsBtcbBefore).sub(vBtcBefore).toString());
    });

    it("should rebalance vBTC+ to simpleBTCB+", async () => {
        await vbtcPlus.rebase();
        await btcbPlus.rebase();

        const vBtcBefore = await vbtcPlus.balanceOf(BTCB_PLUS);
        const simpleBtcbBefore = await simplebtcbPlus.balanceOf(BTCB_PLUS);
        const liquidityBefore = await btcbPlus.liquidityRatio();
        console.log("vBTC+ before: " + vBtcBefore.toString());
        console.log("simpleBTCB+ before: " + simpleBtcbBefore.toString());
        console.log("Total before: " + vBtcBefore.add(simpleBtcbBefore).toString());
        console.log("Liquidity ratio before: " + liquidityBefore);
        console.log("----------------------------------------------");

        await rebalancer.vBTCPlusToSimpleBTCBPlus(testAmount, {from: DEPLOYER});

        const vBtcAfter = await vbtcPlus.balanceOf(BTCB_PLUS);
        const simpleBtcbAfter = await simplebtcbPlus.balanceOf(BTCB_PLUS);
        const liquidityAfter = await btcbPlus.liquidityRatio();
        console.log("vBTC+ after: " + vBtcAfter.toString());
        console.log("simpleBTCB+ after: " + simpleBtcbAfter.toString());
        console.log("Total after: " + vBtcAfter.add(simpleBtcbAfter).toString());
        console.log("Liquidity ratio after: " + liquidityAfter);
        console.log("----------------------------------------------");

        console.log("vBTC+ diff: " + vBtcAfter.sub(vBtcBefore).toString());
        console.log("simpleBTCB+ diff: " + simpleBtcbAfter.sub(simpleBtcbBefore).toString());
        console.log("Total diff: " + simpleBtcbAfter.add(vBtcAfter).sub(simpleBtcbBefore).sub(vBtcBefore).toString());
    });

    it("should rebalance acsBTCB+ to simpleBTCB+", async () => {
        await acsbtcbPlus.rebase();
        await btcbPlus.rebase();

        const simpleBtcbBefore = await simplebtcbPlus.balanceOf(BTCB_PLUS);
        const acsBtcbBefore = await acsbtcbPlus.balanceOf(BTCB_PLUS);
        const liquidityBefore = await btcbPlus.liquidityRatio();
        console.log("simpleBTC+ before: " + simpleBtcbBefore.toString());
        console.log("acsBTCB+ before: " + acsBtcbBefore.toString());
        console.log("Total before: " + simpleBtcbBefore.add(acsBtcbBefore).toString());
        console.log("Liquidity ratio before: " + liquidityBefore);
        console.log("----------------------------------------------");

        await rebalancer.acsBTCBPlusToSimpleBTCBPlus(testAmount, {from: DEPLOYER});

        const simpleBtcbAfter = await simplebtcbPlus.balanceOf(BTCB_PLUS);
        const acsBtcbAfter = await acsbtcbPlus.balanceOf(BTCB_PLUS);
        const liquidityAfter = await btcbPlus.liquidityRatio();
        console.log("simpleBTC+ after: " + simpleBtcbAfter.toString());
        console.log("acsBTCB+ after: " + acsBtcbAfter.toString());
        console.log("Total after: " + simpleBtcbAfter.add(acsBtcbAfter).toString());
        console.log("Liquidity ratio after: " + liquidityAfter);
        console.log("----------------------------------------------");

        console.log("simpleBTC+ diff: " + simpleBtcbAfter.sub(simpleBtcbBefore).toString());
        console.log("acsBTCB+ diff: " + acsBtcbAfter.sub(acsBtcbBefore).toString());
        console.log("Total diff: " + acsBtcbAfter.add(simpleBtcbAfter).sub(acsBtcbBefore).sub(simpleBtcbBefore).toString());
    });
});
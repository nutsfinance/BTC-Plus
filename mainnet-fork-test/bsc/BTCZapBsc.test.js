const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const BTCZapBsc = artifacts.require("BTCZapBsc");
const SinglePlus = artifacts.require("SinglePlus");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const BTCB = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c";
const VBTC_PLUS = "0xcf8D1D3Fce7C2138F85889068e50F0e7a18b5321";
const FBTCB_PLUS = "0x73FddFb941c11d16C827169Bb94aCC227841C396";
const ACSBTCB_PLUS = "0xD7806143A4206aa9A816b964e4c994F533b830b0";
const BELTBTC_PLUS = "0x50c5E29277b0Bc4c9b0377295d94F8798a5026a8";
const DEPLOYER = "0x098d907E1A3F26cC65B8ACa1c37E41B208699bac";

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
 * ganache-cli --fork https://bsc-dataseed.binance.org/ -u "0x098d907E1A3F26cC65B8ACa1c37E41B208699bac"
 * 
 * Run test:
 * truffle test mainnet-fork-test/bsc/BTCZapBsc.test.js
 */
contract("BTCZapBsc", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let btcb;
    let vbtcPlus;
    let fbtcbPlus;
    let acsbtcbPlus;
    let beltBTCPlus;
    let zap;

    let testAmount = "0.0001";

    beforeEach(async () => {
        btcb = await ERC20Upgradeable.at(BTCB);
        vbtcPlus = await SinglePlus.at(VBTC_PLUS);
        fbtcbPlus = await SinglePlus.at(FBTCB_PLUS);
        acsbtcbPlus = await SinglePlus.at(ACSBTCB_PLUS);
        beltBTCPlus = await SinglePlus.at(BELTBTC_PLUS);
        zap = await BTCZapBsc.new();
        await zap.initialize({from: DEPLOYER});
        await btcb.approve(zap.address, toWei("1"), {from: DEPLOYER});
    });
    it("should mint and redeem vBTC+", async () => {
        const balance1 = await vbtcPlus.balanceOf(DEPLOYER);
        const btcb1 = await btcb.balanceOf(DEPLOYER);
        console.log('vBTC+ Balance 1: ' + balance1.toString());
        console.log(`BTCB balance 1: ${btcb1.toString()}`);

        await zap.mintVBTCPlus(toWei(testAmount), {from: DEPLOYER});
        const balance2 = await vbtcPlus.balanceOf(DEPLOYER);
        const btcb2 = await btcb.balanceOf(DEPLOYER);
        console.log('vBTC+ Balance 2: ' + balance2.toString());
        console.log(`BTCB balance 2: ${btcb2.toString()}`);
        console.log(`Liquidity ratio: ${(await vbtcPlus.liquidityRatio()).toString()}`);

        assert.strictEqual((await btcb.balanceOf(zap.address)).toString(), "0");
        assertAlmostEqual(balance2.sub(balance1), toWei(testAmount));
        assertAlmostEqual(btcb2.add(new BN(toWei(testAmount))), btcb1);

        await vbtcPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemVBTCPlus(balance2, {from: DEPLOYER});

        const balance3 = await vbtcPlus.balanceOf(DEPLOYER);
        const btcb3 = await btcb.balanceOf(DEPLOYER);
        console.log('vBTC+ Balance 3: ' + balance3.toString());
        console.log(`BTCB balance 3: ${btcb3.toString()}`);
        assert.strictEqual((await btcb.balanceOf(zap.address)).toString(), "0");
        assertAlmostEqual(balance3, "0");
        assertAlmostEqual(btcb1, btcb3);

        const diff = btcb1.toNumber() - btcb3.toNumber();
        console.log(`Diff: ${diff / 1000000000000000000}`);
        console.log(`Diff ratio: ${diff * 100 / btcb1.toNumber()}`);
    });

    it("should mint and redeem fBTC+", async () => {
        const balance1 = await fbtcbPlus.balanceOf(DEPLOYER);
        const btcb1 = await btcb.balanceOf(DEPLOYER);
        console.log('fBTCB+ Balance 1: ' + balance1.toString());
        console.log(`BTCB balance 1: ${btcb1.toString()}`);

        await zap.mintFBTCBPlus(toWei(testAmount), {from: DEPLOYER});
        const balance2 = await fbtcbPlus.balanceOf(DEPLOYER);
        const btcb2 = await btcb.balanceOf(DEPLOYER);
        console.log('fBTCB+ Balance 2: ' + balance2.toString());
        console.log(`BTCB balance 2: ${btcb2.toString()}`);
        console.log(`Liquidity ratio: ${(await fbtcbPlus.liquidityRatio()).toString()}`);

        assert.strictEqual((await btcb.balanceOf(zap.address)).toString(), "0");
        assertAlmostEqual(balance2.sub(balance1), toWei(testAmount));
        assertAlmostEqual(btcb2.add(new BN(toWei(testAmount))), btcb1);

        await fbtcbPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemFBTCBPlus(balance2, {from: DEPLOYER});

        const balance3 = await fbtcbPlus.balanceOf(DEPLOYER);
        const btcb3 = await btcb.balanceOf(DEPLOYER);
        console.log('fBTCB+ Balance 3: ' + balance3.toString());
        console.log(`BTCB balance 3: ${btcb3.toString()}`);
        assert.strictEqual((await btcb.balanceOf(zap.address)).toString(), "0");
        assertAlmostEqual(balance3, "0");
        assertAlmostEqual(btcb1, btcb3);

        const diff = btcb1.toNumber() - btcb3.toNumber();
        console.log(`Diff: ${diff / 1000000000000000000}`);
        console.log(`Diff ratio: ${diff * 100 / btcb1.toNumber()}`);
    });

    it("should mint and redeem acsBTC+", async () => {
        const balance1 = await acsbtcbPlus.balanceOf(DEPLOYER);
        const btcb1 = await btcb.balanceOf(DEPLOYER);
        console.log('acsBTCB+ Balance 1: ' + balance1.toString());
        console.log(`BTCB balance 1: ${btcb1.toString()}`);

        await zap.mintAcsBTCBPlus(toWei(testAmount), {from: DEPLOYER});
        const balance2 = await acsbtcbPlus.balanceOf(DEPLOYER);
        const btcb2 = await btcb.balanceOf(DEPLOYER);
        console.log('acsBTCB+ Balance 2: ' + balance2.toString());
        console.log(`BTCB balance 2: ${btcb2.toString()}`);
        console.log(`Liquidity ratio: ${(await acsbtcbPlus.liquidityRatio()).toString()}`);

        assert.strictEqual((await btcb.balanceOf(zap.address)).toString(), "0");
        assertAlmostEqual(balance2.sub(balance1), toWei(testAmount));
        assertAlmostEqual(btcb2.add(new BN(toWei(testAmount))), btcb1);

        await acsbtcbPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAcsBTCBPlus(balance2, {from: DEPLOYER});

        const balance3 = await acsbtcbPlus.balanceOf(DEPLOYER);
        const btcb3 = await btcb.balanceOf(DEPLOYER);
        console.log('acsBTCB+ Balance 3: ' + balance3.toString());
        console.log(`BTCB balance 3: ${btcb3.toString()}`);
        assert.strictEqual((await btcb.balanceOf(zap.address)).toString(), "0");
        assertAlmostEqual(balance3, "0");
        
        const diff = btcb1.toNumber() - btcb3.toNumber();
        console.log(`Diff: ${diff / 1000000000000000000}`);
        console.log(`Diff ratio: ${diff * 100 / btcb1.toNumber()}`);
    });

    it("should mint and redeem beltBTC+", async () => {
        const balance1 = await beltBTCPlus.balanceOf(DEPLOYER);
        const btcb1 = await btcb.balanceOf(DEPLOYER);
        console.log('beltBTC+ Balance 1: ' + balance1.toString());
        console.log(`BTCB balance 1: ${btcb1.toString()}`);

        await zap.mintBeltBTCPlus(toWei(testAmount), {from: DEPLOYER});
        const balance2 = await beltBTCPlus.balanceOf(DEPLOYER);
        const btcb2 = await btcb.balanceOf(DEPLOYER);
        console.log('beltBTC+ Balance 2: ' + balance2.toString());
        console.log(`BTCB balance 2: ${btcb2.toString()}`);

        assert.strictEqual((await btcb.balanceOf(zap.address)).toString(), "0");
        assertAlmostEqual(balance2.sub(balance1), toWei(testAmount));
        assertAlmostEqual(btcb2.add(new BN(toWei(testAmount))), btcb1);

        await beltBTCPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemBeltBTCPlus(balance2, {from: DEPLOYER});

        const balance3 = await beltBTCPlus.balanceOf(DEPLOYER);
        const btcb3 = await btcb.balanceOf(DEPLOYER);
        console.log('beltBTC+ Balance 3: ' + balance3.toString());
        console.log(`BTCB balance 3: ${btcb3.toString()}`);
        assert.strictEqual((await btcb.balanceOf(zap.address)).toString(), "0");
        assertAlmostEqual(balance3, "0");
        assertAlmostEqual(btcb1, btcb3);

        const diff = btcb1.toNumber() - btcb3.toNumber();
        console.log(`Diff: ${diff / 1000000000000000000}`);
        console.log(`Diff ratio: ${diff * 100 / btcb1.toNumber()}`);
    });
});
const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const BTCZapBsc = artifacts.require("BTCZapBsc");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const BTCB = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c";
const VBTC_PLUS = "0xcf8D1D3Fce7C2138F85889068e50F0e7a18b5321";
const FBTCB_PLUS = "0x73FddFb941c11d16C827169Bb94aCC227841C396";
const ACSBTCB_PLUS = "0xD7806143A4206aa9A816b964e4c994F533b830b0";
const AUTOBTC_PLUS = "0x02827D495B2bBe37e1C021eB91BCdCc92cD3b604";
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
 * truffle test mainnet-fork-test/BTCZapBsc.test.js
 */
contract("BTCZapBsc", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let btcb;
    let vbtcPlus;
    let fbtcbPlus;
    let acsbtcbPlus;
    let autobtcPlus;
    let zap;

    beforeEach(async () => {
        btcb = await ERC20Upgradeable.at(BTCB);
        vbtcPlus = await ERC20Upgradeable.at(VBTC_PLUS);
        fbtcbPlus = await ERC20Upgradeable.at(FBTCB_PLUS);
        acsbtcbPlus = await ERC20Upgradeable.at(ACSBTCB_PLUS);
        autobtcPlus = await ERC20Upgradeable.at(AUTOBTC_PLUS);
        zap = await BTCZapBsc.new();
        await btcb.approve(zap.address, toWei("1"), {from: DEPLOYER});
    });
    it("should mint and redeem vBTC+", async () => {
        const balance1 = await vbtcPlus.balanceOf(DEPLOYER);
        console.log('Balance 1: ' + balance1.toString());
        await zap.mintVBTCPlus(toWei("0.0001"), {from: DEPLOYER});
        const balance2 = await vbtcPlus.balanceOf(DEPLOYER);
        console.log('Balance 2: ' + balance2.toString());

        assertAlmostEqual(balance2.sub(balance1), toWei("0.0001"));

        await vbtcPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemVBTCPlus(balance2, {from: DEPLOYER});

        const balance3 = await vbtcPlus.balanceOf(DEPLOYER);
        console.log('Balance 3: ' + balance3.toString());
        assertAlmostEqual(balance3, "0");
    });

    it("should mint and redeem fBTC+", async () => {
        const balance1 = await fbtcbPlus.balanceOf(DEPLOYER);
        console.log('Balance 1: ' + balance1.toString());
        await zap.mintFBTCBPlus(toWei("0.0001"), {from: DEPLOYER});
        const balance2 = await fbtcbPlus.balanceOf(DEPLOYER);
        console.log('Balance 2: ' + balance2.toString());

        assertAlmostEqual(balance2.sub(balance1), toWei("0.0001"));

        await fbtcbPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemFBTCBPlus(balance2, {from: DEPLOYER});

        const balance3 = await fbtcbPlus.balanceOf(DEPLOYER);
        console.log('Balance 3: ' + balance3.toString());
        assertAlmostEqual(balance3, "0");
    });

    it("should mint and redeem acsBTC+", async () => {
        const balance1 = await acsbtcbPlus.balanceOf(DEPLOYER);
        console.log('Balance 1: ' + balance1.toString());
        await zap.mintAcsBTCBPlus(toWei("0.0001"), {from: DEPLOYER});
        const balance2 = await acsbtcbPlus.balanceOf(DEPLOYER);
        console.log('Balance 2: ' + balance2.toString());

        assertAlmostEqual(balance2.sub(balance1), toWei("0.0001"));

        await acsbtcbPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAcsBTCBPlus(balance2, {from: DEPLOYER});

        const balance3 = await acsbtcbPlus.balanceOf(DEPLOYER);
        console.log('Balance 3: ' + balance3.toString());
        assertAlmostEqual(balance3, "0");
    });

    it("should mint and redeem BTC+", async () => {
        const balance1 = await autobtcPlus.balanceOf(DEPLOYER);
        console.log('Balance 1: ' + balance1.toString());
        await zap.mintAutoBTCPlus(toWei("0.0001"), {from: DEPLOYER});
        const balance2 = await autobtcPlus.balanceOf(DEPLOYER);
        console.log('Balance 2: ' + balance2.toString());

        assertAlmostEqual(balance2.sub(balance1), toWei("0.0001"));

        await autobtcPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAutoBTCPlus(balance2, {from: DEPLOYER});

        const balance3 = await autobtcPlus.balanceOf(DEPLOYER);
        console.log('Balance 3: ' + balance3.toString());
        assertAlmostEqual(balance3, "0");
    });
});
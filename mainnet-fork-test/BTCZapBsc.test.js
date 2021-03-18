const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const BTCZapBsc = artifacts.require("BTCZapBsc");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const BTCB = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c";
const VBTC_PLUS = "0x0AbfEf458cc4C4f23ebc992F2B5CcEC9ECD1869d";
const FBTCB_PLUS = "0xD7F984196392C7eA791F4A39e797e8dE19Ca898d";
const ACSBTCB_PLUS = "0xf52F3E8fF896abC844BE2EbF4809Bc22123D3a57";
const AUTOBTC_PLUS = "0x33938f7f60E276a5eD0474B905E77C9708C9135A";
const DEPLOYER = "0x098d907E1A3F26cC65B8ACa1c37E41B208699bac";

const BN = web3.utils.BN;
const toWei = web3.utils.toWei;
const MAX = new BN(2).pow(new BN(256)).sub(new BN(1));

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
    let acsbtcbPus;
    let autobtcPlus;
    let zap;

    beforeEach(async () => {
        btcb = await ERC20Upgradeable.at(BTCB);
        vbtcPlus = await ERC20Upgradeable.at(VBTC_PLUS);
        fbtcbPlus = await ERC20Upgradeable.at(FBTCB_PLUS);
        acsbtcbPus = await ERC20Upgradeable.at(ACSBTCB_PLUS);
        autobtcPlus = await ERC20Upgradeable.at(AUTOBTC_PLUS);
        zap = await BTCZapBsc.new();
        await btcb.approve(zap.address, toWei("1"), {from: DEPLOYER});
    });
    it("should mint vBTC+", async () => {
        const balance1 = await vbtcPlus.balanceOf(DEPLOYER);
        console.log('Balance 1: ' + balance1.toString());
        await zap.mintVBTCPlus(toWei("0.0001"), {from: DEPLOYER});
        const balance2 = await vbtcPlus.balanceOf(DEPLOYER);
        console.log('Balance 2: ' + balance2.toString());

        assertAlmostEqual(balance2.sub(balance1), toWei("0.0001"));

        await zap.redeemVBTCPlus(balance2, {from: DEPLOYER});

        const balance3 = await vbtcPlus.balanceOf(DEPLOYER);
        console.log('Balance 3: ' + balance3.toString());
        assertAlmostEqual(balance3, "0");
    });

    it("should mint fBTC+", async () => {
        const balance1 = await fbtcbPlus.balanceOf(DEPLOYER);
        console.log('Balance 1: ' + balance1.toString());
        await zap.mintFBTCBPlus(toWei("0.0001"), {from: DEPLOYER});
        const balance2 = await fbtcbPlus.balanceOf(DEPLOYER);
        console.log('Balance 2: ' + balance2.toString());

        assertAlmostEqual(balance2.sub(balance1), toWei("0.0001"));

        await zap.redeemVBTCPlus(balance2, {from: DEPLOYER});

        const balance3 = await fbtcbPlus.balanceOf(DEPLOYER);
        console.log('Balance 3: ' + balance3.toString());
        assertAlmostEqual(balance3, "0");
    });
});
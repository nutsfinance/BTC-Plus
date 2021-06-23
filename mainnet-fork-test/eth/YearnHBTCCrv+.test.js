const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const YearnHBTCCrvPlus = artifacts.require("YearnHBTCCrvPlus");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const YEARN_HBTC_CRV = "0x625b7DF2fa8aBe21B0A976736CDa4775523aeD1E";
const YEARN_HBTC_CRV_PLUS = "0x5337428ea483495523fb40A2D8b2F4D607e2Eb5d";
const DEPLOYER = "0x2932516D9564CB799DDA2c16559caD5b8357a0D6";
const USER = "0xEeff6fd32DeaFe1a9d3258A51c7F952F9FF0B2Ce";

const BN = web3.utils.BN;
const toWei = web3.utils.toWei;
const MAX = new BN(2).pow(new BN(256)).sub(new BN(1));

async function timeIncreaseTo (seconds) {
    const delay = 10 - new Date().getMilliseconds();
    await new Promise(resolve => setTimeout(resolve, delay));
    await time.increaseTo(seconds);
}

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
 * Start Mainnet fork node:
 * ganache-cli --fork https://mainnet.infura.io/v3/0df468116d40490fb2929a8d6664b1d2 -u "0xEeff6fd32DeaFe1a9d3258A51c7F952F9FF0B2Ce" -u "0x2932516D9564CB799DDA2c16559caD5b8357a0D6"
 * 
 * Run test:
 * truffle test mainnet-fork-test/eth/YearnHBTCCrv+.test.js
 */
contract("YearnHBTCCrv+", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let yHBTCCrv;
    let yHBTCCrvPlus;
    let startTime;

    beforeEach(async () => {
        yHBTCCrv = await ERC20Upgradeable.at(YEARN_HBTC_CRV);
        yHBTCCrvPlus = await YearnHBTCCrvPlus.at(YEARN_HBTC_CRV_PLUS);
        startTime = (await time.latest()).addn(10);
    });
    it("should mint yHBTCCrv", async () => {
        const totalSupply1 = await yHBTCCrvPlus.totalSupply();
        const balance1 = await yHBTCCrvPlus.balanceOf(USER);
        console.log('yHBTCCrv+ total supply 1: ', totalSupply1.toString());
        console.log('yHBTCCrv+ balance 1: ', balance1.toString());
        console.log('yHBTCCrv balance 1: ', (await yHBTCCrv.balanceOf(USER)).toString());

        await yHBTCCrv.approve(yHBTCCrvPlus.address, toWei("0.01"), {from: USER});
        await yHBTCCrvPlus.mint(toWei("0.01"), {from: USER});

        const totalSupply2 = await yHBTCCrvPlus.totalSupply();
        const balance2 = await yHBTCCrvPlus.balanceOf(USER);
        console.log('yHBTCCrv+ total supply 2: ', totalSupply2.toString());
        console.log('yHBTCCrv+ balance 2: ', balance2.toString());

        await timeIncreaseTo(startTime.addn(5000));
        await yHBTCCrvPlus.harvest({from: DEPLOYER});

        const totalSupply3 = await yHBTCCrvPlus.totalSupply();
        const balance3 = await yHBTCCrvPlus.balanceOf(USER);
        console.log('yHBTCCrv+ total supply 3: ', totalSupply3.toString());
        console.log('yHBTCCrv+ balance 3: ', balance3.toString());

        await yHBTCCrvPlus.redeem(MAX, {from: USER});
        const totalSupply4 = await yHBTCCrvPlus.totalSupply();
        const balance4 = await yHBTCCrvPlus.balanceOf(USER);
        console.log('yHBTCCrv+ total supply 4: ', totalSupply4.toString());
        console.log('yHBTCCrv+ balance 4: ', balance4.toString());
    });
});
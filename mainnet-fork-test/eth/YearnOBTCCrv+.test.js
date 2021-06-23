const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const YearnOBTCCrvPlus = artifacts.require("YearnOBTCCrvPlus");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const YEARN_OBTC_CRV = "0xe9Dc63083c464d6EDcCFf23444fF3CFc6886f6FB";
const YEARN_OBTC_CRV_PLUS = "0xf5D0877D4f1Ae13618DEDE84295787AFA65314df";
const DEPLOYER = "0x2932516D9564CB799DDA2c16559caD5b8357a0D6";
const USER = "0xB8a2B0331F0046d379E6F3402D412E3C6B17d0Af";

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
 * ganache-cli --fork https://mainnet.infura.io/v3/0df468116d40490fb2929a8d6664b1d2 -u "0xB8a2B0331F0046d379E6F3402D412E3C6B17d0Af" -u "0x2932516D9564CB799DDA2c16559caD5b8357a0D6"
 * 
 * Run test:
 * truffle test mainnet-fork-test/eth/YearnOBTCCrv+.test.js
 */
contract("YearnOBTCCrv+", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let yOBTCCrv;
    let yOBTCCrvPlus;
    let startTime;

    beforeEach(async () => {
        yOBTCCrv = await ERC20Upgradeable.at(YEARN_OBTC_CRV);
        yOBTCCrvPlus = await YearnOBTCCrvPlus.at(YEARN_OBTC_CRV_PLUS);
        startTime = (await time.latest()).addn(10);
    });
    it("should mint yOBTCCrv", async () => {
        const totalSupply1 = await yOBTCCrvPlus.totalSupply();
        const balance1 = await yOBTCCrvPlus.balanceOf(USER);
        console.log('yOBTCCrv+ total supply 1: ', totalSupply1.toString());
        console.log('yOBTCCrv+ balance 1: ', balance1.toString());
        console.log('yOBTCCrv balance 1: ', (await yOBTCCrv.balanceOf(USER)).toString());

        await yOBTCCrv.approve(yOBTCCrvPlus.address, toWei("0.01"), {from: USER});
        await yOBTCCrvPlus.mint(toWei("0.01"), {from: USER});

        const totalSupply2 = await yOBTCCrvPlus.totalSupply();
        const balance2 = await yOBTCCrvPlus.balanceOf(USER);
        console.log('yOBTCCrv+ total supply 2: ', totalSupply2.toString());
        console.log('yOBTCCrv+ balance 2: ', balance2.toString());

        await timeIncreaseTo(startTime.addn(5000));
        await yOBTCCrvPlus.harvest({from: DEPLOYER});

        const totalSupply3 = await yOBTCCrvPlus.totalSupply();
        const balance3 = await yOBTCCrvPlus.balanceOf(USER);
        console.log('yOBTCCrv+ total supply 3: ', totalSupply3.toString());
        console.log('yOBTCCrv+ balance 3: ', balance3.toString());

        await yOBTCCrvPlus.redeem(MAX, {from: USER});
        const totalSupply4 = await yOBTCCrvPlus.totalSupply();
        const balance4 = await yOBTCCrvPlus.balanceOf(USER);
        console.log('yOBTCCrv+ total supply 4: ', totalSupply4.toString());
        console.log('yOBTCCrv+ balance 4: ', balance4.toString());
    });
});
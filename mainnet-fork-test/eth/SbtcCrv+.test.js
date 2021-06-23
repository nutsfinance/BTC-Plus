const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const SbtcCrvPlus = artifacts.require("SbtcCrvPlus");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const SBTC_CRV = "0x075b1bb99792c9E1041bA13afEf80C91a1e70fB3";
const SBTC_CRV_PLUS = "0xE7D839c303C4C8d0B0094019663D2111A689F531";
const DEPLOYER = "0x2932516D9564CB799DDA2c16559caD5b8357a0D6";
const USER = "0x282742940eE0b7ed028Bb48052Bb4922282234dA";

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
 * ganache-cli --fork https://mainnet.infura.io/v3/0df468116d40490fb2929a8d6664b1d2 -u "0x282742940eE0b7ed028Bb48052Bb4922282234dA" -u "0x2932516D9564CB799DDA2c16559caD5b8357a0D6"
 * 
 * Run test:
 * truffle test mainnet-fork-test/eth/SbtcCrv+.test.js
 */
contract("SbtcCrv+", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let sbtcCrv;
    let sbtcCrvPlus;
    let startTime;

    beforeEach(async () => {
        sbtcCrv = await ERC20Upgradeable.at(SBTC_CRV);
        sbtcCrvPlus = await SbtcCrvPlus.at(SBTC_CRV_PLUS);
        startTime = (await time.latest()).addn(10);
    });
    it("should mint sbtcCrv", async () => {
        const totalSupply1 = await sbtcCrvPlus.totalSupply();
        const balance1 = await sbtcCrvPlus.balanceOf(USER);
        console.log('sbtcCrv+ total supply 1: ', totalSupply1.toString());
        console.log('sbtcCrv+ balance 1: ', balance1.toString());
        console.log('sbtcCrv balance 1: ', (await sbtcCrv.balanceOf(USER)).toString());

        await sbtcCrv.approve(sbtcCrvPlus.address, toWei("0.01"), {from: USER});
        await sbtcCrvPlus.mint(toWei("0.01"), {from: USER});

        const totalSupply2 = await sbtcCrvPlus.totalSupply();
        const balance2 = await sbtcCrvPlus.balanceOf(USER);
        console.log('sbtcCrv+ total supply 2: ', totalSupply2.toString());
        console.log('sbtcCrv+ balance 2: ', balance2.toString());

        await timeIncreaseTo(startTime.addn(5000));
        await sbtcCrvPlus.harvest({from: DEPLOYER});

        const totalSupply3 = await sbtcCrvPlus.totalSupply();
        const balance3 = await sbtcCrvPlus.balanceOf(USER);
        console.log('sbtcCrv+ total supply 3: ', totalSupply3.toString());
        console.log('sbtcCrv+ balance 3: ', balance3.toString());

        await sbtcCrvPlus.redeem(MAX, {from: USER});
        const totalSupply4 = await sbtcCrvPlus.totalSupply();
        const balance4 = await sbtcCrvPlus.balanceOf(USER);
        console.log('sbtcCrv+ total supply 4: ', totalSupply4.toString());
        console.log('sbtcCrv+ balance 4: ', balance4.toString());
    });
});
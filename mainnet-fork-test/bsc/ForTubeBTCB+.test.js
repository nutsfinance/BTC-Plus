const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const ForTubeBTCBPlus = artifacts.require("ForTubeBTCBPlus");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const FORTUBE_BTCB = "0xb5C15fD55C73d9BeeC046CB4DAce1e7975DcBBBc";
const FORTUBE_BTCB_PLUS = "0x73FddFb941c11d16C827169Bb94aCC227841C396";
const DEPLOYER = "0x2932516D9564CB799DDA2c16559caD5b8357a0D6";
const USER = "0x8330DcfE6cfC45863d547e26545682C358F152a2";

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
 * ganache-cli --fork https://bsc-dataseed.binance.org/ -u "0x8330DcfE6cfC45863d547e26545682C358F152a2" -u "0x2932516D9564CB799DDA2c16559caD5b8357a0D6"
 * 
 * Run test:
 * truffle test mainnet-fork-test/bsc/ForTubeBTCB+.test.js
 */
contract("ForTubeBTCBPlus+", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let fortubeBTCB;
    let fortubeBTCBPlus;
    let startTime;

    beforeEach(async () => {
        fortubeBTCB = await ERC20Upgradeable.at(FORTUBE_BTCB);
        fortubeBTCBPlus = await ForTubeBTCBPlus.at(FORTUBE_BTCB_PLUS);

        startTime = (await time.latest()).addn(10);
    });
    it("should mint fortubeBTCB", async () => {
        const totalSupply1 = await fortubeBTCBPlus.totalSupply();
        const balance1 = await fortubeBTCBPlus.balanceOf(USER);
        console.log('fortubeBTCB+ total supply 1: ', totalSupply1.toString());
        console.log('fortubeBTCB+ balance 1: ', balance1.toString());
        console.log('fortubeBTCB balance 1: ', (await fortubeBTCB.balanceOf(USER)).toString());

        await fortubeBTCB.approve(fortubeBTCBPlus.address, toWei("0.1"), {from: USER});
        await fortubeBTCBPlus.mint(toWei("0.01"), {from: USER});

        const totalSupply2 = await fortubeBTCBPlus.totalSupply();
        const balance2 = await fortubeBTCBPlus.balanceOf(USER);
        console.log('fortubeBTCB+ total supply 2: ', totalSupply2.toString());
        console.log('fortubeBTCB+ balance 2: ', balance2.toString());

        await fortubeBTCBPlus.invest({from: DEPLOYER});
        await timeIncreaseTo(startTime.addn(50000));
        await fortubeBTCBPlus.harvest({from: DEPLOYER});

        const totalSupply3 = await fortubeBTCBPlus.totalSupply();
        const balance3 = await fortubeBTCBPlus.balanceOf(USER);
        console.log('fortubeBTCB+ total supply 3: ', totalSupply3.toString());
        console.log('fortubeBTCB+ balance 3: ', balance3.toString());

        await fortubeBTCBPlus.redeem(MAX, {from: USER});
        const totalSupply4 = await fortubeBTCBPlus.totalSupply();
        const balance4 = await fortubeBTCBPlus.balanceOf(USER);
        console.log('fortubeBTCB+ total supply 4: ', totalSupply4.toString());
        console.log('fortubeBTCB+ balance 4: ', balance4.toString());
    });
});
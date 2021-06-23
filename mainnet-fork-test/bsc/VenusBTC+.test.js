const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const VenusBTCPlus = artifacts.require("VenusBTCPlus");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const VENUS_BTC = "0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B";
const VENUS_BTC_PLUS = "0xcf8D1D3Fce7C2138F85889068e50F0e7a18b5321";
const DEPLOYER = "0x2932516D9564CB799DDA2c16559caD5b8357a0D6";
const USER = "0x57057310C205Ea138cE1cD9FAE004c25632acc16";

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
 * ganache-cli --fork https://bsc-dataseed.binance.org/ -u "0x57057310C205Ea138cE1cD9FAE004c25632acc16" -u "0x2932516D9564CB799DDA2c16559caD5b8357a0D6"
 * 
 * Run test:
 * truffle test mainnet-fork-test/bsc/VenusBTC+.test.js
 */
contract("VenusBTCPlus+", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let venusBTC;
    let venusBTCPlus;
    let startTime;

    beforeEach(async () => {
        venusBTC = await ERC20Upgradeable.at(VENUS_BTC);
        venusBTCPlus = await VenusBTCPlus.at(VENUS_BTC_PLUS);

        startTime = (await time.latest()).addn(10);
    });
    it("should mint venusBTC", async () => {
        const totalSupply1 = await venusBTCPlus.totalSupply();
        const balance1 = await venusBTCPlus.balanceOf(USER);
        console.log('venusBTC+ total supply 1: ', totalSupply1.toString());
        console.log('venusBTC+ balance 1: ', balance1.toString());
        console.log('venusBTC balance 1: ', (await venusBTC.balanceOf(USER)).toString());

        await venusBTC.approve(venusBTCPlus.address, "10000000", {from: USER});
        await venusBTCPlus.mint("10000000", {from: USER});

        const totalSupply2 = await venusBTCPlus.totalSupply();
        const balance2 = await venusBTCPlus.balanceOf(USER);
        console.log('venusBTC+ total supply 2: ', totalSupply2.toString());
        console.log('venusBTC+ balance 2: ', balance2.toString());

        await venusBTCPlus.invest({from: DEPLOYER});
        await timeIncreaseTo(startTime.addn(50000));
        await venusBTCPlus.harvest({from: DEPLOYER});

        const totalSupply3 = await venusBTCPlus.totalSupply();
        const balance3 = await venusBTCPlus.balanceOf(USER);
        console.log('venusBTC+ total supply 3: ', totalSupply3.toString());
        console.log('venusBTC+ balance 3: ', balance3.toString());

        await venusBTCPlus.redeem(MAX, {from: USER});
        const totalSupply4 = await venusBTCPlus.totalSupply();
        const balance4 = await venusBTCPlus.balanceOf(USER);
        console.log('venusBTC+ total supply 4: ', totalSupply4.toString());
        console.log('venusBTC+ balance 4: ', balance4.toString());
    });
});
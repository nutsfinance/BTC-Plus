const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const ACryptoSBTCPlus = artifacts.require("ACryptoSBTCBPlus");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const ACRYPTOS_BTC = "0x0395fCC8E1a1E30A1427D4079aF6E23c805E3eeF";
const ACRYPTOS_BTC_PLUS = "0xD7806143A4206aa9A816b964e4c994F533b830b0";
const DEPLOYER = "0x2932516D9564CB799DDA2c16559caD5b8357a0D6";
const USER = "0x70949dd62BcC1893C0628417418364e6C442329C";

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
 * ganache-cli --fork https://bsc-dataseed.binance.org/ -u "0x70949dd62BcC1893C0628417418364e6C442329C" -u "0x2932516D9564CB799DDA2c16559caD5b8357a0D6"
 * 
 * Run test:
 * truffle test mainnet-fork-test/bsc/ACryptoSBTC+.test.js
 */
contract("ACryptoSBTCPlus+", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let acsBTC;
    let acsBTCPlus;
    let startTime;

    beforeEach(async () => {
        acsBTC = await ERC20Upgradeable.at(ACRYPTOS_BTC);
        acsBTCPlus = await ACryptoSBTCPlus.at(ACRYPTOS_BTC_PLUS);

        startTime = (await time.latest()).addn(10);
    });
    it("should mint acsBTC", async () => {
        await acsBTCPlus.rebase();

        const totalSupply1 = await acsBTCPlus.totalSupply();
        const balance1 = await acsBTCPlus.balanceOf(USER);
        console.log('acsBTC+ total supply 1: ', totalSupply1.toString());
        console.log('acsBTC+ balance 1: ', balance1.toString());
        console.log('acsBTC balance 1: ', (await acsBTC.balanceOf(USER)).toString());

        await acsBTC.approve(acsBTCPlus.address, toWei("0.1"), {from: USER});
        await acsBTCPlus.mint(toWei("0.01"), {from: USER});

        const totalSupply2 = await acsBTCPlus.totalSupply();
        const balance2 = await acsBTCPlus.balanceOf(USER);
        console.log('acsBTC+ total supply 2: ', totalSupply2.toString());
        console.log('acsBTC+ balance 2: ', balance2.toString());

        await acsBTCPlus.invest({from: DEPLOYER});
        await timeIncreaseTo(startTime.addn(50000));
        await acsBTCPlus.harvest({from: DEPLOYER});

        const totalSupply3 = await acsBTCPlus.totalSupply();
        const balance3 = await acsBTCPlus.balanceOf(USER);
        console.log('acsBTC+ total supply 3: ', totalSupply3.toString());
        console.log('acsBTC+ balance 3: ', balance3.toString());

        await acsBTCPlus.redeem(MAX, {from: USER});
        const totalSupply4 = await acsBTCPlus.totalSupply();
        const balance4 = await acsBTCPlus.balanceOf(USER);
        console.log('acsBTC+ total supply 4: ', totalSupply4.toString());
        console.log('acsBTC+ balance 4: ', balance4.toString());
    });
});
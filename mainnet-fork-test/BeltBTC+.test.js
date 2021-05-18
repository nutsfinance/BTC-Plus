const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const BeltBTCPlus = artifacts.require("BeltBTCPlus");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const BELT_BTC = "0x51bd63F240fB13870550423D208452cA87c44444";
const BELT_BTC_PLUS = "0x50c5E29277b0Bc4c9b0377295d94F8798a5026a8";
const DEPLOYER = "0x2932516D9564CB799DDA2c16559caD5b8357a0D6";
const USER = "0x21b0F1e67cE41e4964c3f27bbad72031A4E6Cf1d";

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
 * ganache-cli --fork https://bsc-dataseed.binance.org/ -u "0x21b0F1e67cE41e4964c3f27bbad72031A4E6Cf1d" -u "0x2932516D9564CB799DDA2c16559caD5b8357a0D6"
 * 
 * Run test:
 * truffle test mainnet-fork-test/BeltBTC+.test.js
 */
contract("BeltBTCPlus+", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let beltBTC;
    let beltBTCPlus;
    let startTime;

    beforeEach(async () => {
        beltBTC = await ERC20Upgradeable.at(BELT_BTC);
        beltBTCPlus = await BeltBTCPlus.at(BELT_BTC_PLUS);

        startTime = (await time.latest()).addn(10);
    });
    it("should mint beltBTC", async () => {
        const totalSupply1 = await beltBTCPlus.totalSupply();
        const balance1 = await beltBTCPlus.balanceOf(USER);
        console.log('beltBTC+ total supply 1: ', totalSupply1.toString());
        console.log('beltBTC+ balance 1: ', balance1.toString());
        console.log('beltBTC balance 1: ', (await beltBTC.balanceOf(USER)).toString());

        await beltBTC.approve(beltBTCPlus.address, toWei("0.1"), {from: USER});
        await beltBTCPlus.mint(toWei("0.01"), {from: USER});

        const totalSupply2 = await beltBTCPlus.totalSupply();
        const balance2 = await beltBTCPlus.balanceOf(USER);
        console.log('beltBTC+ total supply 2: ', totalSupply2.toString());
        console.log('beltBTC+ balance 2: ', balance2.toString());

        await beltBTCPlus.invest({from: DEPLOYER});
        await timeIncreaseTo(startTime.addn(50000));
        await beltBTCPlus.harvest({from: DEPLOYER});

        const totalSupply3 = await beltBTCPlus.totalSupply();
        const balance3 = await beltBTCPlus.balanceOf(USER);
        console.log('beltBTC+ total supply 3: ', totalSupply3.toString());
        console.log('beltBTC+ balance 3: ', balance3.toString());

        await beltBTCPlus.redeem(MAX, {from: USER});
        const totalSupply4 = await beltBTCPlus.totalSupply();
        const balance4 = await beltBTCPlus.balanceOf(USER);
        console.log('beltBTC+ total supply 4: ', totalSupply4.toString());
        console.log('beltBTC+ balance 4: ', balance4.toString());
    });
});
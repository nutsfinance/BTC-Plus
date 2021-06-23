const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const ACoconutBTCPlus = artifacts.require("ACoconutBTCPlus");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const ACOCONUT_BTC = "0xeF6e45af9a422c5469928F927ca04ed332322e2e";
const ACOCONUT_BTC_PLUS = "0x0CE9884B5d395655f5DB697598fD95D0Dc19e776";
const USER = "0x533e3c0e6b48010873B947bddC4721b1bDFF9648";

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
 * ganache-cli --fork https://mainnet.infura.io/v3/0df468116d40490fb2929a8d6664b1d2 -u "0x533e3c0e6b48010873B947bddC4721b1bDFF9648"
 * 
 * Run test:
 * truffle test mainnet-fork-test/eth/ACoconutBTC+.test.js
 */
contract("ACoconutBTC+", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let acBTC;
    let acBTCPlus;
    let startTime;

    beforeEach(async () => {
        acBTC = await ERC20Upgradeable.at(ACOCONUT_BTC);
        acBTCPlus = await ACoconutBTCPlus.at(ACOCONUT_BTC_PLUS);
        startTime = (await time.latest()).addn(10);
    });
    it("should mint acBTC", async () => {
        const totalSupply1 = await acBTCPlus.totalSupply();
        const balance1 = await acBTCPlus.balanceOf(USER);
        console.log('acBTC+ total supply 1: ', totalSupply1.toString());
        console.log('acBTC+ balance 1: ', balance1.toString());
        console.log('acBTC balance 1: ', (await acBTC.balanceOf(USER)).toString());

        await acBTC.approve(acBTCPlus.address, toWei("0.01"), {from: USER});
        await acBTCPlus.mint(toWei("0.01"), {from: USER});

        const totalSupply2 = await acBTCPlus.totalSupply();
        const balance2 = await acBTCPlus.balanceOf(USER);
        console.log('acBTC+ total supply 2: ', totalSupply2.toString());
        console.log('acBTC+ balance 2: ', balance2.toString());

        await timeIncreaseTo(startTime.addn(5000));
        await acBTCPlus.harvest({from: USER});

        const totalSupply3 = await acBTCPlus.totalSupply();
        const balance3 = await acBTCPlus.balanceOf(USER);
        console.log('acBTC+ total supply 3: ', totalSupply3.toString());
        console.log('acBTC+ balance 3: ', balance3.toString());

        await acBTCPlus.redeem(MAX, {from: USER});
        const totalSupply4 = await acBTCPlus.totalSupply();
        const balance4 = await acBTCPlus.balanceOf(USER);
        console.log('acBTC+ total supply 4: ', totalSupply4.toString());
        console.log('acBTC+ balance 4: ', balance4.toString());
    });
});
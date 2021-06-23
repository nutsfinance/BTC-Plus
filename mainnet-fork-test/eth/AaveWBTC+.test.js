const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const AaveWBTCPlus = artifacts.require("AaveWBTCPlus");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const AAVE_WBTC = "0x9ff58f4fFB29fA2266Ab25e75e2A8b3503311656";
const AAVE_WBTC_PLUS = "0xCb52eC77e3d9b5b46758ccab2877F0344a4281dA";
const USER = "0x3DdfA8eC3052539b6C9549F12cEA2C295cfF5296";

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
 * ganache-cli --fork https://mainnet.infura.io/v3/0df468116d40490fb2929a8d6664b1d2 -u "0x3DdfA8eC3052539b6C9549F12cEA2C295cfF5296"
 * 
 * Run test:
 * truffle test mainnet-fork-test/eth/AaveWBTC+.test.js
 */
contract("AaveWBTC+", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let aaveWBTC;
    let aaveWBTCPlus;
    let startTime;

    beforeEach(async () => {
        aaveWBTC = await ERC20Upgradeable.at(AAVE_WBTC);
        aaveWBTCPlus = await AaveWBTCPlus.at(AAVE_WBTC_PLUS);
        startTime = (await time.latest()).addn(10);
    });
    it("should mint aaveWBTC", async () => {
        const totalSupply1 = await aaveWBTCPlus.totalSupply();
        const balance1 = await aaveWBTCPlus.balanceOf(USER);
        console.log('aaveWBTC+ total supply 1: ', totalSupply1.toString());
        console.log('aaveWBTC+ balance 1: ', balance1.toString());
        console.log('aaveWBTC balance 1: ', (await aaveWBTC.balanceOf(USER)).toString());

        await aaveWBTC.approve(aaveWBTCPlus.address, "10000000", {from: USER});
        await aaveWBTCPlus.mint("10000000", {from: USER});

        const totalSupply2 = await aaveWBTCPlus.totalSupply();
        const balance2 = await aaveWBTCPlus.balanceOf(USER);
        console.log('aaveWBTC+ total supply 2: ', totalSupply2.toString());
        console.log('aaveWBTC+ balance 2: ', balance2.toString());

        await timeIncreaseTo(startTime.addn(5000));
        await aaveWBTCPlus.harvest({from: USER});

        const totalSupply3 = await aaveWBTCPlus.totalSupply();
        const balance3 = await aaveWBTCPlus.balanceOf(USER);
        console.log('aaveWBTC+ total supply 3: ', totalSupply3.toString());
        console.log('aaveWBTC+ balance 3: ', balance3.toString());

        await aaveWBTCPlus.redeem(MAX, {from: USER});
        const totalSupply4 = await aaveWBTCPlus.totalSupply();
        const balance4 = await aaveWBTCPlus.balanceOf(USER);
        console.log('aaveWBTC+ total supply 4: ', totalSupply4.toString());
        console.log('aaveWBTC+ balance 4: ', balance4.toString());
    });
});
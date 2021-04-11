const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const CompoundWBTCPlus = artifacts.require("CompoundWBTCPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const CWBTC = "0xccF4429DB6322D5C611ee964527D42E5d685DD6a";
const DEPLOYER = "0x99FD1378ca799ED6772Fe7bCDC9B30B389518962";

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
 * ganache-cli --fork https://mainnet.infura.io/v3/0df468116d40490fb2929a8d6664b1d2 -u "0x99FD1378ca799ED6772Fe7bCDC9B30B389518962"
 * 
 * Run test:
 * truffle test mainnet-fork-test/CompoundWBTC+.test.js
 */
contract("CompoundWBTC+", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let cWBTC;
    let cWBTCPlus;
    let startTime;

    beforeEach(async () => {
        cWBTC = await ERC20Upgradeable.at(CWBTC);

        const cWBTCPlusImpl = await CompoundWBTCPlus.new();
        console.log(`cWBTC+ implementation: ${cWBTCPlusImpl.address}`);
        const cWBTCPlusProxy = await ERC20Proxy.new(cWBTCPlusImpl.address, proxyAdmin, Buffer.from(''));
        cWBTCPlus = await CompoundWBTCPlus.at(cWBTCPlusProxy.address);
        cWBTCPlus.initialize({from: DEPLOYER});
        console.log(`cWBTC+: ${cWBTCPlus.address}`);

        startTime = (await time.latest()).addn(10);
    });
    it("should mint cWBTC", async () => {
        const totalSupply1 = await cWBTCPlus.totalSupply();
        const balance1 = await cWBTCPlus.balanceOf(DEPLOYER);
        console.log('cWBTC+ total supply 1: ', totalSupply1.toString());
        console.log('cWBTC+ balance 1: ', balance1.toString());
        console.log('cWBTC balance 1: ', (await cWBTC.balanceOf(DEPLOYER)).toString());

        await cWBTC.approve(cWBTCPlus.address, toWei("0.1"), {from: DEPLOYER});
        await cWBTCPlus.mint(toWei("0.1"), {from: DEPLOYER});

        const totalSupply2 = await cWBTCPlus.totalSupply();
        const balance2 = await cWBTCPlus.balanceOf(DEPLOYER);
        console.log('cWBTC+ total supply 2: ', totalSupply2.toString());
        console.log('cWBTC+ balance 2: ', balance2.toString());

        await timeIncreaseTo(startTime.addn(5000));
        await cWBTCPlus.harvest({from: DEPLOYER});

        const totalSupply3 = await cWBTCPlus.totalSupply();
        const balance3 = await cWBTCPlus.balanceOf(DEPLOYER);
        console.log('cWBTC+ total supply 3: ', totalSupply3.toString());
        console.log('cWBTC+ balance 3: ', balance3.toString());

        await cWBTCPlus.redeem(MAX, {from: DEPLOYER});
        const totalSupply4 = await cWBTCPlus.totalSupply();
        const balance4 = await cWBTCPlus.balanceOf(DEPLOYER);
        console.log('cWBTC+ total supply 4: ', totalSupply4.toString());
        console.log('cWBTC+ balance 4: ', balance4.toString());
    });
});
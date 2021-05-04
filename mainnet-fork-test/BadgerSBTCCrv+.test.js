const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const BadgerSBTCCrvPlus = artifacts.require("BadgerSBTCCrvPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");
const Converter = artifacts.require("Converter");

const BADGER_SBTCCRV = "0xd04c48A53c111300aD41190D63681ed3dAd998eC";
const USER = "0xb90BB05C5bfA9E73F99605bB6c14d8E956a768F3";

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
 * ganache-cli --fork https://mainnet.infura.io/v3/0df468116d40490fb2929a8d6664b1d2 -u "0xb90BB05C5bfA9E73F99605bB6c14d8E956a768F3"
 * 
 * Run test:
 * truffle test mainnet-fork-test/BadgerSBTCCrv+.test.js
 */
contract("BadgerSBTCCrvPlus+", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let converter;
    let bSBTCCrv;
    let bSBTCCrvPlus;
    let startTime;

    beforeEach(async () => {
        bSBTCCrv = await ERC20Upgradeable.at(BADGER_SBTCCRV);

        converter = await Converter.new();
        await converter.initialize();
        const bSBTCCrvPlusImpl = await BadgerSBTCCrvPlus.new();
        console.log(`bSBTCCrv+ implementation: ${bSBTCCrvPlusImpl.address}`);
        const bSBTCCrvPlusProxy = await ERC20Proxy.new(bSBTCCrvPlusImpl.address, proxyAdmin, Buffer.from(''));
        bSBTCCrvPlus = await BadgerSBTCCrvPlus.at(bSBTCCrvPlusProxy.address);
        bSBTCCrvPlus.initialize(converter.address);
        console.log(`bSBTCCrv+: ${bSBTCCrvPlus.address}`);

        startTime = (await time.latest()).addn(10);
    });
    it("should mint bSBTCCrv", async () => {
        const totalSupply1 = await bSBTCCrvPlus.totalSupply();
        const balance1 = await bSBTCCrvPlus.balanceOf(USER);
        console.log('bSBTCCrv+ total supply 1: ', totalSupply1.toString());
        console.log('bSBTCCrv+ balance 1: ', balance1.toString());
        console.log('bSBTCCrv balance 1: ', (await bSBTCCrv.balanceOf(USER)).toString());

        await bSBTCCrv.approve(bSBTCCrvPlus.address, toWei("0.001"), {from: USER});
        await bSBTCCrvPlus.mint(toWei("0.001"), {from: USER});

        const totalSupply2 = await bSBTCCrvPlus.totalSupply();
        const balance2 = await bSBTCCrvPlus.balanceOf(USER);
        console.log('bSBTCCrv+ total supply 2: ', totalSupply2.toString());
        console.log('bSBTCCrv+ balance 2: ', balance2.toString());

        await timeIncreaseTo(startTime.addn(5000));

        const totalSupply3 = await bSBTCCrvPlus.totalSupply();
        const balance3 = await bSBTCCrvPlus.balanceOf(USER);
        console.log('bSBTCCrv+ total supply 3: ', totalSupply3.toString());
        console.log('bSBTCCrv+ balance 3: ', balance3.toString());

        await bSBTCCrvPlus.redeem(MAX, {from: USER});
        const totalSupply4 = await bSBTCCrvPlus.totalSupply();
        const balance4 = await bSBTCCrvPlus.balanceOf(USER);
        console.log('bSBTCCrv+ total supply 4: ', totalSupply4.toString());
        console.log('bSBTCCrv+ balance 4: ', balance4.toString());
    });
});
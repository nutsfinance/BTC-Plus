const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const BadgerTBTCCrvPlus = artifacts.require("BadgerTBTCCrvPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");
const Converter = artifacts.require("Converter");

const BADGER_TBTCCRV = "0xb9D076fDe463dbc9f915E5392F807315Bf940334";
const USER = "0xAdc68fB9809206c88e4F871C14b904b25aE5e301";

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
 * ganache-cli --fork https://mainnet.infura.io/v3/0df468116d40490fb2929a8d6664b1d2 -u "0xAdc68fB9809206c88e4F871C14b904b25aE5e301"
 * 
 * Run test:
 * truffle test mainnet-fork-test/BadgerTBTCCrv+.test.js
 */
contract("BadgerTBTCCrvPlus+", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let converter;
    let tSBTCCrv;
    let tSBTCCrvPlus;
    let startTime;

    beforeEach(async () => {
        tSBTCCrv = await ERC20Upgradeable.at(BADGER_TBTCCRV);

        converter = await Converter.new();
        await converter.initialize();
        const tSBTCCrvPlusImpl = await BadgerTBTCCrvPlus.new();
        console.log(`tSBTCCrv+ implementation: ${tSBTCCrvPlusImpl.address}`);
        const tSBTCCrvPlusProxy = await ERC20Proxy.new(tSBTCCrvPlusImpl.address, proxyAdmin, Buffer.from(''));
        tSBTCCrvPlus = await BadgerTBTCCrvPlus.at(tSBTCCrvPlusProxy.address);
        tSBTCCrvPlus.initialize(converter.address);
        console.log(`tSBTCCrv+: ${tSBTCCrvPlus.address}`);

        startTime = (await time.latest()).addn(10);
    });
    it("should mint tSBTCCrv", async () => {
        const totalSupply1 = await tSBTCCrvPlus.totalSupply();
        const balance1 = await tSBTCCrvPlus.balanceOf(USER);
        console.log('tSBTCCrv+ total supply 1: ', totalSupply1.toString());
        console.log('tSBTCCrv+ balance 1: ', balance1.toString());
        console.log('tSBTCCrv balance 1: ', (await tSBTCCrv.balanceOf(USER)).toString());

        await tSBTCCrv.approve(tSBTCCrvPlus.address, toWei("0.001"), {from: USER});
        await tSBTCCrvPlus.mint(toWei("0.001"), {from: USER});

        const totalSupply2 = await tSBTCCrvPlus.totalSupply();
        const balance2 = await tSBTCCrvPlus.balanceOf(USER);
        console.log('tSBTCCrv+ total supply 2: ', totalSupply2.toString());
        console.log('tSBTCCrv+ balance 2: ', balance2.toString());

        await timeIncreaseTo(startTime.addn(5000));

        const totalSupply3 = await tSBTCCrvPlus.totalSupply();
        const balance3 = await tSBTCCrvPlus.balanceOf(USER);
        console.log('tSBTCCrv+ total supply 3: ', totalSupply3.toString());
        console.log('tSBTCCrv+ balance 3: ', balance3.toString());

        await tSBTCCrvPlus.redeem(MAX, {from: USER});
        const totalSupply4 = await tSBTCCrvPlus.totalSupply();
        const balance4 = await tSBTCCrvPlus.balanceOf(USER);
        console.log('tSBTCCrv+ total supply 4: ', totalSupply4.toString());
        console.log('tSBTCCrv+ balance 4: ', balance4.toString());
    });
});
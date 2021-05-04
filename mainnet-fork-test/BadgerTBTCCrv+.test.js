const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const axios = require('axios');
const BadgerTBTCCrvPlus = artifacts.require("BadgerTBTCCrvPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");
const Converter = artifacts.require("Converter");
const IBadgerTree = artifacts.require("IBadgerTree");

const BADGER_TBTCCRV = "0xb9D076fDe463dbc9f915E5392F807315Bf940334";
const BADGER_TBTCCRV_PLUS = "0x25d8293E1d6209d6fa21983f5E46ee6CD36d7196";
const DEPLOYER = "0x2932516D9564CB799DDA2c16559caD5b8357a0D6";
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
 * ganache-cli --fork https://mainnet.infura.io/v3/0df468116d40490fb2929a8d6664b1d2 -u "0xAdc68fB9809206c88e4F871C14b904b25aE5e301" -u "0x2932516D9564CB799DDA2c16559caD5b8357a0D6"
 * 
 * Run test:
 * truffle test mainnet-fork-test/BadgerTBTCCrv+.test.js
 */
contract("BadgerTBTCCrvPlus+", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let converter;
    let tBTCCrv;
    let tBTCCrvPlus;
    let startTime;

    beforeEach(async () => {
        tBTCCrv = await ERC20Upgradeable.at(BADGER_TBTCCRV);
        tBTCCrvPlus = await BadgerTBTCCrvPlus.at(BADGER_TBTCCRV_PLUS);

        // converter = await Converter.new();
        // await converter.initialize();
        // const tBTCCrvPlusImpl = await BadgerTBTCCrvPlus.new();
        // console.log(`tBTCCrv+ implementation: ${tBTCCrvPlusImpl.address}`);
        // const tBTCCrvPlusProxy = await ERC20Proxy.new(tBTCCrvPlusImpl.address, proxyAdmin, Buffer.from(''));
        // tBTCCrvPlus = await BadgerTBTCCrvPlus.at(tBTCCrvPlusProxy.address);
        // tBTCCrvPlus.initialize(converter.address);
        // console.log(`tBTCCrv+: ${tBTCCrvPlus.address}`);

        startTime = (await time.latest()).addn(10);
    });
    it("should mint tBTCCrv", async () => {
        const totalSupply1 = await tBTCCrvPlus.totalSupply();
        const balance1 = await tBTCCrvPlus.balanceOf(USER);
        console.log('tBTCCrv+ total supply 1: ', totalSupply1.toString());
        console.log('tBTCCrv+ balance 1: ', balance1.toString());
        console.log('tBTCCrv balance 1: ', (await tBTCCrv.balanceOf(USER)).toString());

        await tBTCCrv.approve(tBTCCrvPlus.address, toWei("0.001"), {from: USER});
        await tBTCCrvPlus.mint(toWei("0.001"), {from: USER});

        const totalSupply2 = await tBTCCrvPlus.totalSupply();
        const balance2 = await tBTCCrvPlus.balanceOf(USER);
        console.log('tBTCCrv+ total supply 2: ', totalSupply2.toString());
        console.log('tBTCCrv+ balance 2: ', balance2.toString());

        await timeIncreaseTo(startTime.addn(5000));

        const totalSupply3 = await tBTCCrvPlus.totalSupply();
        const balance3 = await tBTCCrvPlus.balanceOf(USER);
        console.log('tBTCCrv+ total supply 3: ', totalSupply3.toString());
        console.log('tBTCCrv+ balance 3: ', balance3.toString());

        await tBTCCrvPlus.redeem(MAX, {from: USER});
        const totalSupply4 = await tBTCCrvPlus.totalSupply();
        const balance4 = await tBTCCrvPlus.balanceOf(USER);
        console.log('tBTCCrv+ total supply 4: ', totalSupply4.toString());
        console.log('tBTCCrv+ balance 4: ', balance4.toString());
    });
    it("should harvest", async () => {
        const response = await axios.get('https://api.badger.finance/v2/reward/tree/' + BADGER_TBTCCRV_PLUS);
        console.log(response.data)
        const badgerTree = await IBadgerTree.at('0x660802Fc641b154aBA66a62137e71f331B6d787A');
        const claimableFor = await badgerTree.getClaimableFor(BADGER_TBTCCRV_PLUS, response.data.tokens, response.data.cumulativeAmounts);
        console.log(claimableFor[0]);
        console.log(claimableFor[1][0].toString());

        const totalSupply1 = await tBTCCrvPlus.totalSupply();
        await tBTCCrvPlus.harvest(response.data.tokens, response.data.cumulativeAmounts, response.data.index,
            response.data.cycle, response.data.proof, claimableFor[1], {from: DEPLOYER});
        const totalSupply2 = await tBTCCrvPlus.totalSupply();

        console.log('Total supply before: ' + totalSupply1.toString());
        console.log('Total supply after: ' + totalSupply2.toString());
    });
});
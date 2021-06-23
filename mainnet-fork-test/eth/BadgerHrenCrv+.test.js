const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const axios = require('axios');
const BadgerHrenCrvPlus = artifacts.require("BadgerHrenCrvPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");
const Converter = artifacts.require("Converter");
const IBadgerTree = artifacts.require("IBadgerTree");

const BADGER_HRENCRV = "0xAf5A1DECfa95BAF63E0084a35c62592B774A2A87";
const BADGER_HRENCRV_PLUS = "0xd929f4d3ACBD19107BC416685e7f6559dC07F3F5";
const DEPLOYER = "0x2932516D9564CB799DDA2c16559caD5b8357a0D6";
const USER = "0xD680aB5a98731c7A3de4f3D4CF68c04c4a3C1caE";

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
 * ganache-cli --fork https://mainnet.infura.io/v3/0df468116d40490fb2929a8d6664b1d2 -u "0xD680aB5a98731c7A3de4f3D4CF68c04c4a3C1caE" -u "0x2932516D9564CB799DDA2c16559caD5b8357a0D6"
 * 
 * Run test:
 * truffle test mainnet-fork-test/eth/BadgerHrenCrv+.test.js
 */
contract("BadgerHrenCrvPlus+", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let converter;
    let bhrenCrv;
    let bhrenCrvPlus;
    let startTime;

    beforeEach(async () => {
        bhrenCrv = await ERC20Upgradeable.at(BADGER_HRENCRV);
        bhrenCrvPlus = await BadgerHrenCrvPlus.at(BADGER_HRENCRV_PLUS);

        // converter = await Converter.new();
        // await converter.initialize();
        // const bhrenCrvPlusImpl = await BadgerHrenCrvPlus.new();
        // console.log(`bhrenCrv+ implementation: ${bhrenCrvPlusImpl.address}`);
        // const bhrenCrvPlusProxy = await ERC20Proxy.new(bhrenCrvPlusImpl.address, proxyAdmin, Buffer.from(''));
        // bhrenCrvPlus = await BadgerHrenCrvPlus.at(bhrenCrvPlusProxy.address);
        // bhrenCrvPlus.initialize(converter.address);
        // console.log(`bhrenCrv+: ${bhrenCrvPlus.address}`);

        startTime = (await time.latest()).addn(10);
    });
    it("should mint bhrenCrv", async () => {
        const totalSupply1 = await bhrenCrvPlus.totalSupply();
        const balance1 = await bhrenCrvPlus.balanceOf(USER);
        console.log('bhrenCrv+ total supply 1: ', totalSupply1.toString());
        console.log('bhrenCrv+ balance 1: ', balance1.toString());
        console.log('bhrenCrv balance 1: ', (await bhrenCrv.balanceOf(USER)).toString());

        await bhrenCrv.approve(bhrenCrvPlus.address, toWei("0.001"), {from: USER});
        await bhrenCrvPlus.mint(toWei("0.001"), {from: USER});

        const totalSupply2 = await bhrenCrvPlus.totalSupply();
        const balance2 = await bhrenCrvPlus.balanceOf(USER);
        console.log('bhrenCrv+ total supply 2: ', totalSupply2.toString());
        console.log('bhrenCrv+ balance 2: ', balance2.toString());

        await timeIncreaseTo(startTime.addn(5000));

        const totalSupply3 = await bhrenCrvPlus.totalSupply();
        const balance3 = await bhrenCrvPlus.balanceOf(USER);
        console.log('bhrenCrv+ total supply 3: ', totalSupply3.toString());
        console.log('bhrenCrv+ balance 3: ', balance3.toString());

        await bhrenCrvPlus.redeem(MAX, {from: USER});
        const totalSupply4 = await bhrenCrvPlus.totalSupply();
        const balance4 = await bhrenCrvPlus.balanceOf(USER);
        console.log('bhrenCrv+ total supply 4: ', totalSupply4.toString());
        console.log('bhrenCrv+ balance 4: ', balance4.toString());
    });
    it("should harvest", async () => {
        const response = await axios.get('https://api.badger.finance/v2/reward/tree/' + BADGER_HRENCRV_PLUS);
        console.log(response.data)
        const badgerTree = await IBadgerTree.at('0x660802Fc641b154aBA66a62137e71f331B6d787A');
        const claimableFor = await badgerTree.getClaimableFor(BADGER_HRENCRV_PLUS, response.data.tokens, response.data.cumulativeAmounts);
        console.log(claimableFor[0]);
        console.log(claimableFor[1][0].toString());

        const totalSupply1 = await bhrenCrvPlus.totalSupply();
        await bhrenCrvPlus.harvest(response.data.tokens, response.data.cumulativeAmounts, response.data.index,
            response.data.cycle, response.data.proof, claimableFor[1], {from: DEPLOYER});
        const totalSupply2 = await bhrenCrvPlus.totalSupply();

        console.log('Total supply before: ' + totalSupply1.toString());
        console.log('Total supply after: ' + totalSupply2.toString());
    });
});
const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const BadgerBTCZap = artifacts.require("BadgerBTCZap");
const SinglePlus = artifacts.require("SinglePlus");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");
const ERC20Proxy = artifacts.require("ERC20Proxy");
const BadgerBTCPlus = artifacts.require("BadgerBTCPlus");

const BADGER_RENCRV = '0x6dEf55d2e18486B9dDfaA075bc4e4EE0B28c1545';
const BADGER_RENCRV_PLUS = '0x87BAA3E048528d21302Fb15acd09a4e5cB5098cB';
const BADGER_SBTCCRV = '0xd04c48A53c111300aD41190D63681ed3dAd998eC';
const BADGER_SBTCCRV_PLUS = '0xb346d6Fcea1F328b64cF5F1Fe5108841607A7Fef';
const BADGER_TBTCCRV = '0xb9D076fDe463dbc9f915E5392F807315Bf940334';
const BADGER_TBTCCRV_PLUS = '0x25d8293E1d6209d6fa21983f5E46ee6CD36d7196';
const BADGER_HRENCRV = '0xAf5A1DECfa95BAF63E0084a35c62592B774A2A87';
const BADGER_HRENCRV_PLUS = '0xd929f4d3ACBD19107BC416685e7f6559dC07F3F5';
const BADGER_BTC_PLUS = '0x7cD7a5B7Ebe9F852bD1E87117b36504D22d9385B';

const SINGLES = [BADGER_RENCRV_PLUS, BADGER_SBTCCRV_PLUS, BADGER_TBTCCRV_PLUS, BADGER_HRENCRV_PLUS];

const PROXY_ADMIN = "0x03C7CF9A445a6FB7bD9340659f2b5f4c7C746814";
const DEPLOYER = "0x2932516D9564CB799DDA2c16559caD5b8357a0D6";

const BN = web3.utils.BN;
const toWei = web3.utils.toWei;
const MAX = new BN(2).pow(new BN(256)).sub(new BN(1));

const assertAlmostEqual = function(actualOrig, expectedOrig) {
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
 * Start Mainnet fork node on BSC:
 * ganache-cli --fork https://mainnet.infura.io/v3/0df468116d40490fb2929a8d6664b1d2 -u "0x2932516D9564CB799DDA2c16559caD5b8357a0D6" -u "0x03C7CF9A445a6FB7bD9340659f2b5f4c7C746814"
 * 
 * Run test:
 * truffle test mainnet-fork-test/BadgerBTCZap.test.js
 */
contract("BadgerBTCZap", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let brenCrv;
    let bsbtcCrv;
    let btbtcCrv;
    let bhrenCrv;
    let badgerBTCPlus;
    let zap;

    beforeEach(async () => {
        brenCrv = await ERC20Upgradeable.at(BADGER_RENCRV);
        bsbtcCrv = await ERC20Upgradeable.at(BADGER_SBTCCRV);
        btbtcCrv = await ERC20Upgradeable.at(BADGER_TBTCCRV);
        bhrenCrv = await ERC20Upgradeable.at(BADGER_HRENCRV);
        badgerBTCPlus = await ERC20Upgradeable.at(BADGER_BTC_PLUS);

        // const badgerBTCPlusImpl = await BadgerBTCPlus.new();
        // const badgerBTCPlusProxy = await ERC20Proxy.at(BADGER_BTC_PLUS);
        // await badgerBTCPlusProxy.upgradeTo(badgerBTCPlusImpl.address, {from: PROXY_ADMIN});

        zap = await BadgerBTCZap.new();
        await zap.initialize();
    });
    it("should mint and redeem BadgerBTC+", async () => {
        const mintAmount = await zap.getMintAmount(SINGLES, [toWei("0.001"), toWei("0.001"), toWei("0.001"), toWei("0.001")]);
        console.log(mintAmount.toString());
        await brenCrv.approve(zap.address, toWei("0.001"), {from: DEPLOYER});
        await bsbtcCrv.approve(zap.address, toWei("0.001"), {from: DEPLOYER});
        await btbtcCrv.approve(zap.address, toWei("0.001"), {from: DEPLOYER});
        await bhrenCrv.approve(zap.address, toWei("0.001"), {from: DEPLOYER});

        // console.log((await brenCrv.balanceOf(DEPLOYER)).toString());
        // console.log((await bsbtcCrv.balanceOf(DEPLOYER)).toString());
        // console.log((await btbtcCrv.balanceOf(DEPLOYER)).toString());
        // console.log((await bhrenCrv.balanceOf(DEPLOYER)).toString());

        const balance1 = await badgerBTCPlus.balanceOf(DEPLOYER);
        await zap.mint(SINGLES, [toWei("0.001"), toWei("0.001"), toWei("0.001"), toWei("0.001")], {from: DEPLOYER});
        const balance2 = await badgerBTCPlus.balanceOf(DEPLOYER);

        console.log('BadgerBTC+ balance before: ' + balance1.toString());
        console.log('BadgerBTC+ balance after: ' + balance2.toString());

        const redeemAmount = await zap.getRedeemAmount(toWei("0.002"));
        console.log(redeemAmount[0]);
        console.log(redeemAmount[1].map(amount => amount.toString()));
        console.log(redeemAmount[2].toString());

        await badgerBTCPlus.approve(zap.address, toWei("0.002"), {from: DEPLOYER});
        await zap.redeem(toWei("0.002"), {from: DEPLOYER});
    });
});
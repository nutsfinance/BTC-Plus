const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const BTCZapBsc = artifacts.require("BTCZapBsc");
const SinglePlus = artifacts.require("SinglePlus");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");
const AutoBTC = artifacts.require("AutoBTC");
const ERC20Proxy = artifacts.require("ERC20proxy");

const BTCB = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c";
const AUTO_BTC = "0x6B7Ea9F1EF1E6c662761201998Dc876b88Ed7414";
const VBTC_PLUS = "0xcf8D1D3Fce7C2138F85889068e50F0e7a18b5321";
const FBTCB_PLUS = "0x73FddFb941c11d16C827169Bb94aCC227841C396";
const ACSBTCB_PLUS = "0xD7806143A4206aa9A816b964e4c994F533b830b0";
const AUTOBTC_PLUS = "0x02827D495B2bBe37e1C021eB91BCdCc92cD3b604";
const AUTOBTC_V2_PLUS = "0x7780b26aB2586Ad0e0192CafAAE93BfA09a106F3";
const DEPLOYER = "0x631fc1ea2270e98fbd9d92658ece0f5a269aa161";
const PROXY_ADMIN = "0x03C7CF9A445a6FB7bD9340659f2b5f4c7C746814";

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
 * ganache-cli --fork https://bsc-dataseed.binance.org/ -u "0x098d907E1A3F26cC65B8ACa1c37E41B208699bac" -u "0x631fc1ea2270e98fbd9d92658ece0f5a269aa161" -u "0x03C7CF9A445a6FB7bD9340659f2b5f4c7C746814"
 * 
 * Run test:
 * truffle test mainnet-fork-test/BTCZapBsc.test.js
 */
contract("BTCZapBsc", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let btcb;
    let vbtcPlus;
    let fbtcbPlus;
    let acsbtcbPlus;
    let autobtcPlus;
    let autobtcV2Plus;
    let zap;

    let testAmount = "0.001";

    before(async () => {
        // Deploy new autoBTC
        const autoBTC = await ERC20Proxy.at(AUTO_BTC);
        const autoBTCImpl = await AutoBTC.new();
        await autoBTC.upgradeTo(autoBTCImpl.address, {from: PROXY_ADMIN});
    });

    beforeEach(async () => {
        btcb = await ERC20Upgradeable.at(BTCB);
        vbtcPlus = await SinglePlus.at(VBTC_PLUS);
        fbtcbPlus = await SinglePlus.at(FBTCB_PLUS);
        acsbtcbPlus = await SinglePlus.at(ACSBTCB_PLUS);
        autobtcPlus = await SinglePlus.at(AUTOBTC_PLUS);
        autobtcV2Plus = await SinglePlus.at(AUTOBTC_V2_PLUS);
        zap = await BTCZapBsc.new();
        await btcb.approve(zap.address, toWei("1000"), {from: DEPLOYER});
    });

    it("should mint and redeem 0.0001 vBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintVBTCPlus(toWei("0.0001"), {from: DEPLOYER});

        const balance2 = await vbtcPlus.balanceOf(DEPLOYER);
        await vbtcPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemVBTCPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 0.0001;
        console.log(`vBTC+, 0.0001, ${diff}, ${diffRatio}%`); 
    });

    it("should mint and redeem 0.0001 fBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintFBTCBPlus(toWei("0.0001"), {from: DEPLOYER});

        const balance2 = await fbtcbPlus.balanceOf(DEPLOYER);
        await fbtcbPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemFBTCBPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 0.0001;
        console.log(`fBTCB+, 0.0001, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 0.0001 acsBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintAcsBTCBPlus(toWei("0.0001"), {from: DEPLOYER});

        const balance2 = await acsbtcbPlus.balanceOf(DEPLOYER);
        await acsbtcbPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAcsBTCBPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 0.0001;
        console.log(`acsBTCB+, 0.0001, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 0.0001 autoBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintAutoBTCPlus(toWei("0.0001"), {from: DEPLOYER});

        const balance2 = await autobtcPlus.balanceOf(DEPLOYER);
        await autobtcPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAutoBTCPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 0.0001;
        console.log(`autoBTC+, 0.0001, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 0.0001 autoBTCv2+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintAutoBTCV2Plus(toWei("0.0001"), {from: DEPLOYER});

        const balance2 = await autobtcV2Plus.balanceOf(DEPLOYER);
        await autobtcV2Plus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAutoBTCV2Plus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 0.0001;
        console.log(`autoBTCv2+, 0.0001, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 0.001 vBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintVBTCPlus(toWei("0.001"), {from: DEPLOYER});

        const balance2 = await vbtcPlus.balanceOf(DEPLOYER);
        await vbtcPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemVBTCPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 0.001;
        console.log(`vBTC+, 0.001, ${diff}, ${diffRatio}%`); 
    });

    it("should mint and redeem 0.001 fBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintFBTCBPlus(toWei("0.001"), {from: DEPLOYER});

        const balance2 = await fbtcbPlus.balanceOf(DEPLOYER);
        await fbtcbPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemFBTCBPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 0.001;
        console.log(`fBTCB+, 0.001, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 0.001 acsBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintAcsBTCBPlus(toWei("0.001"), {from: DEPLOYER});

        const balance2 = await acsbtcbPlus.balanceOf(DEPLOYER);
        await acsbtcbPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAcsBTCBPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 0.001;
        console.log(`acsBTCB+, 0.001, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 0.001 autoBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintAutoBTCPlus(toWei("0.001"), {from: DEPLOYER});

        const balance2 = await autobtcPlus.balanceOf(DEPLOYER);
        await autobtcPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAutoBTCPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 0.001;
        console.log(`autoBTC+, 0.001, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 0.001 autoBTCv2+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintAutoBTCV2Plus(toWei("0.001"), {from: DEPLOYER});

        const balance2 = await autobtcV2Plus.balanceOf(DEPLOYER);
        await autobtcV2Plus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAutoBTCV2Plus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 0.001;
        console.log(`autoBTCv2+, 0.001, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 0.01 vBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintVBTCPlus(toWei("0.01"), {from: DEPLOYER});

        const balance2 = await vbtcPlus.balanceOf(DEPLOYER);
        await vbtcPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemVBTCPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 0.01;
        console.log(`vBTC+, 0.01, ${diff}, ${diffRatio}%`); 
    });

    it("should mint and redeem 0.01 fBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintFBTCBPlus(toWei("0.01"), {from: DEPLOYER});

        const balance2 = await fbtcbPlus.balanceOf(DEPLOYER);
        await fbtcbPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemFBTCBPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 0.01;
        console.log(`fBTCB+, 0.01, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 0.01 acsBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintAcsBTCBPlus(toWei("0.01"), {from: DEPLOYER});

        const balance2 = await acsbtcbPlus.balanceOf(DEPLOYER);
        await acsbtcbPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAcsBTCBPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 0.01;
        console.log(`acsBTCB+, 0.01, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 0.01 autoBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintAutoBTCPlus(toWei("0.01"), {from: DEPLOYER});

        const balance2 = await autobtcPlus.balanceOf(DEPLOYER);
        await autobtcPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAutoBTCPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 0.01;
        console.log(`autoBTC+, 0.01, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 0.01 autoBTCv2+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintAutoBTCV2Plus(toWei("0.01"), {from: DEPLOYER});

        const balance2 = await autobtcV2Plus.balanceOf(DEPLOYER);
        await autobtcV2Plus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAutoBTCV2Plus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 0.01;
        console.log(`autoBTCv2+, 0.01, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 0.1 vBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintVBTCPlus(toWei("0.1"), {from: DEPLOYER});

        const balance2 = await vbtcPlus.balanceOf(DEPLOYER);
        await vbtcPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemVBTCPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 0.1;
        console.log(`vBTC+, 0.1, ${diff}, ${diffRatio}%`); 
    });

    it("should mint and redeem 0.1 fBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintFBTCBPlus(toWei("0.1"), {from: DEPLOYER});

        const balance2 = await fbtcbPlus.balanceOf(DEPLOYER);
        await fbtcbPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemFBTCBPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 0.1;
        console.log(`fBTCB+, 0.1, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 0.1 acsBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintAcsBTCBPlus(toWei("0.1"), {from: DEPLOYER});

        const balance2 = await acsbtcbPlus.balanceOf(DEPLOYER);
        await acsbtcbPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAcsBTCBPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 0.1;
        console.log(`acsBTCB+, 0.1, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 0.1 autoBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintAutoBTCPlus(toWei("0.1"), {from: DEPLOYER});

        const balance2 = await autobtcPlus.balanceOf(DEPLOYER);
        await autobtcPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAutoBTCPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 0.1;
        console.log(`autoBTC+, 0.1, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 0.1 autoBTCv2+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintAutoBTCV2Plus(toWei("0.1"), {from: DEPLOYER});

        const balance2 = await autobtcV2Plus.balanceOf(DEPLOYER);
        await autobtcV2Plus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAutoBTCV2Plus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 0.1;
        console.log(`autoBTCv2+, 0.1, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 1 vBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintVBTCPlus(toWei("1"), {from: DEPLOYER});

        const balance2 = await vbtcPlus.balanceOf(DEPLOYER);
        await vbtcPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemVBTCPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100;
        console.log(`vBTC+, 1, ${diff}, ${diffRatio}%`); 
    });

    it("should mint and redeem 1 fBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintFBTCBPlus(toWei("1"), {from: DEPLOYER});

        const balance2 = await fbtcbPlus.balanceOf(DEPLOYER);
        await fbtcbPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemFBTCBPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100;
        console.log(`fBTCB+, 1, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 1 acsBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintAcsBTCBPlus(toWei("1"), {from: DEPLOYER});

        const balance2 = await acsbtcbPlus.balanceOf(DEPLOYER);
        await acsbtcbPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAcsBTCBPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100;
        console.log(`acsBTCB+, 1, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 1 autoBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintAutoBTCPlus(toWei("1"), {from: DEPLOYER});

        const balance2 = await autobtcPlus.balanceOf(DEPLOYER);
        await autobtcPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAutoBTCPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100;
        console.log(`autoBTC+, 1, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 1 autoBTCv2+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintAutoBTCV2Plus(toWei("1"), {from: DEPLOYER});

        const balance2 = await autobtcV2Plus.balanceOf(DEPLOYER);
        await autobtcV2Plus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAutoBTCV2Plus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100;
        console.log(`autoBTCv2+, 1, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 10 vBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintVBTCPlus(toWei("10"), {from: DEPLOYER});

        const balance2 = await vbtcPlus.balanceOf(DEPLOYER);
        await vbtcPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemVBTCPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 10;
        console.log(`vBTC+, 10, ${diff}, ${diffRatio}%`); 
    });

    it("should mint and redeem 10 fBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintFBTCBPlus(toWei("10"), {from: DEPLOYER});

        const balance2 = await fbtcbPlus.balanceOf(DEPLOYER);
        await fbtcbPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemFBTCBPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 10;
        console.log(`fBTCB+, 10, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 10 acsBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintAcsBTCBPlus(toWei("10"), {from: DEPLOYER});

        const balance2 = await acsbtcbPlus.balanceOf(DEPLOYER);
        await acsbtcbPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAcsBTCBPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 10;
        console.log(`acsBTCB+, 10, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 10 autoBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintAutoBTCPlus(toWei("10"), {from: DEPLOYER});

        const balance2 = await autobtcPlus.balanceOf(DEPLOYER);
        await autobtcPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAutoBTCPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 10;
        console.log(`autoBTC+, 10, ${diff}, ${diffRatio}%`);
    });


    it("should mint and redeem 10 autoBTCv2+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintAutoBTCV2Plus(toWei("10"), {from: DEPLOYER});

        const balance2 = await autobtcV2Plus.balanceOf(DEPLOYER);
        await autobtcV2Plus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAutoBTCV2Plus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 10;
        console.log(`autoBTCv2+, 10, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 100 vBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintVBTCPlus(toWei("100"), {from: DEPLOYER});

        const balance2 = await vbtcPlus.balanceOf(DEPLOYER);
        await vbtcPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemVBTCPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 100;
        console.log(`vBTC+, 100, ${diff}, ${diffRatio}%`); 
    });

    it("should mint and redeem 100 fBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintFBTCBPlus(toWei("100"), {from: DEPLOYER});

        const balance2 = await fbtcbPlus.balanceOf(DEPLOYER);
        await fbtcbPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemFBTCBPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 100;
        console.log(`fBTCB+, 100, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 100 acsBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintAcsBTCBPlus(toWei("100"), {from: DEPLOYER});

        const balance2 = await acsbtcbPlus.balanceOf(DEPLOYER);
        await acsbtcbPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAcsBTCBPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 100;
        console.log(`acsBTCB+, 100, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 100 autoBTC+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintAutoBTCPlus(toWei("100"), {from: DEPLOYER});

        const balance2 = await autobtcPlus.balanceOf(DEPLOYER);
        await autobtcPlus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAutoBTCPlus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 100;
        console.log(`autoBTC+, 100, ${diff}, ${diffRatio}%`);
    });

    it("should mint and redeem 100 autoBTCv2+", async () => {
        const btcb1 = await btcb.balanceOf(DEPLOYER);

        await zap.mintAutoBTCV2Plus(toWei("100"), {from: DEPLOYER});

        const balance2 = await autobtcV2Plus.balanceOf(DEPLOYER);
        await autobtcV2Plus.approve(zap.address, balance2, {from: DEPLOYER});
        await zap.redeemAutoBTCV2Plus(balance2, {from: DEPLOYER});

        const btcb3 = await btcb.balanceOf(DEPLOYER);
        const diff = web3.utils.fromWei(btcb1.sub(btcb3)).toString();
        const diffRatio = diff * 100 / 100;
        console.log(`autoBTCv2+, 100, ${diff}, ${diffRatio}%`);
    });
});
const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const AutoBTC = artifacts.require("AutoBTC");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const AUTO = "0xa184088a740c695E156F91f5cC086a06bb78b827";
const BTCB = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c";
const DEPLOYER = "0x098d907E1A3F26cC65B8ACa1c37E41B208699bac";

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
 * Start Mainnet fork node on BSC:
 * ganache-cli --fork https://bsc-dataseed.binance.org/ -u "0x098d907E1A3F26cC65B8ACa1c37E41B208699bac"
 * 
 * Run test:
 * truffle test mainnet-fork-test/AutoBTC.test.js
 */
contract("AutoBTC", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let auto;
    let btcb;
    let autoBTC;
    let startTime;

    beforeEach(async () => {
        btcb = await ERC20Upgradeable.at(BTCB);
        auto = await ERC20Upgradeable.at(AUTO);
        const autoBTCImpl = await AutoBTC.new();
        console.log(`autoBTC implementation: ${autoBTCImpl.address}`);
        const autoBTCProxy = await ERC20Proxy.new(autoBTCImpl.address, proxyAdmin, Buffer.from(''));
        autoBTC = await AutoBTC.at(autoBTCProxy.address);
        autoBTC.initialize({from: DEPLOYER});
        console.log(`autoBTC: ${autoBTC.address}`);

        startTime = (await time.latest()).addn(10);
    });
    it("should mint autoBTC", async () => {
        const totalSupply1 = await autoBTC.totalSupply();
        const balance1 = await autoBTC.balanceOf(DEPLOYER);
        console.log('autoBTC total supply 1: ', totalSupply1.toString());
        console.log('autoBTC balance 1: ', balance1.toString());

        await btcb.approve(autoBTC.address, toWei("0.001"), {from: DEPLOYER});
        await autoBTC.mint(toWei("0.001"), {from: DEPLOYER});

        const totalSupply2 = await autoBTC.totalSupply();
        const balance2 = await autoBTC.balanceOf(DEPLOYER);
        console.log('autoBTC total supply 2: ', totalSupply2.toString());
        console.log('autoBTC balance 2: ', balance2.toString());

        const exchangeRate = await autoBTC.exchangeRateStored();
        console.log('Exchange rate: ' + exchangeRate.toString());
        const amount = totalSupply2.sub(totalSupply1).mul(exchangeRate).div(new BN(toWei("1")));
        console.log('Amount: ' + amount.toString());
        assertAlmostEqual(amount, toWei("0.001"));

        const autoPrev = await auto.balanceOf(DEPLOYER);
        console.log('Auto balance prev: ' + autoPrev.toString());
        await timeIncreaseTo(startTime.addn(5000));
        await autoBTC.claimRewards({from: DEPLOYER});
        const autoAfter = await auto.balanceOf(DEPLOYER);
        console.log('Auto balance after: ' + autoAfter.toString());

        await autoBTC.redeem(toWei("0.001"), {from: DEPLOYER});
        const totalSupply3 = await autoBTC.totalSupply();
        const balance3 = await autoBTC.balanceOf(DEPLOYER);
        console.log('autoBTC total supply 3: ', totalSupply3.toString());
        console.log('autoBTC balance 3: ', balance3.toString());
    });
});
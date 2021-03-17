const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const AutoBTCPlus = artifacts.require("AutoBTCPlus");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const AUTO_BTC = "0x54fA94FD0F8231863930C7dbf612077f378F03fB";
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
 * truffle test mainnet-fork-test/AutoBTC+.test.js
 */
contract("AutoBTC+", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let autoBTC;
    let autoBTCPlus;
    let startTime;

    beforeEach(async () => {
        autoBTC = await ERC20Upgradeable.at(AUTO_BTC);
        const autoBTCPlusImpl = await AutoBTCPlus.new();
        console.log(`autoBTC+ implementation: ${autoBTCPlusImpl.address}`);
        const autoBTCPlusProxy = await ERC20Proxy.new(autoBTCPlusImpl.address, proxyAdmin, Buffer.from(''));
        autoBTCPlus = await AutoBTCPlus.at(autoBTCPlusProxy.address);
        autoBTCPlus.initialize({from: DEPLOYER});
        console.log(`autoBTC+: ${autoBTCPlus.address}`);

        startTime = (await time.latest()).addn(10);
    });
    it("should mint autoBTC", async () => {
        const totalSupply1 = await autoBTCPlus.totalSupply();
        const balance1 = await autoBTCPlus.balanceOf(DEPLOYER);
        console.log('autoBTC+ total supply 1: ', totalSupply1.toString());
        console.log('autoBTC+ balance 1: ', balance1.toString());

        console.log((await autoBTC.balanceOf(DEPLOYER)).toString());
        await autoBTC.approve(autoBTCPlus.address, toWei("0.001"), {from: DEPLOYER});
        await autoBTCPlus.mint(toWei("0.001"), {from: DEPLOYER});

        const totalSupply2 = await autoBTCPlus.totalSupply();
        const balance2 = await autoBTCPlus.balanceOf(DEPLOYER);
        console.log('autoBTC+ total supply 2: ', totalSupply2.toString());
        console.log('autoBTC+ balance 2: ', balance2.toString());

        await timeIncreaseTo(startTime.addn(5000));
        await autoBTCPlus.harvest({from: DEPLOYER});

        const totalSupply3 = await autoBTCPlus.totalSupply();
        const balance3 = await autoBTCPlus.balanceOf(DEPLOYER);
        console.log('autoBTC+ total supply 3: ', totalSupply3.toString());
        console.log('autoBTC+ balance 3: ', balance3.toString());

        await autoBTCPlus.redeem(MAX, {from: DEPLOYER});
        const totalSupply4 = await autoBTCPlus.totalSupply();
        const balance4 = await autoBTCPlus.balanceOf(DEPLOYER);
        console.log('autoBTC+ total supply 4: ', totalSupply4.toString());
        console.log('autoBTC+ balance 4: ', balance4.toString());
    });
});
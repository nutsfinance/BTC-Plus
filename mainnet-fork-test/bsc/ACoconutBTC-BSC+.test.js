const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const ACoconutBTCBscPlus = artifacts.require("ACoconutBTCBscPlus");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const ACOCONUT_BTC_BSC = "0xCEF9Ddbf860551cC8505C0BcfF0Bc8C10d59e229";
const ACOCONUT_BTC_BSC_PLUS = "0xd051003a60be3B2feA427448cdc085D08c6E2dcC";
const DEPLOYER = "0x2932516D9564CB799DDA2c16559caD5b8357a0D6";
const USER = "0x782f2000b4b7974aABEf97FD046EF791fe0bb4B3";

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
 * ganache-cli --fork https://bsc-dataseed.binance.org/ -u "0x782f2000b4b7974aABEf97FD046EF791fe0bb4B3" -u "0x2932516D9564CB799DDA2c16559caD5b8357a0D6"
 * 
 * Run test:
 * truffle test mainnet-fork-test/bsc/ACoconutBTC-BSC+.test.js
 */
contract("ACoconutBTCBscPlus+", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let acBTCBsc;
    let acBTCBscPlus;
    let startTime;

    beforeEach(async () => {
        acBTCBsc = await ERC20Upgradeable.at(ACOCONUT_BTC_BSC);
        acBTCBscPlus = await ACoconutBTCBscPlus.at(ACOCONUT_BTC_BSC_PLUS);

        startTime = (await time.latest()).addn(10);
    });
    it("should mint acBTCBsc", async () => {
        const totalSupply1 = await acBTCBscPlus.totalSupply();
        const balance1 = await acBTCBscPlus.balanceOf(USER);
        console.log('acBTCBsc+ total supply 1: ', totalSupply1.toString());
        console.log('acBTCBsc+ balance 1: ', balance1.toString());
        console.log('acBTCBsc balance 1: ', (await acBTCBsc.balanceOf(USER)).toString());

        await acBTCBsc.approve(acBTCBscPlus.address, toWei("0.01"), {from: USER});
        await acBTCBscPlus.mint(toWei("0.01"), {from: USER});

        const totalSupply2 = await acBTCBscPlus.totalSupply();
        const balance2 = await acBTCBscPlus.balanceOf(USER);
        console.log('acBTCBsc+ total supply 2: ', totalSupply2.toString());
        console.log('acBTCBsc+ balance 2: ', balance2.toString());

        await acBTCBscPlus.invest({from: DEPLOYER});
        await timeIncreaseTo(startTime.addn(50000));
        await acBTCBscPlus.harvest({from: DEPLOYER});

        const totalSupply3 = await acBTCBscPlus.totalSupply();
        const balance3 = await acBTCBscPlus.balanceOf(USER);
        console.log('acBTCBsc+ total supply 3: ', totalSupply3.toString());
        console.log('acBTCBsc+ balance 3: ', balance3.toString());

        await acBTCBscPlus.redeem(MAX, {from: USER});
        const totalSupply4 = await acBTCBscPlus.totalSupply();
        const balance4 = await acBTCBscPlus.balanceOf(USER);
        console.log('acBTCBsc+ total supply 4: ', totalSupply4.toString());
        console.log('acBTCBsc+ balance 4: ', balance4.toString());
    });
});
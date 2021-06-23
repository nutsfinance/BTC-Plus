const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const RenCrvPlus = artifacts.require("RenCrvPlus");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const REN_CRV = "0x49849C98ae39Fff122806C06791Fa73784FB3675";
const REN_CRV_PLUS = "0xF26d963a0420F285cBa59dC6C0a65e34E55C8396";
const DEPLOYER = "0x2932516D9564CB799DDA2c16559caD5b8357a0D6";
const USER = "0xc280F35eeb97564dFd6BF80722e031D8f5bd82C9";

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
 * ganache-cli --fork https://mainnet.infura.io/v3/0df468116d40490fb2929a8d6664b1d2 -u "0xc280F35eeb97564dFd6BF80722e031D8f5bd82C9" -u "0x2932516D9564CB799DDA2c16559caD5b8357a0D6"
 * 
 * Run test:
 * truffle test mainnet-fork-test/eth/RenCrv+.test.js
 */
contract("RenCrv+", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let renCrv;
    let renCrvPlus;
    let startTime;

    beforeEach(async () => {
        renCrv = await ERC20Upgradeable.at(REN_CRV);
        renCrvPlus = await RenCrvPlus.at(REN_CRV_PLUS);
        startTime = (await time.latest()).addn(10);
    });
    it("should mint renCrv", async () => {
        const totalSupply1 = await renCrvPlus.totalSupply();
        const balance1 = await renCrvPlus.balanceOf(USER);
        console.log('renCrv+ total supply 1: ', totalSupply1.toString());
        console.log('renCrv+ balance 1: ', balance1.toString());
        console.log('renCrv balance 1: ', (await renCrv.balanceOf(USER)).toString());

        await renCrv.approve(renCrvPlus.address, toWei("0.01"), {from: USER});
        await renCrvPlus.mint(toWei("0.01"), {from: USER});

        const totalSupply2 = await renCrvPlus.totalSupply();
        const balance2 = await renCrvPlus.balanceOf(USER);
        console.log('renCrv+ total supply 2: ', totalSupply2.toString());
        console.log('renCrv+ balance 2: ', balance2.toString());

        await timeIncreaseTo(startTime.addn(5000));
        await renCrvPlus.harvest({from: DEPLOYER});

        const totalSupply3 = await renCrvPlus.totalSupply();
        const balance3 = await renCrvPlus.balanceOf(USER);
        console.log('renCrv+ total supply 3: ', totalSupply3.toString());
        console.log('renCrv+ balance 3: ', balance3.toString());

        await renCrvPlus.redeem(MAX, {from: USER});
        const totalSupply4 = await renCrvPlus.totalSupply();
        const balance4 = await renCrvPlus.balanceOf(USER);
        console.log('renCrv+ total supply 4: ', totalSupply4.toString());
        console.log('renCrv+ balance 4: ', balance4.toString());
    });
});
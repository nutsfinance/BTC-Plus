const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const AutoBTC = artifacts.require("AutoBTC");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");
const ERC20Proxy = artifacts.require("ERC20Proxy");
const IAutoFarm = artifacts.require("IAutoFarm");
const IStrat = artifacts.require("IStrat");

const AUTO = "0xa184088a740c695E156F91f5cC086a06bb78b827";
const BTCB = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c";
const DEPLOYER = "0x098d907E1A3F26cC65B8ACa1c37E41B208699bac";
const AUTO_FARM = "0x0895196562C7868C5Be92459FaE7f877ED450452";
const AUTOBTC = "0x5AA676577F7A69F8761F5A19ae6057A386D6a48e";
const BTCB_STRAT = '0xA8c50e9F552886612109fE27CB94111A2F8006DE';

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
    let autoFarm;
    let autoBTC;
    let btcbStrat;
    let startTime;

    beforeEach(async () => {
        btcb = await ERC20Upgradeable.at(BTCB);
        auto = await ERC20Upgradeable.at(AUTO);
        autoFarm = await IAutoFarm.at(AUTO_FARM);
        autoBTC = await AutoBTC.at(AUTOBTC);
        btcbStrat = await IStrat.at(BTCB_STRAT);

        // const autoBTCImpl = await AutoBTC.new();
        // console.log(`autoBTC implementation: ${autoBTCImpl.address}`);
        // const autoBTCProxy = await ERC20Proxy.new(autoBTCImpl.address, proxyAdmin, Buffer.from(''));
        // autoBTC = await AutoBTC.at(autoBTCProxy.address);
        // autoBTC.initialize({from: DEPLOYER});
        // console.log(`autoBTC: ${autoBTC.address}`);

        startTime = (await time.latest()).addn(10);
    });
    it("should mint and redeem autoBTC", async () => {
        // const btcb1 = await btcb.balanceOf(DEPLOYER);
        // console.log(`BTCB balance 1: ${btcb1.toString()}`);
        // const share1 = await btcbStrat.sharesTotal();
        // const locked1 = await btcbStrat.wantLockedTotal();
        // console.log(`Shares total 1: ${share1.toString()}`);
        // console.log(`Locked total 1: ${locked1.toString()}\n`);
        // await btcb.approve(AUTO_FARM, toWei("0.001"), {from: DEPLOYER});
        // await autoFarm.deposit(3, toWei("0.001"), {from: DEPLOYER});

        // const btcb2 = await btcb.balanceOf(DEPLOYER);
        // console.log(`BTCB balance 2: ${btcb2.toString()}`);
        // const share2 = await btcbStrat.sharesTotal();
        // const locked2 = await btcbStrat.wantLockedTotal();
        // console.log(`Shares total 2: ${share2.toString()}, diff: ${share2.sub(share1).toString()}`);
        // console.log(`Locked total 2: ${locked2.toString()}, diff: ${locked2.sub(locked1).toString()}\n`);

        // await autoFarm.withdraw(3, toWei("0.001"), {from: DEPLOYER});
        // const btcb3 = await btcb.balanceOf(DEPLOYER);        
        // console.log(`BTCB balance 3: ${btcb3.toString()}`);
        // console.log(`Shares total 3: ${(await btcbStrat.sharesTotal()).toString()}`);
        // console.log(`Locked total 3: ${(await btcbStrat.wantLockedTotal()).toString()}`);



        const totalSupply1 = await autoBTC.totalSupply();
        const balance1 = await autoBTC.balanceOf(DEPLOYER);
        const btcb1 = await btcb.balanceOf(DEPLOYER);
        console.log('autoBTC total supply 1: ', totalSupply1.toString());
        console.log('autoBTC balance 1: ', balance1.toString());
        console.log('BTCB balance 1: ', btcb1.toString());

        await btcb.approve(autoBTC.address, toWei("0.001"), {from: DEPLOYER});
        await autoBTC.mint(toWei("0.001"), {from: DEPLOYER});

        const totalSupply2 = await autoBTC.totalSupply();
        const balance2 = await autoBTC.balanceOf(DEPLOYER);
        const btcb2 = await btcb.balanceOf(DEPLOYER);
        console.log('autoBTC total supply 2: ', totalSupply2.toString());
        console.log('autoBTC balance 2: ', balance2.toString());
        console.log('BTCB balance 2: ', btcb2.toString());
        assert.strictEqual(btcb1.toString(), btcb2.add(new BN(toWei("0.001"))).toString());

        const exchangeRate = await autoBTC.exchangeRate();
        console.log('Exchange rate: ' + exchangeRate.toString());
        // The deposited value in BTCB
        const amount = totalSupply2.sub(totalSupply1).mul(exchangeRate).div(new BN(toWei("1")));
        console.log('Amount: ' + amount.toString());
        // The deposited value should be close 0.001 BTCB
        assertAlmostEqual(amount, toWei("0.001"));

        // const autoPrev = await auto.balanceOf(DEPLOYER);
        // console.log('Auto balance prev: ' + autoPrev.toString());
        // await timeIncreaseTo(startTime.addn(5000));
        // await autoBTC.claimRewards({from: DEPLOYER});
        // const autoAfter = await auto.balanceOf(DEPLOYER);
        // console.log('Auto balance after: ' + autoAfter.toString());

        await autoBTC.redeem(toWei("0.001"), {from: DEPLOYER});
        const totalSupply3 = await autoBTC.totalSupply();
        const balance3 = await autoBTC.balanceOf(DEPLOYER);
        const btcb3 = await btcb.balanceOf(DEPLOYER);
        console.log('autoBTC total supply 3: ', totalSupply3.toString());
        console.log('autoBTC balance 3: ', balance3.toString());
        console.log('BTCB balance 3: ', btcb3.toString());
        assertAlmostEqual(btcb1, btcb3);
    });
    it("should claim rewards after transfer", async () => {
        await btcb.approve(autoBTC.address, toWei("0.001"), {from: DEPLOYER});
        await autoBTC.mint(toWei("0.001"), {from: DEPLOYER});

        console.log((await autoBTC.rewardPerTokenStored()).toString());
        console.log((await autoBTC.lastReward()).toString());
        console.log((await autoBTC.rewardPerTokenPaid(DEPLOYER)).toString());
        console.log((await autoBTC.rewardPerTokenPaid(user)).toString());
        console.log((await autoBTC.rewards(DEPLOYER)).toString());
        console.log((await autoBTC.rewards(user)).toString());
        console.log((await autoFarm.pendingAUTO(3, autoBTC.address)).toString());
        console.log('Balance: ' + (await auto.balanceOf(autoBTC.address)).toString());
        console.log("1. ----------------------------------------------------");

        await timeIncreaseTo(startTime.addn(5000));
        const balance = await autoBTC.balanceOf(DEPLOYER);

        console.log((await autoBTC.rewardPerTokenStored()).toString());
        console.log((await autoBTC.lastReward()).toString());
        console.log((await autoBTC.rewardPerTokenPaid(DEPLOYER)).toString());
        console.log((await autoBTC.rewardPerTokenPaid(user)).toString());
        console.log((await autoBTC.rewards(DEPLOYER)).toString());
        console.log((await autoBTC.rewards(user)).toString());
        console.log((await autoFarm.pendingAUTO(3, autoBTC.address)).toString());
        console.log('Balance: ' + (await auto.balanceOf(autoBTC.address)).toString());
        console.log("2. ----------------------------------------------------");

        await autoBTC.claimRewards({from: DEPLOYER});

        console.log((await autoBTC.rewardPerTokenStored()).toString());
        console.log((await autoBTC.lastReward()).toString());
        console.log((await autoBTC.rewardPerTokenPaid(DEPLOYER)).toString());
        console.log((await autoBTC.rewardPerTokenPaid(user)).toString());
        console.log((await autoBTC.rewards(DEPLOYER)).toString());
        console.log((await autoBTC.rewards(user)).toString());
        console.log((await autoFarm.pendingAUTO(3, autoBTC.address)).toString());
        console.log('Balance: ' + (await auto.balanceOf(autoBTC.address)).toString());
        console.log("3. ----------------------------------------------------");

        await autoBTC.transfer(user, balance, {from: DEPLOYER});

        console.log((await autoBTC.rewardPerTokenStored()).toString());
        console.log((await autoBTC.lastReward()).toString());
        console.log((await autoBTC.rewardPerTokenPaid(DEPLOYER)).toString());
        console.log((await autoBTC.rewardPerTokenPaid(user)).toString());
        console.log((await autoBTC.rewards(DEPLOYER)).toString());
        console.log((await autoBTC.rewards(user)).toString());
        console.log((await autoFarm.pendingAUTO(3, autoBTC.address)).toString());
        console.log('Balance: ' + (await auto.balanceOf(autoBTC.address)).toString());
        console.log("4. ----------------------------------------------------");

        await timeIncreaseTo(startTime.addn(7000));

        console.log((await autoBTC.rewardPerTokenStored()).toString());
        console.log((await autoBTC.lastReward()).toString());
        console.log((await autoBTC.rewardPerTokenPaid(DEPLOYER)).toString());
        console.log((await autoBTC.rewardPerTokenPaid(user)).toString());
        console.log((await autoBTC.rewards(DEPLOYER)).toString());
        console.log((await autoBTC.rewards(user)).toString());
        console.log((await autoFarm.pendingAUTO(3, autoBTC.address)).toString());
        console.log('Balance: ' + (await auto.balanceOf(autoBTC.address)).toString());
        console.log("5. ----------------------------------------------------");

        const auto1 = await auto.balanceOf(DEPLOYER);
        const auto2 = await auto.balanceOf(user);
        console.log('AUTO 1: ' + auto1.toString());
        console.log('AUTO 2: ' + auto2.toString());
        await autoBTC.claimRewards({from: DEPLOYER});

        console.log((await autoBTC.rewardPerTokenStored()).toString());
        console.log((await autoBTC.lastReward()).toString());
        console.log((await autoBTC.rewardPerTokenPaid(DEPLOYER)).toString());
        console.log((await autoBTC.rewardPerTokenPaid(user)).toString());
        console.log((await autoBTC.rewards(DEPLOYER)).toString());
        console.log((await autoBTC.rewards(user)).toString());
        console.log((await autoFarm.pendingAUTO(3, autoBTC.address)).toString());
        console.log('Balance: ' + (await auto.balanceOf(autoBTC.address)).toString());
        console.log("6. ----------------------------------------------------");

        await autoBTC.claimRewards({from: user});

        console.log((await autoBTC.rewardPerTokenStored()).toString());
        console.log((await autoBTC.lastReward()).toString());
        console.log((await autoBTC.rewardPerTokenPaid(DEPLOYER)).toString());
        console.log((await autoBTC.rewardPerTokenPaid(user)).toString());
        console.log((await autoBTC.rewards(DEPLOYER)).toString());
        console.log((await autoBTC.rewards(user)).toString());
        console.log((await autoFarm.pendingAUTO(3, autoBTC.address)).toString());
        console.log('Balance: ' + (await auto.balanceOf(autoBTC.address)).toString());
        console.log("7. ----------------------------------------------------");

        const auto3 = await auto.balanceOf(DEPLOYER);
        const auto4 = await auto.balanceOf(user);
        console.log('AUTO 3: ' + auto3.toString());
        console.log('AUTO 4: ' + auto4.toString());

        await autoBTC.redeem(toWei("0.001"), {from: user});
        const totalSupply3 = await autoBTC.totalSupply();
        const balance3 = await autoBTC.balanceOf(user);
        console.log('autoBTC total supply 3: ', totalSupply3.toString());
        console.log('autoBTC balance 3: ', balance3.toString());
    });
});
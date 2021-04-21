const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const assert = require('assert');
const AutoBTCV2Plus = artifacts.require("AutoBTCV2Plus");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const AUTO_BTC_PLUS = "0x7780b26aB2586Ad0e0192CafAAE93BfA09a106F3";
const BTCB = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c";
const STRATEGIST = "0x098d907E1A3F26cC65B8ACa1c37E41B208699bac";
const PROXY_ADMIN = "0x03C7CF9A445a6FB7bD9340659f2b5f4c7C746814";
const DEPLOYER = "0x2932516D9564CB799DDA2c16559caD5b8357a0D6";

/**
 * Start Mainnet fork node on BSC:
 * ganache-cli --fork https://bsc-dataseed.binance.org/ -u "0x098d907E1A3F26cC65B8ACa1c37E41B208699bac" -u "0x03C7CF9A445a6FB7bD9340659f2b5f4c7C746814" -u "0x2932516D9564CB799DDA2c16559caD5b8357a0D6"
 * 
 * Run test:
 * truffle test mainnet-fork-test/AutoBTC-deprecate.test.js
 */
contract("AutoBTC+", async ([owner, proxyAdmin, user, user2, treasury]) => {
    let btcb;
    let autoBTCv2;

    beforeEach(async () => {
        btcb = await ERC20Upgradeable.at(BTCB);
        const autoBTCv2Impl = await AutoBTCV2Plus.new();
        const autoBTCv2Proxy = await ERC20Proxy.at(AUTO_BTC_PLUS);
        await autoBTCv2Proxy.upgradeTo(autoBTCv2Impl.address, {from: PROXY_ADMIN});
        autoBTCv2 = await AutoBTCV2Plus.at(AUTO_BTC_PLUS);
    });
    it("should redeem after clear", async () => {
        const balance1 = await btcb.balanceOf(AUTO_BTC_PLUS);
        console.log(balance1.toString());
        const totalSupply1 = await autoBTCv2.totalSupply();
        console.log(totalSupply1.toString());
        await autoBTCv2.clear({from: STRATEGIST});

        const balance2 = await btcb.balanceOf(AUTO_BTC_PLUS);
        console.log(balance2.toString());
        const totalSupply2 = await autoBTCv2.totalSupply();
        console.log(totalSupply2.toString());

        console.log("----------------------------------");

        const user1 = await autoBTCv2.balanceOf(DEPLOYER);
        console.log(user1.toString());
        const userBtcb1 = await btcb.balanceOf(DEPLOYER);
        console.log(userBtcb1.toString());

        await autoBTCv2.redeem(user1, {from: DEPLOYER});

        const user2 = await autoBTCv2.balanceOf(DEPLOYER);
        console.log(user2.toString());
        const userBtcb2 = await btcb.balanceOf(DEPLOYER);
        console.log(userBtcb2.toString());

        const balance3 = await btcb.balanceOf(AUTO_BTC_PLUS);
        console.log(balance3.toString());
        const totalSupply3 = await autoBTCv2.totalSupply();
        console.log(totalSupply3.toString());
    });
});
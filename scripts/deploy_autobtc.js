const AutoBTC = artifacts.require("AutoBTC");
const AutoBTCPlus = artifacts.require("AutoBTCPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const BN = web3.utils.BN;
const toWei = web3.utils.toWei;
const MAX = new BN(2).pow(new BN(256)).sub(new BN(1));
const BTCB = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c";
const DEPLOYER = "0x098d907E1A3F26cC65B8ACa1c37E41B208699bac";

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();
        const btcb = await ERC20Upgradeable.at(BTCB);

        console.log('Deploying autoBTC...');
        const autoBTCImpl = await AutoBTC.new();
        const autoBTCProxy = await ERC20Proxy.new(autoBTCImpl.address, accounts[1], Buffer.from(''));
        const autoBTC = await AutoBTC.at(autoBTCProxy.address);
        await autoBTC.initialize({from: DEPLOYER});

        console.log(`autoBTC implementation: ${autoBTCImpl.address}`);
        console.log(`autoBTC: ${autoBTC.address}`);
        // const autoBTC = await AutoBTC.at("0x54fA94FD0F8231863930C7dbf612077f378F03fB");

        // console.log(`autoBTC: ${autoBTC.address}`);
        await btcb.approve(autoBTC.address, toWei("0.003"), {from: DEPLOYER});
        await autoBTC.mint(toWei("0.003"), {from: DEPLOYER});

        // console.log('Deploying fBTC+...');
        // const fBTCPlusImpl = await ForTubeBTCBPlus.new();
        // const fBTCPlusProxy = await PlusProxy.new(fBTCPlusImpl.address, accounts[1], Buffer.from(''));
        // const fBTCPlus = await ForTubeBTCBPlus.at(fBTCPlusProxy.address);
        // await fBTCPlus.initialize();

        // console.log(`Proxy admin: ${accounts[1]}`);
        // console.log(`fBTC+: ${fBTCPlus.address}`);
        // console.log(`fBTC+ implementation: ${fBTCPlusImpl.address}`);

        // const fBTCPlus = await ForTubeBTCBPlus.at("0xD7F984196392C7eA791F4A39e797e8dE19Ca898d");
        // const fBTC = await ERC20Upgradeable.at(FBTC);

        // console.log('Total supply prev: ', (await fBTCPlus.totalSupply()).toString());
        // console.log('fBTC+ balance prev: ', (await fBTCPlus.balanceOf(accounts[0])).toString());
        // console.log('fBTC balance prev: ', (await fBTC.balanceOf(accounts[0])).toString());

        // await fBTC.approve(fBTCPlus.address, web3.utils.toWei("0.0001"));
        // await fBTCPlus.mint(web3.utils.toWei("0.0001"));

        // console.log('Total supply after:', (await fBTCPlus.totalSupply()).toString());
        // console.log('fBTC+ balance after: ', (await fBTCPlus.balanceOf(accounts[0])).toString());
        // console.log('fBTC balance after: ', (await fBTC.balanceOf(accounts[0])).toString());

        callback();
    } catch (e) {
        callback(e);
    }
}
const AutoBTCPlus = artifacts.require("AutoBTCPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const AUTOBTC = '0x6B7Ea9F1EF1E6c662761201998Dc876b88Ed7414';
const BN = web3.utils.BN;
const MAX = new BN(2).pow(new BN(256)).sub(new BN(1));
const toWei = web3.utils.toWei;

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying autoBTC+...');
        const autoBTCPlusImpl = await AutoBTCPlus.new();
        const autoBTCPlusProxy = await ERC20Proxy.new(autoBTCPlusImpl.address, accounts[1], Buffer.from(''));
        const autoBTCPlus = await AutoBTCPlus.at(autoBTCPlusProxy.address);
        await autoBTCPlus.initialize();

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`autoBTC+: ${autoBTCPlus.address}`);
        console.log(`autoBTC+ implementation: ${autoBTCPlusImpl.address}`);

        // const autoBTC = await ERC20Upgradeable.at(AUTOBTC);
        // const autoBTCPlus = await AutoBTCPlus.at("0x33938f7f60E276a5eD0474B905E77C9708C9135A");

        // console.log('Total supply prev: ', (await autoBTCPlus.totalSupply()).toString());
        // console.log('autoBTC+ balance prev: ', (await autoBTCPlus.balanceOf(accounts[0])).toString());
        // console.log('autoBTC balance prev: ', (await autoBTC.balanceOf(accounts[0])).toString());

        // await autoBTC.approve(autoBTCPlus.address, toWei("0.001"));
        // await autoBTCPlus.mint(toWei("0.001"));

        // await vBTCPlus.mint("1000000");
        // await autoBTCPlus.invest();
        // await vBTCPlus.redeem(MAX);
        // await autoBTCPlus.harvest();

        // console.log('Total supply after:', (await autoBTCPlus.totalSupply()).toString());
        // console.log('autoBTC+ balance after: ', (await autoBTCPlus.balanceOf(accounts[0])).toString());
        // console.log('autoBTC balance after: ', (await autoBTC.balanceOf(accounts[0])).toString());

        callback();
    } catch (e) {
        callback(e);
    }
}
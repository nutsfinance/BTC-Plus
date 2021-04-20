const AutoBTCV2Plus = artifacts.require("AutoBTCV2Plus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const AUTOBTC_V2_PLUS = '0x7780b26aB2586Ad0e0192CafAAE93BfA09a106F3';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading autoBTC+...');
        const autoBTCV2PlusImpl = await AutoBTCV2Plus.new();
        const autoBTCV2PlusProxy = await ERC20Proxy.at(AUTOBTC_V2_PLUS);
        await autoBTCV2PlusProxy.upgradeTo(autoBTCV2PlusImpl.address, {from: accounts[1]});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`autoBTC+: ${autoBTCV2PlusProxy.address}`);
        console.log(`autoBTC+ implementation: ${autoBTCV2PlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
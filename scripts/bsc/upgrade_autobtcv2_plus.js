const AutoBTCV2Plus = artifacts.require("AutoBTCV2Plus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const AUTOBTC_V2_PLUS = '0x7780b26aB2586Ad0e0192CafAAE93BfA09a106F3';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading autoBTC+...');
        const autoBTCV2PlusImpl = await AutoBTCV2Plus.new();
        const autoBTCV2PlusProxy = await ERC20Proxy.at(AUTOBTC_V2_PLUS);
        await autoBTCV2PlusProxy.upgradeTo(autoBTCV2PlusImpl.address, {from: "0x03C7CF9A445a6FB7bD9340659f2b5f4c7C746814"});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`autoBTC+: ${autoBTCV2PlusProxy.address}`);
        console.log(`autoBTC+ implementation: ${autoBTCV2PlusImpl.address}`);

        const autoBTCV2Plus = await AutoBTCV2Plus.at(AUTOBTC_V2_PLUS);
        const values = await autoBTCV2Plus.getRedeemAmount("0");
        console.log(values[0].toString());
        console.log(values[1].toString());

        callback();
    } catch (e) {
        callback(e);
    }
}
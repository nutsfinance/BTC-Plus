const AutoBTCV2Plus = artifacts.require("AutoBTCV2Plus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying autoBTCv2+...');
        const autoBTCPlusImpl = await AutoBTCV2Plus.new();
        const autoBTCPlusProxy = await ERC20Proxy.new(autoBTCPlusImpl.address, accounts[1], Buffer.from(''));
        const autoBTCPlus = await AutoBTCV2Plus.at(autoBTCPlusProxy.address);
        await autoBTCPlus.initialize();

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`autoBTCv2+: ${autoBTCPlus.address}`);
        console.log(`autoBTCv2+ implementation: ${autoBTCPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
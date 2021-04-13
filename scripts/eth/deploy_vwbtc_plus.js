const VesperWBTCPlus = artifacts.require("VesperWBTCPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying vWBTC+...');
        const vWBTCPlusImpl = await VesperWBTCPlus.new();
        const vWBTCPlusProxy = await ERC20Proxy.new(vWBTCPlusImpl.address, accounts[1], Buffer.from(''));
        const vWBTCPlus = await VesperWBTCPlus.at(vWBTCPlusProxy.address);
        await vWBTCPlus.initialize();

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`vWBTC+: ${vWBTCPlus.address}`);
        console.log(`vWBTC+ implementation: ${vWBTCPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
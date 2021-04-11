const AaveWBTCPlus = artifacts.require("AaveWBTCPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying aWBTC+...');
        const aWBTCPlusImpl = await AaveWBTCPlus.new();
        const aWBTCPlusProxy = await ERC20Proxy.new(aWBTCPlusImpl.address, accounts[1], Buffer.from(''));
        const aWBTCPlus = await AaveWBTCPlus.at(aWBTCPlusProxy.address);
        await aWBTCPlus.initialize();

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`aWBTC+: ${aWBTCPlus.address}`);
        console.log(`aWBTC+ implementation: ${aWBTCPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
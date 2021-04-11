const ACoconutBTCPlus = artifacts.require("ACoconutBTCPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying acBTC+...');
        const acBTCPlusImpl = await ACoconutBTCPlus.new();
        const acBTCPlusProxy = await ERC20Proxy.new(acBTCPlusImpl.address, accounts[1], Buffer.from(''));
        const acBTCPlus = await ACoconutBTCPlus.at(acBTCPlusProxy.address);
        await acBTCPlus.initialize();

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`acBTC+: ${acBTCPlus.address}`);
        console.log(`acBTC+ implementation: ${acBTCPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
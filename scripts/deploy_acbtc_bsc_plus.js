const ACoconutBTCBscPlus = artifacts.require("ACoconutBTCBscPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying acBTC-BSC+...');
        const acBTCPlusImpl = await ACoconutBTCBscPlus.new();
        const acBTCPlusProxy = await ERC20Proxy.new(acBTCPlusImpl.address, accounts[1], Buffer.from(''));
        const acBTCPlus = await ACoconutBTCBscPlus.at(acBTCPlusProxy.address);
        await acBTCPlus.initialize();

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`acBTC-BSC+: ${acBTCPlus.address}`);
        console.log(`acBTC-BSC+ implementation: ${acBTCPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
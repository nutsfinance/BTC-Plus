const CompoundWBTCPlus = artifacts.require("CompoundWBTCPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying cWBTC+...');
        const cWBTCPlusImpl = await CompoundWBTCPlus.new();
        const cWBTCPlusProxy = await ERC20Proxy.new(cWBTCPlusImpl.address, accounts[1], Buffer.from(''));
        const cWBTCPlus = await CompoundWBTCPlus.at(cWBTCPlusProxy.address);
        await cWBTCPlus.initialize();

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`cWBTC+: ${cWBTCPlus.address}`);
        console.log(`cWBTC+ implementation: ${cWBTCPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
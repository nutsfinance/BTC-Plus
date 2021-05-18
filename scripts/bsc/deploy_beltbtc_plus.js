const BeltBTCPlus = artifacts.require("BeltBTCPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying beltBTC+...');
        const beltBTCPlusImpl = await BeltBTCPlus.new();
        const beltBTCPlusProxy = await ERC20Proxy.new(beltBTCPlusImpl.address, accounts[1], Buffer.from(''));
        const beltBTCPlus = await BeltBTCPlus.at(beltBTCPlusProxy.address);
        await beltBTCPlus.initialize();

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`beltBTC+: ${beltBTCPlus.address}`);
        console.log(`beltBTC+ implementation: ${beltBTCPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
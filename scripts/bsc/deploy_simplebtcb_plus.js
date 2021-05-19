const SimpleBTCBPlus = artifacts.require("SimpleBTCBPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying simpleBTCB+...');
        const simpleBTCBPlusImpl = await SimpleBTCBPlus.new();
        const simpleBTCBPlusProxy = await ERC20Proxy.new(simpleBTCBPlusImpl.address, accounts[1], Buffer.from(''));
        const simpleBTCBPlus = await SimpleBTCBPlus.at(simpleBTCBPlusProxy.address);
        await simpleBTCBPlus.initialize();

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`simpleBTCB+: ${simpleBTCBPlus.address}`);
        console.log(`simpleBTCB+ implementation: ${simpleBTCBPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
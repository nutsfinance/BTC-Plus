const YearnHBTCCrvPlus = artifacts.require("YearnHBTCCrvPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying yHBTCCrv+...');
        const yHBTCCrvPlusImpl = await YearnHBTCCrvPlus.new();
        const yHBTCCrvPlusProxy = await ERC20Proxy.new(yHBTCCrvPlusImpl.address, accounts[1], Buffer.from(''));
        const yHBTCCrvPlus = await YearnHBTCCrvPlus.at(yHBTCCrvPlusProxy.address);
        await yHBTCCrvPlus.initialize();

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`yHBTCCrv+: ${yHBTCCrvPlus.address}`);
        console.log(`yHBTCCrv+ implementation: ${yHBTCCrvPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
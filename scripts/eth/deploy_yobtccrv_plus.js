const YearnOBTCCrvPlus = artifacts.require("YearnOBTCCrvPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying yoBTCCrv+...');
        const yoBTCCrvPlusImpl = await YearnOBTCCrvPlus.new();
        const yoBTCCrvPlusProxy = await ERC20Proxy.new(yoBTCCrvPlusImpl.address, accounts[1], Buffer.from(''));
        const yoBTCCrvPlus = await YearnOBTCCrvPlus.at(yoBTCCrvPlusProxy.address);
        await yoBTCCrvPlus.initialize();

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`yoBTCCrv+: ${yoBTCCrvPlus.address}`);
        console.log(`yoBTCCrv+ implementation: ${yoBTCCrvPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
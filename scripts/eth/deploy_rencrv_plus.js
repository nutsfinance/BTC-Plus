const RenCrvPlus = artifacts.require("RenCrvPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying renCrv+...');
        const renCrvPlusImpl = await RenCrvPlus.new();
        const renCrvPlusProxy = await ERC20Proxy.new(renCrvPlusImpl.address, accounts[1], Buffer.from(''));
        const renCrvPlus = await RenCrvPlus.at(renCrvPlusProxy.address);
        await renCrvPlus.initialize();

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`renCrv+: ${renCrvPlus.address}`);
        console.log(`renCrv+ implementation: ${renCrvPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
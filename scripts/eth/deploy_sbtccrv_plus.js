const SbtcCrvPlus = artifacts.require("SbtcCrvPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying sbtcCrv+...');
        const sbtcCrvPlusImpl = await SbtcCrvPlus.new();
        const sbtcCrvPlusProxy = await ERC20Proxy.new(sbtcCrvPlusImpl.address, accounts[1], Buffer.from(''));
        const sbtcCrvPlus = await SbtcCrvPlus.at(sbtcCrvPlusProxy.address);
        await sbtcCrvPlus.initialize();

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`sbtcCrv+: ${sbtcCrvPlus.address}`);
        console.log(`sbtcCrv+ implementation: ${sbtcCrvPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
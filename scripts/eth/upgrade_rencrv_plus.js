const RenCrvPlus = artifacts.require("RenCrvPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const RENCRV_PLUS = '0xF26d963a0420F285cBa59dC6C0a65e34E55C8396';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading renCrv+...');
        const renCrvPlusImpl = await RenCrvPlus.new();
        const renCrvPlusProxy = await ERC20Proxy.at(RENCRV_PLUS);
        await renCrvPlusProxy.upgradeTo(renCrvPlusImpl.address, {from: accounts[1]});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`renCrv+: ${renCrvPlusProxy.address}`);
        console.log(`renCrv+ implementation: ${renCrvPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
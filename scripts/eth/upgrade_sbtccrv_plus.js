const SbtcCrvPlus = artifacts.require("SbtcCrvPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const SBTCCRV_PLUS = '0xE7D839c303C4C8d0B0094019663D2111A689F531';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading sbtcCrv+...');
        const sbtcCrvPlusImpl = await SbtcCrvPlus.new();
        const sbtcCrvPlusProxy = await ERC20Proxy.at(SBTCCRV_PLUS);
        await sbtcCrvPlusProxy.upgradeTo(sbtcCrvPlusImpl.address, {from: accounts[1]});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`sbtcCrv+: ${sbtcCrvPlusProxy.address}`);
        console.log(`sbtcCrv+ implementation: ${sbtcCrvPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
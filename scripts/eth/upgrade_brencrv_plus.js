const BadgerRenCrvPlus = artifacts.require("BadgerRenCrvPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const BRENCRV_PLUS = '0x87BAA3E048528d21302Fb15acd09a4e5cB5098cB';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading brenCrv+...');
        const brenCrvPlusImpl = await BadgerRenCrvPlus.new();
        // const brenCrvPlusImpl = await BadgerRenCrvPlus.at("0xce11F061A456E0b52D5d79dEF119198D85E8eAd8");
        const brenCrvPlusProxy = await ERC20Proxy.at(BRENCRV_PLUS);
        await brenCrvPlusProxy.upgradeTo(brenCrvPlusImpl.address, {from: accounts[1]});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`brenCrv+: ${brenCrvPlusProxy.address}`);
        console.log(`brenCrv+ implementation: ${brenCrvPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
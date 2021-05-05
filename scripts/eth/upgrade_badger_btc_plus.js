const BadgerBTCPlus = artifacts.require("BadgerBTCPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const BADGER_BTC_PLUS = '0x7cD7a5B7Ebe9F852bD1E87117b36504D22d9385B';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading badgerBTC+...');
        const badgerBTCPlusImpl = await BadgerBTCPlus.new();
        const badgerBTCPlusProxy = await ERC20Proxy.at(BADGER_BTC_PLUS);
        await badgerBTCPlusProxy.upgradeTo(badgerBTCPlusImpl.address, {from: accounts[1]});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`badgerBTC+: ${badgerBTCPlusProxy.address}`);
        console.log(`badgerBTC+ implementation: ${badgerBTCPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
const AutoBTC = artifacts.require("AutoBTC");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const AUTO_BTC = "0x6B7Ea9F1EF1E6c662761201998Dc876b88Ed7414";

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading autoBTC...');
        const autoBTCImpl = await AutoBTC.new();
        const autoBTCProxy = await ERC20Proxy.at(AUTO_BTC);
        await autoBTCProxy.upgradeTo(autoBTCImpl.address, {from: accounts[1]});

        console.log(`autoBTC: ${autoBTCProxy.address}`);
        console.log(`autoBTC implementation: ${autoBTCImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
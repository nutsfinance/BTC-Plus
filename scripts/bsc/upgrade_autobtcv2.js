const AutoBTCv2 = artifacts.require("AutoBTCv2");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const AUTO_BTC_V2 = "0x5AA676577F7A69F8761F5A19ae6057A386D6a48e";

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading autoBTCv2...');
        const autoBTCImpl = await AutoBTCv2.new();
        const autoBTCProxy = await ERC20Proxy.at(AUTO_BTC_V2);
        await autoBTCProxy.upgradeTo(autoBTCImpl.address, {from: accounts[1]});

        console.log(`autoBTC: ${autoBTCProxy.address}`);
        console.log(`autoBTC implementation: ${autoBTCImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
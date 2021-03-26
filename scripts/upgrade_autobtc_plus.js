const AutoBTCPlus = artifacts.require("AutoBTCPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const AUTOBTC_PLUS = '0x02827D495B2bBe37e1C021eB91BCdCc92cD3b604';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading autoBTC+...');
        const autoBTCPlusImpl = await AutoBTCPlus.new();
        const autoBTCPlusProxy = await ERC20Proxy.at(AUTOBTC_PLUS);
        await autoBTCPlusProxy.upgradeTo(autoBTCPlusImpl.address, {from: accounts[1]});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`autoBTC+: ${autoBTCPlusProxy.address}`);
        console.log(`autoBTC+ implementation: ${autoBTCPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
const CompoundWBTCPlus = artifacts.require("CompoundWBTCPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const CWBTC_PLUS = '0x60af76465c372768b72e0Fc9b43c61780Bd54163';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading cWBTC+...');
        const cWBTCPlusImpl = await CompoundWBTCPlus.new();
        const cWBTCPlusProxy = await ERC20Proxy.at(CWBTC_PLUS);
        await cWBTCPlusProxy.upgradeTo(cWBTCPlusImpl.address, {from: accounts[1]});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`cWBTC+: ${cWBTCPlusProxy.address}`);
        console.log(`cWBTC+ implementation: ${cWBTCPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
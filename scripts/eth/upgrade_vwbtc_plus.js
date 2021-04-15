const VesperWBTCPlus = artifacts.require("VesperWBTCPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const VWBTC_PLUS = '0x7ea60fED61f3b242b2012d92bCab5451e10F04f6';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading vWBTC+...');
        // const cWBTCPlusImpl = await VesperWBTCPlus.new();
        const cWBTCPlusImpl = await VesperWBTCPlus.at("0x3c12f7d8cbfe49ec341c80cb0e5517638e8f0550");
        const cWBTCPlusProxy = await ERC20Proxy.at(VWBTC_PLUS);
        await cWBTCPlusProxy.upgradeTo(cWBTCPlusImpl.address, {from: accounts[1]});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`vWBTC+: ${cWBTCPlusProxy.address}`);
        console.log(`vWBTC+ implementation: ${cWBTCPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
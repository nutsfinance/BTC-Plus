const VesperWBTCPlus = artifacts.require("VesperWBTCPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const VWBTC_PLUS = '0x7ea60fED61f3b242b2012d92bCab5451e10F04f6';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading vWBTC+...');
        const vWBTCPlusImpl = await VesperWBTCPlus.new();
        const vWBTCPlusProxy = await ERC20Proxy.at(VWBTC_PLUS);
        await vWBTCPlusProxy.upgradeTo(vWBTCPlusImpl.address, {from: accounts[1]});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`vWBTC+: ${vWBTCPlusProxy.address}`);
        console.log(`vWBTC+ implementation: ${vWBTCPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
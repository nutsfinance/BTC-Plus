const ACoconutBTCPlus = artifacts.require("ACoconutBTCPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const ACBTC_PLUS = '0x0CE9884B5d395655f5DB697598fD95D0Dc19e776';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading acBTC+...');
        const acBTCPlusImpl = await ACoconutBTCPlus.new();
        const acBTCPlusProxy = await ERC20Proxy.at(ACBTC_PLUS);
        await acBTCPlusProxy.upgradeTo(acBTCPlusImpl.address, {from: accounts[1]});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`acBTC+: ${acBTCPlusProxy.address}`);
        console.log(`acBTC+ implementation: ${acBTCPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
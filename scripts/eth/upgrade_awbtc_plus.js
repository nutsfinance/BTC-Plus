const AaveWBTCPlus = artifacts.require("AaveWBTCPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const AWBTC_PLUS = '0xCb52eC77e3d9b5b46758ccab2877F0344a4281dA';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading aWBTC+...');
        const aWBTCPlusImpl = await AaveWBTCPlus.new();
        const aWBTCPlusProxy = await ERC20Proxy.at(AWBTC_PLUS);
        await aWBTCPlusProxy.upgradeTo(aWBTCPlusImpl.address, {from: accounts[1]});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`aWBTC+: ${aWBTCPlusProxy.address}`);
        console.log(`aWBTC+ implementation: ${aWBTCPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
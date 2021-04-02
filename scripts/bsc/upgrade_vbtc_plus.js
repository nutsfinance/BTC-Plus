const VenusBTCPlus = artifacts.require("VenusBTCPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const VBTC_PLUS = '0xcf8D1D3Fce7C2138F85889068e50F0e7a18b5321';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading vBTC+...');
        const vBTCPlusImpl = await VenusBTCPlus.new();
        const vBTCPlusProxy = await ERC20Proxy.at(VBTC_PLUS);
        await vBTCPlusProxy.upgradeTo(vBTCPlusImpl.address, {from: accounts[1]});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`vBTC+: ${vBTCPlusProxy.address}`);
        console.log(`vBTC+ implementation: ${vBTCPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
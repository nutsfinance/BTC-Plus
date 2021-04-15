const BTCBPlus = artifacts.require("BTCBPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const VBTC_PLUS = "0xcf8D1D3Fce7C2138F85889068e50F0e7a18b5321";
const ACSBTCB_PLUS = "0xD7806143A4206aa9A816b964e4c994F533b830b0";

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying BTCB+...');
        const btcbPlusImpl = await BTCBPlus.new();
        const btcbPlusProxy = await ERC20Proxy.new(btcbPlusImpl.address, accounts[1], Buffer.from(''));
        const btcbPlus = await BTCBPlus.at(btcbPlusProxy.address);
        await btcbPlus.initialize();

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`btcb+: ${btcbPlus.address}`);
        console.log(`btcb+ implementation: ${btcbPlusImpl.address}`);

        console.log('Adding vBTC+ to BTCB+...');
        await btcbPlus.addToken(VBTC_PLUS);

        console.log('Adding avsBTCB+ to BTCB+...');
        await btcbPlus.addToken(ACSBTCB_PLUS);

        callback();
    } catch (e) {
        callback(e);
    }
}
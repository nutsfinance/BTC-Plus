const BTCBPlus = artifacts.require("BTCBPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const BTCB_PLUS = '0xe884E6695C4cB3c8DEFFdB213B50f5C2a1a9E0A2';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading BTCB+...');
        const btcbPlusImpl = await BTCBPlus.new();
        const btcbPlusProxy = await ERC20Proxy.at(BTCB_PLUS);
        await btcbPlusProxy.upgradeTo(btcbPlusImpl.address, {from: accounts[1]});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`BTCB+: ${btcbPlusProxy.address}`);
        console.log(`BTCB+ implementation: ${btcbPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
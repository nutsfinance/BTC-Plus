const ACryptoSBTCBPlus = artifacts.require("ACryptoSBTCBPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const ACS_BTCB_PLUS = '0xD7806143A4206aa9A816b964e4c994F533b830b0';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading acsBTCB+...');
        const acsBTCBPlusImpl = await ACryptoSBTCBPlus.new();
        const acsBTCBPlusProxy = await ERC20Proxy.at(ACS_BTCB_PLUS);
        await acsBTCBPlusProxy.upgradeTo(acsBTCBPlusImpl.address, {from: accounts[1]});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`acsBTCB+: ${acsBTCBPlusProxy.address}`);
        console.log(`acsBTCB+ implementation: ${acsBTCBPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
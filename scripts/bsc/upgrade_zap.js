const BTCZapBsc = artifacts.require("BTCZapBsc");
const ZapProxy = artifacts.require("ZapProxy");

const ZAP = "0x2bef1eD636949B10C1D1fE5Cf6D1481a2EC61F10";

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Updating BTCZapBsc...');
        const zapimpl = await BTCZapBsc.new();
        const zapProxy = await ZapProxy.at(ZAP);
        await zapProxy.upgradeTo(zapimpl.address, {from: accounts[1]});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`Zap: ${zapProxy.address}`);
        console.log(`Zap implementation: ${zapimpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
const BTCZapBsc = artifacts.require("BTCZapBsc");
const ZapProxy = artifacts.require("ZapProxy");

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying BTCZapBsc...');
        const zapimpl = await BTCZapBsc.new();
        const zapProxy = await ZapProxy.new(zapimpl.address, accounts[1], Buffer.from(''));
        const zap = await BTCZapBsc.at(zapProxy.address);
        await zap.initialize();

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`Zap: ${zap.address}`);
        console.log(`Zap implementation: ${zapimpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
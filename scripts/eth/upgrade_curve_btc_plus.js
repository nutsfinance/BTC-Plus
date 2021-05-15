const CurveBTCPlus = artifacts.require("CurveBTCPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const CURVE_BTC_PLUS = '0xDe79d36aB6D2489dd36729A657a25f299Cb2Fbca';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading curveBTC+...');
        const curveBTCPlusImpl = await CurveBTCPlus.new();
        const curveBTCPlusProxy = await ERC20Proxy.at(CURVE_BTC_PLUS);
        await curveBTCPlusProxy.upgradeTo(curveBTCPlusImpl.address, {from: accounts[1]});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`curveBTC+: ${curveBTCPlusProxy.address}`);
        console.log(`curveBTC+ implementation: ${curveBTCPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
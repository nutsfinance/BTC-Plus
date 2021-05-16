const CurveBTCZap = artifacts.require("CurveBTCZap");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const CURVE_BTC_ZAP = '0x6722d631072beDaB698b7bFe8095D34FF7955a78';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading curveBTCZap...');
        const curveBTCZapImpl = await CurveBTCZap.new();
        const curveBTCZapProxy = await ERC20Proxy.at(CURVE_BTC_ZAP);
        await curveBTCZapProxy.upgradeTo(curveBTCZapImpl.address, {from: accounts[1]});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`curveBTCZap: ${curveBTCZapProxy.address}`);
        console.log(`curveBTCZap implementation: ${curveBTCZapImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
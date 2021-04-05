const GaugeController = artifacts.require("GaugeController");
const GaugeControllerProxy = artifacts.require("GaugeControllerProxy");
const LiquidityGauge = artifacts.require("LiquidityGauge");
const LiquidityGaugeProxy = artifacts.require("LiquidityGaugeProxy");

const VOTING_ESCROW = '0x64d8f840446aD5b06B8A0fFAfE2F9eed05adA8B0';
const GAUGE_CONTROLLER = '0x19F8246F5eadfE0dc46E62BE5fc995Aca16efAb4';
const TOKEN = '0xd051003a60be3B2feA427448cdc085D08c6E2dcC';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();
        // const gaugeController = await GaugeController.at((await GaugeControllerProxy.deployed()).address);
        const gaugeController = await GaugeController.at(GAUGE_CONTROLLER);
        console.log('Gauge controller: ' + gaugeController.address);

        const gaugeImpl = await LiquidityGauge.new();
        // const gaugeImpl = await LiquidityGauge.at("0x4cfFc147F4E5d6227D3adBa93bBa7d8bba124bA5");
        console.log('Gauge impl: ' + gaugeImpl.address);
        // const gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        // console.log('Gauge proxy: ' + gaugeProxy.address)
        // const gauge = await LiquidityGauge.at(gaugeProxy.address);
        // await gauge.initialize(TOKEN, gaugeController.address, VOTING_ESCROW);
        // await gaugeController.addGauge(gauge.address, true, web3.utils.toWei("1.5"), web3.utils.toWei("20"));
        // console.log(`Gauge: ${gauge.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
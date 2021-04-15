const GaugeController = artifacts.require("GaugeController");
const LiquidityGauge = artifacts.require("LiquidityGauge");
const LiquidityGaugeProxy = artifacts.require("LiquidityGaugeProxy");

const VOTING_ESCROW = '0x17580529d7a21be535E05960b167c4d6c961947c';
const GAUGE_CONTROLLER = '0x19F8246F5eadfE0dc46E62BE5fc995Aca16efAb4';
const TOKEN = '0xe884E6695C4cB3c8DEFFdB213B50f5C2a1a9E0A2';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();
        // const gaugeController = await GaugeController.at((await GaugeControllerProxy.deployed()).address);
        const gaugeController = await GaugeController.at(GAUGE_CONTROLLER);
        console.log('Gauge controller: ' + gaugeController.address);

        // const gaugeImpl = await LiquidityGauge.new();
        const gaugeImpl = await LiquidityGauge.at("0xB2175E8B1432Be81a2F52835eC7ea6b740db6bE7");
        console.log('Gauge impl: ' + gaugeImpl.address);
        const gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        console.log('Gauge proxy: ' + gaugeProxy.address)
        const gauge = await LiquidityGauge.at(gaugeProxy.address);
        await gauge.initialize(TOKEN, gaugeController.address, VOTING_ESCROW);
        await gaugeController.addGauge(gauge.address, true, web3.utils.toWei("1.5"), "0");
        console.log(`Gauge: ${gauge.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
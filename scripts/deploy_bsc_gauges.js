const GaugeController = artifacts.require("GaugeController");
const GaugeControllerProxy = artifacts.require("GaugeControllerProxy");
const LiquidityGauge = artifacts.require("LiquidityGauge");
const LiquidityGaugeProxy = artifacts.require("LiquidityGaugeProxy");

const votingEscrow = '0x5b1783518FAA0298ada04d1aebaD6bc8EdB7f083';
const token = '0x8Aa8f56A255b970971414A993DB754387A09E1EB';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();
        const gaugeController = await GaugeController.at((await GaugeControllerProxy.deployed()).address);
        console.log('Gauge controller: ' + gaugeController.address);

        // const gaugeImpl = await LiquidityGauge.new();
        const gaugeImpl = await LiquidityGauge.at("0x4cfFc147F4E5d6227D3adBa93bBa7d8bba124bA5");
        console.log('Gauge impl: ' + gaugeImpl.address);
        const gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        console.log('Gauge proxy: ' + gaugeProxy.address)
        const gauge = await LiquidityGauge.at(gaugeProxy.address);
        await gauge.initialize(token, gaugeController.address, votingEscrow);
        await gaugeController.addGauge(gauge.address, false, web3.utils.toWei("1"), web3.utils.toWei("20"));
        console.log(`Gauge: ${gauge.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}


async function deployGauge(token, gaugeController) {
    
}
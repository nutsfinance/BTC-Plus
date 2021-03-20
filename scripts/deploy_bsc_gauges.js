const GaugeController = artifacts.require("GaugeController");
const GaugeControllerProxy = artifacts.require("GaugeControllerProxy");
const LiquidityGauge = artifacts.require("LiquidityGauge");
const LiquidityGaugeProxy = artifacts.require("LiquidityGaugeProxy");

const votingEscrow = '0x4eBb53744F0aE5b06F1b198f281D22e3Cf6Ab28D';
const vBTCPlus = '0x0AbfEf458cc4C4f23ebc992F2B5CcEC9ECD1869d';
const fBTCBPlus = '0xD7F984196392C7eA791F4A39e797e8dE19Ca898d';
const acsBTCBPlus = '0xf52F3E8fF896abC844BE2EbF4809Bc22123D3a57';
const autoBTCPlus = '0x33938f7f60E276a5eD0474B905E77C9708C9135A';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();
        const gaugeController = await GaugeController.at((await GaugeControllerProxy.deployed()).address);
        console.log('Gauge controller: ' + gaugeController.address);

        // const gaugeImpl = await LiquidityGauge.new();
        const gaugeImpl = await LiquidityGauge.at("0x4A71888Fdedbda7745754a7c5E5612cEe2CfFbCD");
        console.log('Gauge impl: ' + gaugeImpl.address);
        const gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        console.log('Gauge proxy: ' + gaugeProxy.address)
        const gauge = await LiquidityGauge.at(gaugeProxy.address);
        await gauge.initialize(autoBTCPlus, gaugeController.address, votingEscrow);
        await gaugeController.addGauge(gauge.address, true, web3.utils.toWei("1"), "0");
        console.log(`Gauge: ${gauge.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}


async function deployGauge(token, gaugeController) {
    
}
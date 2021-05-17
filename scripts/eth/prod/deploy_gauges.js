const GaugeController = artifacts.require("GaugeController");
const LiquidityGauge = artifacts.require("LiquidityGauge");
const LiquidityGaugeProxy = artifacts.require("LiquidityGaugeProxy");

const VOTING_ESCROW = '0x858a8553239f4ec773C9b83C5AE5e8a584dC320c';
const GAUGE_CONTROLLER = '0x610af93A398733d7eAC27a895E6e7090D6F3786e';

const SUSHI_CURVEBTCPLUS_WBTC = "0x9a62448d05Bc4404402fC7f2F2cB16d32A503C5c";

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();
        const gaugeController = await GaugeController.at(GAUGE_CONTROLLER);
        console.log('Gauge controller: ' + gaugeController.address);

        const gaugeImpl = await LiquidityGauge.new();
        console.log('Gauge impl: ' + gaugeImpl.address);

        let gaugeProxy, gauge;

        console.log('Deploying liquidity gauge for Sushi CurveBTC+/WBTC...');
        gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        gauge = await LiquidityGauge.at(gaugeProxy.address);
        await gauge.initialize(SUSHI_CURVEBTCPLUS_WBTC, GAUGE_CONTROLLER, VOTING_ESCROW);
        await gaugeController.addGauge(gauge.address, false, "0", "0");
        console.log(`Sushi CurveBTC+/WBTC Gauge: ${gauge.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
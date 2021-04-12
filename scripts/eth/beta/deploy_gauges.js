const GaugeController = artifacts.require("GaugeController");
const LiquidityGauge = artifacts.require("LiquidityGauge");
const LiquidityGaugeProxy = artifacts.require("LiquidityGaugeProxy");

const VOTING_ESCROW = '0xF954b389c7C47623841Ce06C84cb90BF7EEBFa32';
const GAUGE_CONTROLLER = '0x34079387Fb9708131c27a3D104e43bd5e109275E';

const RENCRV_PLUS = "0xF26d963a0420F285cBa59dC6C0a65e34E55C8396";
const SBTCCRV_PLUS = "0xE7D839c303C4C8d0B0094019663D2111A689F531";

const ACBTC_PLUS = "0x0CE9884B5d395655f5DB697598fD95D0Dc19e776";
const AWBTC_PLUS = "0xCb52eC77e3d9b5b46758ccab2877F0344a4281dA";
const CWBTC_PLUS = "0x60af76465c372768b72e0Fc9b43c61780Bd54163";

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();
        const gaugeController = await GaugeController.at(GAUGE_CONTROLLER);
        console.log('Gauge controller: ' + gaugeController.address);

        const gaugeImpl = await LiquidityGauge.new();
        // const gaugeImpl = await LiquidityGauge.at("0xeFd2cDfB1017899d32F157Ff238C6A94d47B1745");
        console.log('Gauge impl: ' + gaugeImpl.address);

        let gaugeProxy, gauge;

        // console.log('Deploying liquidity gauge for renCrv+...');
        // gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        // gauge = await LiquidityGauge.at(gaugeProxy.address);
        // await gauge.initialize(RENCRV_PLUS, GAUGE_CONTROLLER, VOTING_ESCROW);
        // await gaugeController.addGauge(gauge.address, true, web3.utils.toWei("1"), "0");
        // console.log(`renCrv+ Gauge: ${gauge.address}`);

        // console.log('Deploying liquidity gauge for sbtcCrv+...');
        // gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        // gauge = await LiquidityGauge.at(gaugeProxy.address);
        // await gauge.initialize(SBTCCRV_PLUS, GAUGE_CONTROLLER, VOTING_ESCROW);
        // await gaugeController.addGauge(gauge.address, true, web3.utils.toWei("1"), "0");
        // console.log(`sbtcCrv+ Gauge: ${gauge.address}`);

        console.log('Deploying liquidity gauge for acBTC+...');
        gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        gauge = await LiquidityGauge.at(gaugeProxy.address);
        await gauge.initialize(ACBTC_PLUS, GAUGE_CONTROLLER, VOTING_ESCROW);
        await gaugeController.addGauge(gauge.address, true, web3.utils.toWei("1"), "0");
        console.log(`acBTC+ Gauge: ${gauge.address}`);

        console.log('Deploying liquidity gauge for aWBTC+...');
        gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        gauge = await LiquidityGauge.at(gaugeProxy.address);
        await gauge.initialize(AWBTC_PLUS, GAUGE_CONTROLLER, VOTING_ESCROW);
        await gaugeController.addGauge(gauge.address, true, web3.utils.toWei("1"), "0");
        console.log(`aWBTC+ Gauge: ${gauge.address}`);

        console.log('Deploying liquidity gauge for cWBTC+...');
        gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        gauge = await LiquidityGauge.at(gaugeProxy.address);
        await gauge.initialize(CWBTC_PLUS, GAUGE_CONTROLLER, VOTING_ESCROW);
        await gaugeController.addGauge(gauge.address, true, web3.utils.toWei("1"), "0");
        console.log(`cWBTC+ Gauge: ${gauge.address}`);

        // console.log('Deploying liquidity gauge for DODO-AC-BUSD...');
        // gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        // gauge = await LiquidityGauge.at(gaugeProxy.address);
        // await gauge.initialize(DODO_AC_BUSD, GAUGE_CONTROLLER, VOTING_ESCROW);
        // await gaugeController.addGauge(gauge.address, false, "0", "0");
        // console.log(`DODO-AC-BUSD Gauge: ${gauge.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
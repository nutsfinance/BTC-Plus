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
const VWBTC_PLUS = "0x7ea60fED61f3b242b2012d92bCab5451e10F04f6";
const UNI_AC_ETH = "0xF2c6706af78d15549c9376d04E40957A3B357de4";
const BRENCRV_PLUS = "0x87BAA3E048528d21302Fb15acd09a4e5cB5098cB";

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();
        const gaugeController = await GaugeController.at(GAUGE_CONTROLLER);
        console.log('Gauge controller: ' + gaugeController.address);

        // const gaugeImpl = await LiquidityGauge.new();
        const gaugeImpl = await LiquidityGauge.at("0x54229ea287571F10149a02416be41c6023fb86DB");
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

        // console.log('Deploying liquidity gauge for acBTC+...');
        // gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        // gauge = await LiquidityGauge.at(gaugeProxy.address);
        // await gauge.initialize(ACBTC_PLUS, GAUGE_CONTROLLER, VOTING_ESCROW);
        // await gaugeController.addGauge(gauge.address, true, web3.utils.toWei("1"), "0");
        // console.log(`acBTC+ Gauge: ${gauge.address}`);

        // console.log('Deploying liquidity gauge for aWBTC+...');
        // gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        // gauge = await LiquidityGauge.at(gaugeProxy.address);
        // await gauge.initialize(AWBTC_PLUS, GAUGE_CONTROLLER, VOTING_ESCROW);
        // await gaugeController.addGauge(gauge.address, true, web3.utils.toWei("1"), "0");
        // console.log(`aWBTC+ Gauge: ${gauge.address}`);

        // console.log('Deploying liquidity gauge for cWBTC+...');
        // gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        // gauge = await LiquidityGauge.at(gaugeProxy.address);
        // await gauge.initialize(CWBTC_PLUS, GAUGE_CONTROLLER, VOTING_ESCROW);
        // await gaugeController.addGauge(gauge.address, true, web3.utils.toWei("1"), "0");
        // console.log(`cWBTC+ Gauge: ${gauge.address}`);

        // console.log('Deploying liquidity gauge for vWBTC+...');
        // gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        // gauge = await LiquidityGauge.at(gaugeProxy.address);
        // await gauge.initialize(VWBTC_PLUS, GAUGE_CONTROLLER, VOTING_ESCROW);
        // await gaugeController.addGauge(gauge.address, true, web3.utils.toWei("1"), "0");
        // console.log(`cWBTC+ Gauge: ${gauge.address}`);

        // console.log('Deploying liquidity gauge for UNI-AC-ETH...');
        // gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        // gauge = await LiquidityGauge.at(gaugeProxy.address);
        // await gauge.initialize(UNI_AC_ETH, GAUGE_CONTROLLER, VOTING_ESCROW);
        // await gaugeController.addGauge(gauge.address, false, "0", "0");
        // console.log(`UNI-AC-ETh Gauge: ${gauge.address}`);

        console.log('Deploying liquidity gauge for brenCrv+...');
        // gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        // gauge = await LiquidityGauge.at(gaugeProxy.address);
        gauge = await LiquidityGauge.at("0x43679D865F3c090e908273dbbB04Cd552a575934");
        await gauge.initialize(BRENCRV_PLUS, GAUGE_CONTROLLER, VOTING_ESCROW);
        await gaugeController.addGauge(gauge.address, true, web3.utils.toWei("1"), "0");
        console.log(`brenCrv+ Gauge: ${gauge.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
const GaugeController = artifacts.require("GaugeController");
const LiquidityGauge = artifacts.require("LiquidityGauge");
const LiquidityGaugeProxy = artifacts.require("LiquidityGaugeProxy");

const VOTING_ESCROW = '0xd8103E3203E40D1b6F01E9d5db55256f610FB68F';
const GAUGE_CONTROLLER = '0xc7cAF20bD0C16CCBA7673b0848C4B503325256A4';

const VBTC_PLUS = "0xcf8D1D3Fce7C2138F85889068e50F0e7a18b5321";
const FBTCB_PLUS = "0x73FddFb941c11d16C827169Bb94aCC227841C396";
const ACSBTCB_PLUS = "0xD7806143A4206aa9A816b964e4c994F533b830b0";
const AUTOBTC_PLUS = "0x02827D495B2bBe37e1C021eB91BCdCc92cD3b604";
const ACBTC_BSC_PLUS = "0xd051003a60be3B2feA427448cdc085D08c6E2dcC";
const DODO_AC_BUSD = "0x8Aa8f56A255b970971414A993DB754387A09E1EB";
const AUTOBTC_V2_PLUS = "0x7780b26aB2586Ad0e0192CafAAE93BfA09a106F3";
const BTCB_PLUS = "0xe884E6695C4cB3c8DEFFdB213B50f5C2a1a9E0A2";
const PANCAKE_AC_BNB = "0x9e9877f2e46a7B74af77429afD7Ce08512179946";
const PANCAKE_BTCB_PLUS_BTCB = '0x3e51Ed4038E0dFbF79A19EBc30b91477Bc357A1A';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();
        const gaugeController = await GaugeController.at(GAUGE_CONTROLLER);
        console.log('Gauge controller: ' + gaugeController.address);

        const gaugeImpl = await LiquidityGauge.new();
        console.log('Gauge impl: ' + gaugeImpl.address);

        let gaugeProxy, gauge;

        // console.log('Deploying liquidity gauge for vBTC+...');
        // gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        // gauge = await LiquidityGauge.at(gaugeProxy.address);
        // await gauge.initialize(VBTC_PLUS, GAUGE_CONTROLLER, VOTING_ESCROW);
        // await gaugeController.addGauge(gauge.address, true, web3.utils.toWei("1"), "0");
        // console.log(`vBTC+ Gauge: ${gauge.address}`);

        // console.log('Deploying liquidity gauge for fBTCB+...');
        // gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        // gauge = await LiquidityGauge.at(gaugeProxy.address);
        // await gauge.initialize(FBTCB_PLUS, GAUGE_CONTROLLER, VOTING_ESCROW);
        // await gaugeController.addGauge(gauge.address, true, web3.utils.toWei("1"), "0");
        // console.log(`fBTCB+ Gauge: ${gauge.address}`);

        // console.log('Deploying liquidity gauge for acsBTCB+...');
        // gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        // gauge = await LiquidityGauge.at(gaugeProxy.address);
        // await gauge.initialize(ACSBTCB_PLUS, GAUGE_CONTROLLER, VOTING_ESCROW);
        // await gaugeController.addGauge(gauge.address, true, web3.utils.toWei("1"), "0");
        // console.log(`acsBTCB+ Gauge: ${gauge.address}`);

        // console.log('Deploying liquidity gauge for autoBTC+...');
        // gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        // gauge = await LiquidityGauge.at(gaugeProxy.address);
        // await gauge.initialize(AUTOBTC_PLUS, GAUGE_CONTROLLER, VOTING_ESCROW);
        // await gaugeController.addGauge(gauge.address, true, web3.utils.toWei("1"), "0");
        // console.log(`autoBTC+ Gauge: ${gauge.address}`);

        // console.log('Deploying liquidity gauge for acBTC-BSC+...');
        // gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        // gauge = await LiquidityGauge.at(gaugeProxy.address);
        // await gauge.initialize(ACBTC_BSC_PLUS, GAUGE_CONTROLLER, VOTING_ESCROW);
        // await gaugeController.addGauge(gauge.address, true, web3.utils.toWei("1.5"), "0");
        // console.log(`acBTC-BSC+ Gauge: ${gauge.address}`);

        // console.log('Deploying liquidity gauge for DODO-AC-BUSD...');
        // gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        // gauge = await LiquidityGauge.at(gaugeProxy.address);
        // await gauge.initialize(DODO_AC_BUSD, GAUGE_CONTROLLER, VOTING_ESCROW);
        // await gaugeController.addGauge(gauge.address, false, "0", "0");
        // console.log(`DODO-AC-BUSD Gauge: ${gauge.address}`);

        // console.log('Deploying liquidity gauge for autoBTCv2+...');
        // gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        // gauge = await LiquidityGauge.at(gaugeProxy.address);
        // await gauge.initialize(AUTOBTC_V2_PLUS, GAUGE_CONTROLLER, VOTING_ESCROW);
        // await gaugeController.addGauge(gauge.address, true, web3.utils.toWei("1"), "0");
        // console.log(`autoBTCv2+ Gauge: ${gauge.address}`);

        // console.log('Deploying liquidity gauge for BTCB+...');
        // gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        // gauge = await LiquidityGauge.at(gaugeProxy.address);
        // await gauge.initialize(BTCB_PLUS, GAUGE_CONTROLLER, VOTING_ESCROW);
        // await gaugeController.addGauge(gauge.address, true, web3.utils.toWei("1.5"), "0");
        // console.log(`BTCB+ Gauge: ${gauge.address}`);

        // console.log('Deploying liquidity gauge for Pancake-AC-BNB...');
        // gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        // gauge = await LiquidityGauge.at(gaugeProxy.address);
        // await gauge.initialize(PANCAKE_AC_BNB, GAUGE_CONTROLLER, VOTING_ESCROW);
        // await gaugeController.addGauge(gauge.address, false, "0", "0");
        // console.log(`Pancake-AC-BNB Gauge: ${gauge.address}`);

        console.log('Deploying liquidity gauge for Pancake-BTCB+-BTCB...');
        gaugeProxy = await LiquidityGaugeProxy.new(gaugeImpl.address, accounts[1], Buffer.from(''));
        gauge = await LiquidityGauge.at(gaugeProxy.address);
        await gauge.initialize(PANCAKE_BTCB_PLUS_BTCB, GAUGE_CONTROLLER, VOTING_ESCROW);
        await gaugeController.addGauge(gauge.address, false, "0", "0");
        console.log(`Pancake-BTCB+-BTCB Gauge: ${gauge.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
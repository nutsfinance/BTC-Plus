const BTCPlus = artifacts.require("BTCPlus");
const PlusProxy = artifacts.require("PlusProxy");
const SinglePlus = artifacts.require("SinglePlus");
const CurveSinglePlus = artifacts.require("CurveSinglePlus");
const CompoundSinglePlus = artifacts.require("CompoundSinglePlus");
const GaugeController = artifacts.require("GaugeController");
const GaugeControllerProxy = artifacts.require("GaugeControllerProxy");
const LiquidityGauge = artifacts.require("LiquidityGauge");
const LiquidityGaugeProxy = artifacts.require("LiquidityGaugeProxy");
const VotingEscrow = artifacts.require("VotingEscrow");
const {renCrv, sbtcCrv, acBTC, cWBTC, renSwap, sbtcSwap} = require('../constant');

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();
        const btcPlus = await BTCPlus.at((await PlusProxy.deployed()).address);
        const gaugeController = await GaugeController.at((await GaugeControllerProxy.deployed()).address);
        const votingEscrow = await VotingEscrow.deployed();
        
        console.log('Deploying renCrv+...');
        const renCrvPlus = await CurveSinglePlus.new();
        const renCrvPlusProxy = await PlusProxy.new(renCrvPlus.address, accounts[1], Buffer.from(''));
        const proxiedRenCrvPlus = await CurveSinglePlus.at(renCrvPlusProxy.address);
        await proxiedRenCrvPlus.initialize(renSwap, renCrv, '', '');
        await btcPlus.addToken(proxiedRenCrvPlus.address);
        await gaugeController.addToken(proxiedRenCrvPlus.address);
        console.log(`renCrv+ address: ${proxiedRenCrvPlus.address}`);
        // const renCrvGauge = await deployGauge(proxiedRenCrvPlus.address, gaugeController, votingEscrow);
        // console.log(`renCrv+ gauge: ${renCrvGauge.address}`);

        console.log('Deploying sbtcCrv+...');
        const sbtcCrvPlus = await CurveSinglePlus.new();
        const sbtcCrvPlusProxy = await PlusProxy.new(sbtcCrvPlus.address, accounts[1], Buffer.from(''));
        const proxiedSbtcCrvPlus = await CurveSinglePlus.at(sbtcCrvPlusProxy.address);
        await proxiedSbtcCrvPlus.initialize(sbtcSwap, sbtcCrv, '', '');
        await btcPlus.addToken(proxiedSbtcCrvPlus.address);
        await gaugeController.addToken(proxiedSbtcCrvPlus.address);
        console.log(`sbtcCrv+ address: ${proxiedSbtcCrvPlus.address}`);
        // const sbtcCrvGauge = await deployGauge(proxiedSbtcCrvPlus.address, gaugeController, votingEscrow);
        // console.log(`sbtcCrv+ gauge: ${sbtcCrvGauge.address}`);

        console.log('Deploying acBTC+...');
        const acBtcPlus = await SinglePlus.new();
        const acBtcPlusProxy = await PlusProxy.new(acBtcPlus.address, accounts[1], Buffer.from(''));
        const proxiedAcBtcPlus = await SinglePlus.at(acBtcPlusProxy.address);
        await proxiedAcBtcPlus.initialize(acBTC, '', '');
        await btcPlus.addToken(proxiedAcBtcPlus.address);
        await gaugeController.addToken(proxiedAcBtcPlus.address);
        console.log(`acBTC++ address: ${proxiedAcBtcPlus.address}`);
        // const acBtcGauge = await deployGauge(proxiedAcBtcPlus.address, gaugeController, votingEscrow);
        // console.log(`acBtc+ gauge: ${acBtcGauge.address}`);

        console.log('Deploying cWBTC+...');
        const cWBTCPlus = await CompoundSinglePlus.new();
        const cWBTCPlusProxy = await PlusProxy.new(cWBTCPlus.address, accounts[1], Buffer.from(''));
        const proxiedCWBTCPlus = await CompoundSinglePlus.at(cWBTCPlusProxy.address);
        await proxiedCWBTCPlus.initialize(cWBTC, '', '');
        await btcPlus.addToken(proxiedCWBTCPlus.address);
        await gaugeController.addToken(proxiedCWBTCPlus.address);
        console.log(`cWBTC++ address: ${proxiedCWBTCPlus.address}`);
        // const cWBTCGauge = await deployGauge(proxiedCWBTCPlus.address, gaugeController, votingEscrow);
        // console.log(`cWBTC+ gauge: ${cWBTCGauge.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}


async function deployGauge(token, gaugeController, votingEscrow) {
    const accounts = await web3.eth.getAccounts();
    const gauge = await LiquidityGauge.new();
    const gaugeProxy = await LiquidityGaugeProxy.new(gauge.address, accounts[1], Buffer.from(''));
    const proxiedGauge = await LiquidityGauge.at(gaugeProxy.address);
    await proxiedGauge.initialize(token, gaugeController.address, votingEscrow.address);
    await gaugeController.addGauge(proxiedGauge.address, web3.utils.toWei("1"));

    return proxiedGauge;
}
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
const {renCrv, sbtcCrv, acBTC, cWBTC, obtcCrv, renSwap, sbtcSwap, obtcSwap} = require('../constant');

const renCrvPlus = '0x59A76E80DbB2b7EbC61e0a52c7C7771C443ADfcF';
const sbtcCrvPlus = '0x91BeBB99F9aC1b54905000D057b02B0165f674A2';
const acBtcPlus = '0xaAB27180b6f39502CD716A02EA21283B81FC0bae';
const cWbtcPlus = '0x674FB8CBD83C5555BcCB36e46231B8788F14c120';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();
        const btcPlus = await BTCPlus.at((await PlusProxy.deployed()).address);
        const gaugeController = await GaugeController.at((await GaugeControllerProxy.deployed()).address);
        const votingEscrow = await VotingEscrow.deployed();
        console.log(`Voting escrow: ${votingEscrow.address}`);
        console.log(`Gauge controller: ${gaugeController.address}`);
        
        // console.log('Deploying renCrv+...');
        // const renCrvPlus = await CurveSinglePlus.new();
        // const renCrvPlusProxy = await PlusProxy.new(renCrvPlus.address, accounts[1], Buffer.from(''));
        // const proxiedRenCrvPlus = await CurveSinglePlus.at(renCrvPlusProxy.address);
        // await proxiedRenCrvPlus.initialize(renSwap, renCrv, '', '');
        // await btcPlus.addToken(proxiedRenCrvPlus.address);
        // console.log(`renCrv+ address: ${proxiedRenCrvPlus.address}`);
        // const renCrvGauge = await deployGauge(proxiedRenCrvPlus.address, gaugeController, votingEscrow);

        // const renCrvGauge = await deployGauge(renCrvPlus, gaugeController, votingEscrow);
        // console.log(`renCrv+ gauge: ${renCrvGauge.address}`);

        // console.log('Deploying sbtcCrv+...');
        // const sbtcCrvPlus = await CurveSinglePlus.new();
        // const sbtcCrvPlusProxy = await PlusProxy.new(sbtcCrvPlus.address, accounts[1], Buffer.from(''));
        // const proxiedSbtcCrvPlus = await CurveSinglePlus.at(sbtcCrvPlusProxy.address);
        // await proxiedSbtcCrvPlus.initialize(sbtcSwap, sbtcCrv, '', '');
        // await btcPlus.addToken(proxiedSbtcCrvPlus.address);
        // console.log(`sbtcCrv+ address: ${proxiedSbtcCrvPlus.address}`);
        // const sbtcCrvGauge = await deployGauge(proxiedSbtcCrvPlus.address, gaugeController, votingEscrow);

        // const sbtcCrvGauge = await deployGauge(sbtcCrvPlus, gaugeController, votingEscrow);
        // console.log(`sbtcCrv+ gauge: ${sbtcCrvGauge.address}`);

        // console.log('Deploying acBTC+...');
        // const acBtcPlus = await SinglePlus.new();
        // const acBtcPlusProxy = await PlusProxy.new(acBtcPlus.address, accounts[1], Buffer.from(''));
        // const proxiedAcBtcPlus = await SinglePlus.at(acBtcPlusProxy.address);
        // await proxiedAcBtcPlus.initialize(acBTC, '', '');
        // await btcPlus.addToken(proxiedAcBtcPlus.address);
        // console.log(`acBTC++ address: ${proxiedAcBtcPlus.address}`);
        // const acBtcGauge = await deployGauge(proxiedAcBtcPlus.address, gaugeController, votingEscrow);

        // const acBtcGauge = await deployGauge(acBtcPlus, gaugeController, votingEscrow);
        // console.log(`acBtc+ gauge: ${acBtcGauge.address}`);

        // console.log('Deploying cWBTC+...');
        // const cWBTCPlus = await CompoundSinglePlus.new();
        // const cWBTCPlusProxy = await PlusProxy.new(cWBTCPlus.address, accounts[1], Buffer.from(''));
        // const proxiedCWBTCPlus = await CompoundSinglePlus.at(cWBTCPlusProxy.address);
        // await proxiedCWBTCPlus.initialize(cWBTC, '', '');
        // await btcPlus.addToken(proxiedCWBTCPlus.address);
        // console.log(`cWBTC++ address: ${proxiedCWBTCPlus.address}`);
        // const cWBTCGauge = await deployGauge(proxiedCWBTCPlus.address, gaugeController, votingEscrow);

        // const cWBTCGauge = await deployGauge(cWbtcPlus, gaugeController, votingEscrow);
        // console.log(`cWBTC+ gauge: ${cWBTCGauge.address}`);

        console.log('Deploying obtcCrv+...');
        const obtcCrvPlus = await CurveSinglePlus.new();
        const obtcCrvPlusProxy = await PlusProxy.new(obtcCrvPlus.address, accounts[1], Buffer.from(''));
        const proxiedObtcCrvPlus = await CurveSinglePlus.at(obtcCrvPlusProxy.address);
        await proxiedObtcCrvPlus.initialize(obtcSwap, obtcCrv, '', '');
        await btcPlus.addToken(proxiedObtcCrvPlus.address);
        console.log(`obtcCrv+ address: ${proxiedObtcCrvPlus.address}`);
        const obtcCrvGauge = await deployGauge(proxiedObtcCrvPlus.address, gaugeController, votingEscrow);
        console.log(`obtcCrv+ gauge: ${obtcCrvGauge.address}`);

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
    await gaugeController.addGauge(proxiedGauge.address, true, web3.utils.toWei("1"), "0");

    return proxiedGauge;
}
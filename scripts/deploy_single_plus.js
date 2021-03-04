const BTCPlus = artifacts.require("BTCPlus");
const PlusProxy = artifacts.require("PlusProxy");
const SinglePlus = artifacts.require("SinglePlus");
const CurveSinglePlus = artifacts.require("CurveSinglePlus");
const GaugeController = artifacts.require("GaugeController");
const GaugeControllerProxy = artifacts.require("GaugeControllerProxy");
const {renCrv, sbtcCrv, acBTC, cWBTC} = require('../constant');

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();
        const btcPlus = await BtcPlus.at(await PlusProxy.deployed());
        const gaugeController = await GaugeController.at(await GaugeControllerProxy.deployed());
        
        console.log('Deploying renCrv+');
        const renCrvPlus = await CurveSinglePlus.new();
        const renCrvPlusProxy = await PlusProxy.new(renCrvPlus.address, accounts[1], Buffer.from(''));
        

        callback();
    } catch (e) {
        callback(e);
    }
}

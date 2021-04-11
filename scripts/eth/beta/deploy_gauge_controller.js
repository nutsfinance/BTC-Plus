const GaugeController = artifacts.require("GaugeController");
const GaugeControllerProxy = artifacts.require("GaugeControllerProxy");

const AC = '0xe4F6C1649CaDFb43b28049917cfb1b4a2B762060';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        const gaugeControllerImpl = await GaugeController.new();
        const gaugeControllerProxy = await GaugeControllerProxy.new(gaugeControllerImpl.address, accounts[1], Buffer.from(''));
        const gaugeController = await GaugeController.at(gaugeControllerProxy.address);
        await gaugeController.initialize(AC, web3.utils.toWei('3000'));

        console.log(`Gauge controller: ${gaugeController.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
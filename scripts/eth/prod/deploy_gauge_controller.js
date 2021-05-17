const GaugeController = artifacts.require("GaugeController");
const GaugeControllerProxy = artifacts.require("GaugeControllerProxy");

const AC = '0x9A0aBA393aac4dFbFf4333B06c407458002C6183';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        const gaugeControllerImpl = await GaugeController.new();
        const gaugeControllerProxy = await GaugeControllerProxy.new(gaugeControllerImpl.address, accounts[1], Buffer.from(''));
        const gaugeController = await GaugeController.at(gaugeControllerProxy.address);
        await gaugeController.initialize(AC, web3.utils.toWei('3000'));

        console.log(`Gauge controller: ${gaugeController.address}`);
        console.log(`Gauge controller implementation: ${gaugeControllerImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
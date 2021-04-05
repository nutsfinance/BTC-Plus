const GaugeController = artifacts.require("GaugeController");
const GaugeControllerProxy = artifacts.require("GaugeControllerProxy");

const CONTROLLER = "0x19F8246F5eadfE0dc46E62BE5fc995Aca16efAb4";

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        const controller = await GaugeControllerProxy.at(CONTROLLER);
        const controllerImpl = await GaugeController.new();
        console.log('Controller impl: ' + controllerImpl.address);

        await controller.upgradeTo(controllerImpl.address, {from: accounts[1]});

        callback();
    } catch (e) {
        callback(e);
    }
}

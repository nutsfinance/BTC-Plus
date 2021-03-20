const GaugeController = artifacts.require("GaugeController");
const GaugeControllerProxy = artifacts.require("GaugeControllerProxy");
const constant = require('../constant');

const deployGaugeController = async (deployer, network, accounts) => {
    const gaugeControllerImpl = await deployer.deploy(GaugeController);
    const gaugeControllerProxy = await deployer.deploy(GaugeControllerProxy, gaugeControllerImpl.address, accounts[1], Buffer.from(''));
    const gaugeController = await GaugeController.at(gaugeControllerProxy.address);
    await gaugeController.initialize(constant[network].AC, web3.utils.toWei('5000'));

    console.log(`Gauge controller: ${gaugeController.address}`);
}

module.exports = function (deployer, network, accounts) {
    deployer
        .then(() => deployGaugeController(deployer, network, accounts))
        .catch(error => {
            console.log(error);
            process.exit(1);
        });
};

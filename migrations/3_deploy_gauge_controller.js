const GaugeController = artifacts.require("GaugeController");
const GaugeControllerProxy = artifacts.require("GaugeControllerProxy");
const MockACoconut = artifacts.require("MockACoconut");
const constants = require('../constant');

const deployGaugeController = async (deployer, network, accounts) => {
    let ac;
    if (network === 'development') {
        ac = (await MockACoconut.deployed()).address;
        console.log(`AC: ${ac}`);
    } else {
        ac = constants[network].AC;
    }
    const gaugeControllerImpl = await deployer.deploy(GaugeController);
    const gaugeControllerProxy = await deployer.deploy(GaugeControllerProxy, gaugeControllerImpl.address, accounts[1], Buffer.from(''));
    const gaugeController = await GaugeController.at(gaugeControllerProxy.address);
    await gaugeController.initialize(ac, web3.utils.toWei('3000'));

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
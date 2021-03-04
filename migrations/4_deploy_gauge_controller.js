const GaugeController = artifacts.require("GaugeController");
const AdminUpgradeabilityProxy = artifacts.require("AdminUpgradeabilityProxy");
const {AC} = require('../constant');

const deployGaugeController = async (deployer, accounts) => {
    const gaugeController = await deployer.deploy(GaugeController);
    const gaugeControllerProxy = await deployer.deploy(AdminUpgradeabilityProxy, gaugeController.address, accounts[1], Buffer.from(''));
    const proxiedGaugeController = await GaugeController.at(gaugeControllerProxy.address);
    await proxiedGaugeController.initialize(AC, web3.utils.toWei('5000'));
}

module.exports = function (deployer, network, accounts) {
    deployer
        .then(() => deployGaugeController(deployer, accounts))
        .catch(error => {
            console.log(error);
            process.exit(1);
        });
};

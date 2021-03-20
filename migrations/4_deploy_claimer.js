const GaugeController = artifacts.require("GaugeController");
const GaugeControllerProxy = artifacts.require("GaugeControllerProxy");
const Claimer = artifacts.require("Claimer");

const deployClaimer = async (deployer, network, accounts) => {
    const claimer = await deployer.deploy(Claimer);
    const gaugeControllerProxy = await GaugeControllerProxy.deployed();
    const gaugeController = await GaugeController.at(gaugeControllerProxy.address);

    await gaugeController.setClaimer(claimer.address, true);

    console.log(`Claimer: ${claimer.address}`);
}

module.exports = function (deployer, network, accounts) {
    deployer
        .then(() => deployClaimer(deployer, network, accounts))
        .catch(error => {
            console.log(error);
            process.exit(1);
        });
};

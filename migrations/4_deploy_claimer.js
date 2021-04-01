const GaugeController = artifacts.require("GaugeController");
const GaugeControllerProxy = artifacts.require("GaugeControllerProxy");
const VotingEscrow = artifacts.require("VotingEscrow");
const Claimer = artifacts.require("Claimer");
const constants = require('../constant');
const MockACoconut = artifacts.require("MockACoconut");

const deployClaimer = async (deployer, network, accounts) => {
    const votingEscrow = await VotingEscrow.deployed();
    let ac;
    if (network === 'development') {
        ac = (await MockACoconut.deployed()).address;
        console.log(`AC: ${ac}`);
    } else {
        ac = constants[network].AC;
    }
    const claimer = await deployer.deploy(Claimer, votingEscrow.address, ac);
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

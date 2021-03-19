const GaugeController = artifacts.require("GaugeController");
const GaugeControllerProxy = artifacts.require("GaugeControllerProxy");
const VotingEscrow = artifacts.require("VotingEscrow");
const {AC} = require('../constant');

const deployGaugeController = async (deployer, accounts) => {
    const gaugeControllerImpl = await deployer.deploy(GaugeController);
    const gaugeControllerProxy = await deployer.deploy(GaugeControllerProxy, gaugeControllerImpl.address, accounts[1], Buffer.from(''));
    const gaugeController = await GaugeController.at(gaugeControllerProxy.address);
    await gaugeController.initialize(AC, web3.utils.toWei('5000'));
    const votingEscrow = await VotingEscrow.deployed();

    console.log(`Voting escrow: ${votingEscrow.address}`);
    console.log(`Gauge controller: ${gaugeController.address}`);
}

module.exports = function (deployer, network, accounts) {
    deployer
        .then(() => deployGaugeController(deployer, accounts))
        .catch(error => {
            console.log(error);
            process.exit(1);
        });
};

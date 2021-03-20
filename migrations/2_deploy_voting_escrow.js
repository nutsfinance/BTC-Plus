const VotingEscrow = artifacts.require("VotingEscrow");
const MockACoconut = artifacts.require("MockACoconut");
const constants = require('../constant');

const deployVotingEscrow = async (deployer, network, accounts) => {
    let ac;
    if (network === 'development') {
        ac = (await deployer.deploy(MockACoconut)).address;
        console.log(`AC: ${ac}`);
    } else {
        ac = constants[network].AC;
    }
    const votingEscrow = await deployer.deploy(VotingEscrow, ac, "Voting ACoconut", "vAC", "1.0.0");

    console.log(`Voting escrow: ${votingEscrow.address}`);
}

module.exports = function (deployer, network, accounts) {
    deployer
        .then(() => deployVotingEscrow(deployer, network, accounts))
        .catch(error => {
            console.log(error);
            process.exit(1);
        });
};
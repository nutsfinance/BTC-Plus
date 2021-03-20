const VotingEscrow = artifacts.require("VotingEscrow");
const constants = require('../constant');

const deployVotingEscrow = async (deployer, network, accounts) => {
    const votingEscrow = await deployer.deploy(VotingEscrow, constants[network].AC, "Voting ACoconut", "vAC", "1.0.0");

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
const VotingEscrow = artifacts.require("VotingEscrow");
const {AC} = require('../constant');

module.exports = function (deployer) {
    deployer.deploy(VotingEscrow, AC, "Voting ACoconut", "vAC", "1.0.0");
};

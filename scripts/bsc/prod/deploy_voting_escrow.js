const VotingEscrow = artifacts.require("VotingEscrow");

const AC = '0x5b45a9be49c94236e127efcc601b7e7a1a485d0a';

module.exports = async function (callback) {
    try {
        console.log('Deploying Voting Escrow...');
        const votingEscrow = await VotingEscrow.new(AC, "Voting ACoconut", "vAC", "1.0.0");
        console.log(`Voting Escrow: ${votingEscrow.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
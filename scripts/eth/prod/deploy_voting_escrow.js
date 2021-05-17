const VotingEscrow = artifacts.require("VotingEscrow");
const VotingEscrowProxy = artifacts.require("VotingEscrowProxy");

const AC = '0x9A0aBA393aac4dFbFf4333B06c407458002C6183';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying Voting Escrow...');
        const votingEscrowImpl = await VotingEscrow.new();
        const votingEscrowProxy = await VotingEscrowProxy.new(votingEscrowImpl.address, accounts[1], Buffer.from(''));

        const votingEscrow = await VotingEscrow.at(votingEscrowProxy.address);
        await votingEscrow.initialize(AC, "Voting ACoconut", "vAC", "1.0.0");
        console.log(`Voting Escrow: ${votingEscrow.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
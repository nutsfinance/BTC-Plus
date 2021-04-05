const VotingEscrow = artifacts.require("VotingEscrow");
const VotingEscrowProxy = artifacts.require("VotingEscrowProxy");

const VOTING_ESCROW = "0xd8103E3203E40D1b6F01E9d5db55256f610FB68F";

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        const votingEscrow = await VotingEscrowProxy.at(VOTING_ESCROW);
        const votingEscrowImpl = await VotingEscrow.new();
        console.log('Voting Escrow impl: ' + votingEscrowImpl.address);

        await votingEscrow.upgradeTo(votingEscrowImpl.address, {from: accounts[1]});

        callback();
    } catch (e) {
        callback(e);
    }
}

const VotingEscrow = artifacts.require("VotingEscrow");
const VotingEscrowProxy = artifacts.require("VotingEscrowProxy");

const VOTING_ESCROW = "0x17580529d7a21be535E05960b167c4d6c961947c";

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

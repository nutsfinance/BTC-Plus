const VotingEscrow = artifacts.require("VotingEscrow");
const VotingEscrowProxy = artifacts.require("VotingEscrowProxy");

const VOTING_ESCROW = "0x19F8246F5eadfE0dc46E62BE5fc995Aca16efAb4";

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

const Claimer = artifacts.require("Claimer");

const BN = web3.utils.BN;
const toWei = web3.utils.toWei;
const MAX = new BN(2).pow(new BN(256)).sub(new BN(1));
const BTCB = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c";

const VOTING_ESCROW = '0x64d8f840446aD5b06B8A0fFAfE2F9eed05adA8B0';
const AC = '0xe9c1B8993A8750Ae65607Ef91ebCdE595DeB4EC3';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying Claimer...');
        const claimer = await Claimer.new(VOTING_ESCROW, AC);
        console.log(`Claimer: ${claimer.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
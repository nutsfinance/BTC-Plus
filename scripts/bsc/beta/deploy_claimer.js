const Claimer = artifacts.require("Claimer");
const GaugeController = artifacts.require("GaugeController");

const BN = web3.utils.BN;
const toWei = web3.utils.toWei;
const MAX = new BN(2).pow(new BN(256)).sub(new BN(1));
const BTCB = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c";

const GAUGE_CONTROLLER = '0x19F8246F5eadfE0dc46E62BE5fc995Aca16efAb4';
const VOTING_ESCROW = '0xd8103E3203E40D1b6F01E9d5db55256f610FB68F';
const AC = '0xe9c1B8993A8750Ae65607Ef91ebCdE595DeB4EC3';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying Claimer...');
        const claimer = await Claimer.new(VOTING_ESCROW, AC);
        console.log(`Claimer: ${claimer.address}`);

        const gaugeController = await GaugeController.at(GAUGE_CONTROLLER);
        await gaugeController.setClaimer(claimer.address, true);

        callback();
    } catch (e) {
        callback(e);
    }
}
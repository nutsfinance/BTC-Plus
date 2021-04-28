const Claimer = artifacts.require("Claimer");
const GaugeController = artifacts.require("GaugeController");

const GAUGE_CONTROLLER = '0x19F8246F5eadfE0dc46E62BE5fc995Aca16efAb4';
const VOTING_ESCROW = '0x17580529d7a21be535E05960b167c4d6c961947c';
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
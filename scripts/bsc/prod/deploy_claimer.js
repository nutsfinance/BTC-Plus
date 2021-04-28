const Claimer = artifacts.require("Claimer");
const GaugeController = artifacts.require("GaugeController");

const GAUGE_CONTROLLER = '0xc7cAF20bD0C16CCBA7673b0848C4B503325256A4';
const VOTING_ESCROW = '0xd8103E3203E40D1b6F01E9d5db55256f610FB68F';
const AC = '0x5b45a9be49c94236e127efcc601b7e7a1a485d0a';

module.exports = async function (callback) {
    try {
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
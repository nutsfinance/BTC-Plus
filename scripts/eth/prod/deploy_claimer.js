const Claimer = artifacts.require("Claimer");
const GaugeController = artifacts.require("GaugeController");

const GAUGE_CONTROLLER = '0x610af93A398733d7eAC27a895E6e7090D6F3786e';
const VOTING_ESCROW = '0x858a8553239f4ec773C9b83C5AE5e8a584dC320c';
const AC = '0x9A0aBA393aac4dFbFf4333B06c407458002C6183';

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
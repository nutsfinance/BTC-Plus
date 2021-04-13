const Claimer = artifacts.require("Claimer");

const VOTING_ESCROW = '0xd8103E3203E40D1b6F01E9d5db55256f610FB68F';
const AC = '0x5b45a9be49c94236e127efcc601b7e7a1a485d0a';

module.exports = async function (callback) {
    try {
        console.log('Deploying Claimer...');
        const claimer = await Claimer.new(VOTING_ESCROW, AC);
        console.log(`Claimer: ${claimer.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
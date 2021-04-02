const Claimer = artifacts.require("Claimer");

const VOTING_ESCROW = '0x2Fd25Df83fF55478697b41F21011294b8A7518FE';
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
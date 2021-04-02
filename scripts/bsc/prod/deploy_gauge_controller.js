const VotingEscrow = artifacts.require("VotingEscrow");
const GaugeController = artifacts.require("GaugeController");
const GaugeControllerProxy = artifacts.require("GaugeControllerProxy");

const VOTING_ESCROW = '0x2Fd25Df83fF55478697b41F21011294b8A7518FE';
const AC = '0x5b45a9be49c94236e127efcc601b7e7a1a485d0a';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        const gaugeControllerImpl = await GaugeController.new();
        const gaugeControllerProxy = await GaugeControllerProxy.new(gaugeControllerImpl.address, accounts[1], Buffer.from(''));
        const gaugeController = await GaugeController.at(gaugeControllerProxy.address);
        await gaugeController.initialize(AC, "0");

        console.log(`Gauge controller: ${gaugeController.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
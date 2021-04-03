const Timelock = artifacts.require("Timelock");

const BSC_MULTISIG = '0x05F4Fb3812c3F5cF605EE7Cd1A0F1491254de0FA';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying Timelock...');
        const timelock = await Timelock.new(accounts[0], 86400);
        const data = web3.eth.abi.encodeParameter('address', BSC_MULTISIG);
        const eta = Math.floor(new Date().getTime() / 1000) + 86400 + 600;
        await timelock.queueTransaction(timelock.address, 0, 'setPendingAdmin(address)', data, eta);

        console.log(`Timelock: ${timelock.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
const BTCBPlusRebalancer = artifacts.require("BTCBPlusRebalancer");
const RebalancerProxy = artifacts.require("RebalancerProxy");
const CompositePlus = artifacts.require("CompositePlus");

const BTCB_PLUS = "0xe884E6695C4cB3c8DEFFdB213B50f5C2a1a9E0A2";
const DEPLOYER = "0x2932516D9564CB799DDA2c16559caD5b8357a0D6";

const toWei = web3.utils.toWei;

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying BTCB+ rebalancer...');
        const rebalancerimpl = await BTCBPlusRebalancer.new();
        const rebalancerProxy = await RebalancerProxy.new(rebalancerimpl.address, accounts[1], Buffer.from(''));
        const rebalancer = await BTCBPlusRebalancer.at(rebalancerProxy.address);
        await rebalancer.initialize({from: DEPLOYER});

        const btcbPlus = await CompositePlus.at(BTCB_PLUS);
        await btcbPlus.setStrategist(rebalancer.address, true, {from: DEPLOYER});
        await btcbPlus.addRebalancer(rebalancer.address, {from: DEPLOYER});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`Rebalancer: ${rebalancer.address}`);
        console.log(`Rebalancer implementation: ${rebalancerimpl.address}`);

        // await rebalancer.vBTCPlusToAcsBTCBPlus(toWei("10"), {from: DEPLOYER});

        callback();
    } catch (e) {
        callback(e);
    }
}
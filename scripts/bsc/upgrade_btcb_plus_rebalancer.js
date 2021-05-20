const BTCBPlusRebalancer = artifacts.require("BTCBPlusRebalancer");
const RebalancerProxy = artifacts.require("RebalancerProxy");

const BTCB_PLUS_REBALANCER = '0x31c9ea769f7cB5cA92EA99067Fb166Ef1CE9F789';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading BTCB+ rebalancer...');
        const btcbPlusRebalancerImpl = await BTCBPlusRebalancer.new();
        const btcbPlusRebalancerProxy = await RebalancerProxy.at(BTCB_PLUS_REBALANCER);
        await btcbPlusRebalancerProxy.upgradeTo(btcbPlusRebalancerImpl.address, {from: accounts[1]});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`BTCB+ rebalancer: ${btcbPlusRebalancerProxy.address}`);
        console.log(`BTCB+ rebalancer implementation: ${btcbPlusRebalancerImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
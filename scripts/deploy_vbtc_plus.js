const CompoundSinglePlus = artifacts.require("CompoundSinglePlus");
const PlusProxy = artifacts.require("PlusProxy");
const StrategyVenusBTCVAI = artifacts.require("StrategyVenusBTCVAI");
const StrategyProxy = artifacts.require("StrategyProxy");

const VBTC = "0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B";

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying vBTC+...');
        const vBTCPlus = await CompoundSinglePlus.new();
        const vBTCPlusProxy = await PlusProxy.new(vBTCPlus.address, accounts[1], Buffer.from(''));
        const proxiedVBTCPlus = await CompoundSinglePlus.at(vBTCPlusProxy.address);
        await proxiedVBTCPlus.initialize(VBTC, '', '');

        // const proxiedVBTCPlus = await CompoundSinglePlus.at('0x219FA396aE50f789b0cE5e27D6EcbE6b36ef49d9');

        console.log('Deploying vBTC strategy...');
        const vBTCStrategy = await StrategyVenusBTCVAI.new();
        const vBTCStrategyProxy = await StrategyProxy.new(vBTCStrategy.address, accounts[1], Buffer.from(''));
        const proxiedVBTCStrategy = await StrategyVenusBTCVAI.at(vBTCStrategyProxy.address);
        await proxiedVBTCStrategy.initialize(proxiedVBTCPlus.address);

        await proxiedVBTCPlus.approveStrategy(proxiedVBTCStrategy.address , true);

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`vBTC+: ${proxiedVBTCPlus.address}`);
        console.log(`vBTC+ strategy: ${proxiedVBTCStrategy.address}`);
        console.log(`vBTC+ strategy implementation: ${vBTCStrategy.address}`)

        callback();
    } catch (e) {
        callback(e);
    }
}
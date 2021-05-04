const BadgerTBTCCrvPlus = artifacts.require("BadgerTBTCCrvPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const CONVERTER = '0xaebD996b3fd9c3b9e8B8dfF569DE17B74f3E9cd7';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying btBTCCrv+...');
        const btBTCCrvPlusImpl = await BadgerTBTCCrvPlus.new();
        const btBTCCrvPlusProxy = await ERC20Proxy.new(btBTCCrvPlusImpl.address, accounts[1], Buffer.from(''));
        const btBTCCrvPlus = await BadgerTBTCCrvPlus.at(btBTCCrvPlusProxy.address);
        await btBTCCrvPlus.initialize(CONVERTER);

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`btBTCCrv+: ${btBTCCrvPlus.address}`);
        console.log(`btBTCCrv+ implementation: ${btBTCCrvPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
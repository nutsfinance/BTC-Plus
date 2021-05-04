const BadgerSBTCCrvPlus = artifacts.require("BadgerSBTCCrvPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const CONVERTER = '0xaebD996b3fd9c3b9e8B8dfF569DE17B74f3E9cd7';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying bsBTCCrv+...');
        const bsBTCCrvPlusImpl = await BadgerSBTCCrvPlus.new();
        const bsBTCCrvPlusProxy = await ERC20Proxy.new(bsBTCCrvPlusImpl.address, accounts[1], Buffer.from(''));
        const bsBTCCrvPlus = await BadgerSBTCCrvPlus.at(bsBTCCrvPlusProxy.address);
        await bsBTCCrvPlus.initialize(CONVERTER);

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`bsBTCCrv+: ${bsBTCCrvPlus.address}`);
        console.log(`bsBTCCrv+ implementation: ${bsBTCCrvPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
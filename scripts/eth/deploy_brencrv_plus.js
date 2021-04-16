const BadgerRenCrvPlus = artifacts.require("BadgerRenCrvPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const CONVERTER = '0xaebD996b3fd9c3b9e8B8dfF569DE17B74f3E9cd7';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying brenCrv+...');
        const brenCrvPlusImpl = await BadgerRenCrvPlus.new();
        const brenCrvPlusProxy = await ERC20Proxy.new(brenCrvPlusImpl.address, accounts[1], Buffer.from(''));
        const brenCrvPlus = await BadgerRenCrvPlus.at(brenCrvPlusProxy.address);
        await brenCrvPlus.initialize(CONVERTER);

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`brenCrv+: ${brenCrvPlus.address}`);
        console.log(`brenCrv+ implementation: ${brenCrvPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
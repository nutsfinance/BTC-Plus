const BadgerHrenCrvPlus = artifacts.require("BadgerHrenCrvPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const CONVERTER = '0xaebD996b3fd9c3b9e8B8dfF569DE17B74f3E9cd7';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying bhrenCrv+...');
        const bhrenCrvPlusImpl = await BadgerHrenCrvPlus.new();
        const bhrenCrvPlusProxy = await ERC20Proxy.new(bhrenCrvPlusImpl.address, accounts[1], Buffer.from(''));
        const bhrenCrvPlus = await BadgerHrenCrvPlus.at(bhrenCrvPlusProxy.address);
        await bhrenCrvPlus.initialize(CONVERTER);

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`bhrenCrv+: ${bhrenCrvPlus.address}`);
        console.log(`bhrenCrv+ implementation: ${bhrenCrvPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
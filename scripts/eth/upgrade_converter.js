const Converter = artifacts.require("Converter");
const ConverterProxy = artifacts.require("ConverterProxy");

const CONVERTER = '0xaebD996b3fd9c3b9e8B8dfF569DE17B74f3E9cd7';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading converter...');
        const converterImpl = await Converter.new();
        const converterProxy = await ConverterProxy.at(CONVERTER);
        await converterProxy.upgradeTo(converterImpl.address, {from: accounts[1]});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`Converter: ${converterProxy.address}`);
        console.log(`Converter implementation: ${converterImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
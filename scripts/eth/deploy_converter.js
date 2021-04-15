const Converter = artifacts.require("Converter");
const ConverterProxy = artifacts.require("ConverterProxy");

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying converter+...');
        const converterImpl = await Converter.new();
        const converterProxy = await ConverterProxy.new(converterImpl.address, accounts[1], Buffer.from(''));
        const converter = await Converter.at(converterProxy.address);
        await converter.initialize();

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`Converter: ${converter.address}`);
        console.log(`Converter implementation: ${converterImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
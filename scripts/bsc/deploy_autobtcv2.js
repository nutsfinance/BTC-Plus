const AutoBTCv2 = artifacts.require("AutoBTCv2");
const ERC20Proxy = artifacts.require("ERC20Proxy");

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying autoBTCv2...');
        const autoBTCV2Impl = await AutoBTCv2.new();
        const autoBTCV2Proxy = await ERC20Proxy.new(autoBTCV2Impl.address, accounts[1], Buffer.from(''));
        const autoBTCV2 = await AutoBTCv2.at(autoBTCV2Proxy.address);
        await autoBTCV2.initialize();

        console.log(`autoBTCv2 implementation: ${autoBTCV2Impl.address}`);
        console.log(`autoBTCv2: ${autoBTCV2.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
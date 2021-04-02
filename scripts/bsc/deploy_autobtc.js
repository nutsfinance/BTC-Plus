const AutoBTC = artifacts.require("AutoBTC");
const AutoBTCPlus = artifacts.require("AutoBTCPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const BN = web3.utils.BN;
const toWei = web3.utils.toWei;
const MAX = new BN(2).pow(new BN(256)).sub(new BN(1));
const BTCB = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c";

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying autoBTC...');
        const autoBTCImpl = await AutoBTC.new();
        // const autoBTCProxy = await ERC20Proxy.new(autoBTCImpl.address, accounts[1], Buffer.from(''));
        // const autoBTC = await AutoBTC.at(autoBTCProxy.address);
        // await autoBTC.initialize();

        const autoBTCProxy = await ERC20Proxy.at("0x6B7Ea9F1EF1E6c662761201998Dc876b88Ed7414");
        await autoBTCProxy.upgradeTo(autoBTCImpl.address, {from: accounts[1]});

        console.log(`autoBTC implementation: ${autoBTCImpl.address}`);
        // console.log(`autoBTC: ${autoBTC.address}`);

        // const btcb = await ERC20Upgradeable.at(BTCB);
        // const autoBTC = await AutoBTC.at("0x54fA94FD0F8231863930C7dbf612077f378F03fB");

        // console.log(`autoBTC: ${autoBTC.address}`);
        // await btcb.approve(autoBTC.address, toWei("0.003"), {from: DEPLOYER});
        // await autoBTC.mint(toWei("0.003"), {from: DEPLOYER});

        callback();
    } catch (e) {
        callback(e);
    }
}
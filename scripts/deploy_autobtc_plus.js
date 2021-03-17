const AutoBTCPlus = artifacts.require("AutoBTCPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const AUTOBTC = '0x54fA94FD0F8231863930C7dbf612077f378F03fB';
const BN = web3.utils.BN;
const MAX = new BN(2).pow(new BN(256)).sub(new BN(1));
const toWei = web3.utils.toWei;

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying autoBTC+...');
        const autoBTCPlusImpl = await AutoBTCPlus.new();
        const autoBTCPlusProxy = await ERC20Proxy.new(autoBTCPlusImpl.address, accounts[1], Buffer.from(''));
        const autoBTCPlus = await AutoBTCPlus.at(autoBTCPlusProxy.address);
        await autoBTCPlus.initialize();

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`autoBTC+: ${autoBTCPlus.address}`);
        console.log(`autoBTC+ implementation: ${autoBTCPlusImpl.address}`);

        const autoBTC = await ERC20Upgradeable.at(AUTOBTC);
        // const vBTCPlus = await VenusBTCPlus.at("0x0AbfEf458cc4C4f23ebc992F2B5CcEC9ECD1869d");

        console.log('Total supply prev: ', (await autoBTCPlus.totalSupply()).toString());
        console.log('autoBTC+ balance prev: ', (await autoBTCPlus.balanceOf(accounts[0])).toString());
        console.log('autoBTC balance prev: ', (await autoBTC.balanceOf(accounts[0])).toString());

        await autoBTC.approve(autoBTCPlus.address, toWei("0.001"));
        await autoBTCPlus.mint(toWei("0.001"));

        // await vBTCPlus.mint("1000000");
        // await vBTCPlus.invest();
        // await vBTCPlus.redeem(MAX);
        // await vBTCPlus.harvest();

        console.log('Total supply after:', (await autoBTCPlus.totalSupply()).toString());
        console.log('autoBTC+ balance after: ', (await autoBTCPlus.balanceOf(accounts[0])).toString());
        console.log('autoBTC balance after: ', (await autoBTC.balanceOf(accounts[0])).toString());

        callback();
    } catch (e) {
        callback(e);
    }
}
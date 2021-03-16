const VenusBTCPlus = artifacts.require("VenusBTCPlus");
const PlusProxy = artifacts.require("PlusProxy");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const VBTC = '0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B';
const BN = web3.utils.BN;
const MAX = new BN(2).pow(new BN(256)).sub(new BN(1));

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        // console.log('Deploying vBTC+...');
        // const vBTCPlusImpl = await VenusBTCPlus.new();
        // const vBTCPlusProxy = await PlusProxy.new(vBTCPlusImpl.address, accounts[1], Buffer.from(''));
        // const vBTCPlus = await VenusBTCPlus.at(vBTCPlusProxy.address);
        // await vBTCPlus.initialize();

        // console.log(`Proxy admin: ${accounts[1]}`);
        // console.log(`vBTC+: ${vBTCPlus.address}`);
        // console.log(`vBTC+ implementation: ${vBTCPlusImpl.address}`);

        const vBTC = await ERC20Upgradeable.at(VBTC);
        const vBTCPlus = await VenusBTCPlus.at("0x0AbfEf458cc4C4f23ebc992F2B5CcEC9ECD1869d");

        console.log('Total supply prev: ', (await vBTCPlus.totalSupply()).toString());
        console.log('vBTC+ balance prev: ', (await vBTCPlus.balanceOf(accounts[0])).toString());
        console.log('vBTC balance prev: ', (await vBTC.balanceOf(accounts[0])).toString());

        // await vBTCPlus.mint("1000000");
        // await vBTCPlus.invest();
        // await vBTCPlus.redeem(MAX);
        await vBTCPlus.harvest();

        console.log('Total supply after:', (await vBTCPlus.totalSupply()).toString());
        console.log('vBTC+ balance after: ', (await vBTCPlus.balanceOf(accounts[0])).toString());
        console.log('vBTC balance after: ', (await vBTC.balanceOf(accounts[0])).toString());

        callback();
    } catch (e) {
        callback(e);
    }
}
const ACryptoSBTCBPlus = artifacts.require("ACryptoSBTCBPlus");
const PlusProxy = artifacts.require("PlusProxy");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const ACS_BTCB = '0x0395fCC8E1a1E30A1427D4079aF6E23c805E3eeF';
const BN = web3.utils.BN;
const MAX = new BN(2).pow(new BN(256)).sub(new BN(1));

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying acsBTCB+...');
        const acsBTCBPlusImpl = await ACryptoSBTCBPlus.new();
        // const acsBTCBPlusProxy = await PlusProxy.new(acsBTCBPlusImpl.address, accounts[1], Buffer.from(''));
        // const acsBTCBPlus = await ACryptoSBTCBPlus.at(acsBTCBPlusProxy.address);
        // await acsBTCBPlus.initialize();

        const acsBTCBPlusProxy = await PlusProxy.at("0xf52F3E8fF896abC844BE2EbF4809Bc22123D3a57");
        await acsBTCBPlusProxy.upgradeTo(acsBTCBPlusImpl.address, {from: accounts[1]});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`acsBTCB+: ${acsBTCBPlusProxy.address}`);
        console.log(`acsBTCB+ implementation: ${acsBTCBPlusImpl.address}`);

        const acsBTCBPlus = await ACryptoSBTCBPlus.at("0xf52F3E8fF896abC844BE2EbF4809Bc22123D3a57");
        const acsBTCB = await ERC20Upgradeable.at(ACS_BTCB);

        console.log('Total supply prev: ', (await acsBTCBPlus.totalSupply()).toString());
        console.log('acsBTCB+ balance prev: ', (await acsBTCBPlus.balanceOf(accounts[0])).toString());
        console.log('acsBTCB balance prev: ', (await acsBTCB.balanceOf(accounts[0])).toString());

        await acsBTCB.approve(acsBTCBPlus.address, web3.utils.toWei("0.0001"));
        await acsBTCBPlus.mint(web3.utils.toWei("0.0001"));
        await acsBTCBPlus.invest();
        // await acsBTCBPlus.harvest();
        // await acsBTCBPlus.divest();
        // await acsBTCBPlus.redeem(MAX);

        console.log('Total supply after:', (await acsBTCBPlus.totalSupply()).toString());
        console.log('acsBTCB+ balance after: ', (await acsBTCBPlus.balanceOf(accounts[0])).toString());
        console.log('acsBTCB balance after: ', (await acsBTCB.balanceOf(accounts[0])).toString());

        callback();
    } catch (e) {
        callback(e);
    }
}
const ForTubeBTCBPlus = artifacts.require("ForTubeBTCBPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");
const ERC20Upgradeable = artifacts.require("ERC20Upgradeable");

const FBTC = '0xb5C15fD55C73d9BeeC046CB4DAce1e7975DcBBBc';
const BN = web3.utils.BN;
const MAX = new BN(2).pow(new BN(256)).sub(new BN(1));

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying fBTC+...');
        const fBTCPlusImpl = await ForTubeBTCBPlus.new();
        const fBTCPlusProxy = await ERC20Proxy.new(fBTCPlusImpl.address, accounts[1], Buffer.from(''));
        const fBTCPlus = await ForTubeBTCBPlus.at(fBTCPlusProxy.address);
        await fBTCPlus.initialize();

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`fBTC+: ${fBTCPlus.address}`);
        console.log(`fBTC+ implementation: ${fBTCPlusImpl.address}`);

        // const fBTCPlus = await ForTubeBTCBPlus.at("0xD7F984196392C7eA791F4A39e797e8dE19Ca898d");
        // const fBTC = await ERC20Upgradeable.at(FBTC);

        // console.log('Total supply prev: ', (await fBTCPlus.totalSupply()).toString());
        // console.log('fBTC+ balance prev: ', (await fBTCPlus.balanceOf(accounts[0])).toString());
        // console.log('fBTC balance prev: ', (await fBTC.balanceOf(accounts[0])).toString());

        // await fBTC.approve(fBTCPlus.address, web3.utils.toWei("0.0001"));
        // await fBTCPlus.mint(web3.utils.toWei("0.0001"));
        // await fBTCPlus.harvest();

        // console.log('Total supply after:', (await fBTCPlus.totalSupply()).toString());
        // console.log('fBTC+ balance after: ', (await fBTCPlus.balanceOf(accounts[0])).toString());
        // console.log('fBTC balance after: ', (await fBTC.balanceOf(accounts[0])).toString());

        callback();
    } catch (e) {
        callback(e);
    }
}
const ForTubeBTCBPlus = artifacts.require("ForTubeBTCBPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const FBTCB_PLUS = '0x73FddFb941c11d16C827169Bb94aCC227841C396';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading fBTCB+...');
        const fBTCPlusImpl = await ForTubeBTCBPlus.new();
        const fBTCPlusProxy = await ERC20Proxy.at(FBTCB_PLUS);
        await fBTCPlusProxy.upgradeTo(fBTCPlusImpl.address, {from: accounts[1]});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`fBTCB+: ${fBTCPlusProxy.address}`);
        console.log(`fBTCB+ implementation: ${fBTCPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
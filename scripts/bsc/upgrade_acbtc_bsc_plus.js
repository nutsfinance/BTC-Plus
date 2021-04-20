const ACoconutBTCBscPlus = artifacts.require("ACoconutBTCBscPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const ACBTC_BSC_PLUS = '0xd051003a60be3B2feA427448cdc085D08c6E2dcC';

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Upgrading acBTCBsc+...');
        const acBTCBscPlusImpl = await ACoconutBTCBscPlus.new();
        const acBTCBscPlusProxy = await ERC20Proxy.at(ACBTC_BSC_PLUS);
        await acBTCBscPlusProxy.upgradeTo(acBTCBscPlusImpl.address, {from: accounts[1]});

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`acBTCBsc+: ${acBTCBscPlusProxy.address}`);
        console.log(`acBTCBsc+ implementation: ${acBTCBscPlusImpl.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
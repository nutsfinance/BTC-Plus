const BadgerBTCPlus = artifacts.require("BadgerBTCPlus");
const ERC20Proxy = artifacts.require("ERC20Proxy");

const BRENCRV_PLUS = "0x87BAA3E048528d21302Fb15acd09a4e5cB5098cB";
const BSBTCCRV_PLUS = "0xb346d6Fcea1F328b64cF5F1Fe5108841607A7Fef";
const BTBTCCRV_PLUS = "0x25d8293E1d6209d6fa21983f5E46ee6CD36d7196";
const BHRENCRV_PLUS = "0xd929f4d3ACBD19107BC416685e7f6559dC07F3F5";

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Deploying BadgerBTC+...');
        const badgerBTCImpl = await BadgerBTCPlus.new();
        const badgerBTCProxy = await ERC20Proxy.new(badgerBTCImpl.address, accounts[1], Buffer.from(''));
        const badgerBTC = await BadgerBTCPlus.at(badgerBTCProxy.address);
        await badgerBTC.initialize();

        console.log(`Proxy admin: ${accounts[1]}`);
        console.log(`badgerBTC+: ${badgerBTC.address}`);
        console.log(`badgerBTC+ implementation: ${badgerBTCImpl.address}`);

        console.log('Adding brenCrv+ to badgerBTC+...');
        await badgerBTC.addToken(BRENCRV_PLUS);

        console.log('Adding bsBTCCrv+ to badgerBTC+...');
        await badgerBTC.addToken(BSBTCCRV_PLUS);

        console.log('Adding btBTCCrv+ to badgerBTC+...');
        await badgerBTC.addToken(BTBTCCRV_PLUS);

        console.log('Adding bhrenCrv+ to badgerBTC+...');
        await badgerBTC.addToken(BHRENCRV_PLUS);

        callback();
    } catch (e) {
        callback(e);
    }
}
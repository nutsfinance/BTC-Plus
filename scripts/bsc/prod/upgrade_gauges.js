const LiquidityGauge = artifacts.require("LiquidityGauge");
const LiquidityGaugeProxy = artifacts.require("LiquidityGaugeProxy");

const gauges = [
    "0x82123A434A968403D6ca370F16612322146B8FC4",
    "0x2F2379A38EEC183fa4F89Fdc5EC709493f95D305",
    "0x8b327b36E390f3b74aDd16442e3cBF8348f4D64B",
    "0x5f7f26a767398630753C59026D4250D5A059f9F4",
    "0x7EB9fe8107E587Bc7288C65E64D49A6A2d9493d4",
    '0x00f80eA8Ef9a7C974Fa4Cc3F049bE59ba758d906',
    "0xa1DB7a3D26F151c5b93445b2da46f7bed5bcD5Fa",
    "0x8E6d090e70388977bcd588aDCCAc54d1FAe81Fa6",
];

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        const gaugeImpl = await LiquidityGauge.new();
        console.log('Gauge impl: ' + gaugeImpl.address);

        for (const gauge of gauges) {
            const gaugeProxy = await LiquidityGaugeProxy.at(gauge);
            console.log('Gauge proxy: ' + gaugeProxy.address);
            await gaugeProxy.upgradeTo(gaugeImpl.address, {from: accounts[1]});
        }

        callback();
    } catch (e) {
        callback(e);
    }
}
const LiquidityGauge = artifacts.require("LiquidityGauge");
const LiquidityGaugeProxy = artifacts.require("LiquidityGaugeProxy");

const gauges = [
    "0xD5067c2Afb2EbfA0825fB77B4f03a8A97492b51A",
    "0x138Af709446DaD527a837971471577B85cf90a19",
    "0x7e0FbE0ddc6ACAe136c9e0611A3C98DfC9310FA1",
    "0x99FfA758dB93A379FaBBdA268924903881B34649",
    "0x1F3d8f5928F2B82B15960bCDd81ADA46C3371367",
    '0x7f0fe444702d421421a59A124aCC6AfB220c1683',
    "0xd7CDcfB533cA4BC9E24A1C5f0dad597a20bbccD0",
    '0xC79e3B6AAB785492c976C71B4cF235b57b39c376'
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
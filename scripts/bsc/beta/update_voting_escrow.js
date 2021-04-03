const UpdatableLiquidityGauge = artifacts.require("UpdatableLiquidityGauge");
const LiquidityGaugeProxy = artifacts.require("LiquidityGaugeProxy");

const VOTING_ESCROW = '0x17580529d7a21be535E05960b167c4d6c961947c';
const GAUGE_IMPL = "0xB2175E8B1432Be81a2F52835eC7ea6b740db6bE7";
const gauges = [
    "0xD5067c2Afb2EbfA0825fB77B4f03a8A97492b51A",
    "0x138Af709446DaD527a837971471577B85cf90a19",
    "0x7e0FbE0ddc6ACAe136c9e0611A3C98DfC9310FA1",
    "0x99FfA758dB93A379FaBBdA268924903881B34649",
    "0xd7CDcfB533cA4BC9E24A1C5f0dad597a20bbccD0",
    "0x7f0fe444702d421421a59A124aCC6AfB220c1683"
];

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        const gaugeImpl = await UpdatableLiquidityGauge.new();
        console.log('Gauge impl: ' + gaugeImpl.address);

        for (const gauge of gauges) {
            const gaugeProxy = await LiquidityGaugeProxy.at(gauge);
            console.log('Gauge proxy: ' + gaugeProxy.address);
            await gaugeProxy.upgradeTo(gaugeImpl.address, {from: accounts[1]});

            const liquidityGauge = await UpdatableLiquidityGauge.at(gaugeProxy.address);    
            await liquidityGauge.setVotingEscrow(VOTING_ESCROW);

            await gaugeProxy.upgradeTo(GAUGE_IMPL, {from: accounts[1]});
        }

        callback();
    } catch (e) {
        callback(e);
    }
}
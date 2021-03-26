const LiquidityGauge = artifacts.require("LiquidityGauge");
const LiquidityGaugeProxy = artifacts.require("LiquidityGaugeProxy");

const VOTING_ESCROW = '0x64d8f840446aD5b06B8A0fFAfE2F9eed05adA8B0';
const GAUGE_IMPL = "0x235Ab2df01323C5D24c9839f6D42A3e9CBb487ad";
const gauges = [
    "0xD5067c2Afb2EbfA0825fB77B4f03a8A97492b51A",
    "0x138Af709446DaD527a837971471577B85cf90a19",
    "0x7e0FbE0ddc6ACAe136c9e0611A3C98DfC9310FA1",
    "0x99FfA758dB93A379FaBBdA268924903881B34649",
    "0xd7CDcfB533cA4BC9E24A1C5f0dad597a20bbccD0"
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

            // const liquidityGauge = await LiquidityGauge.at(gaugeProxy.address);    
            // await liquidityGauge.setVotingEscrow(VOTING_ESCROW);

            // await gaugeProxy.upgradeTo(GAUGE_IMPL, {from: accounts[1]});
        }

        callback();
    } catch (e) {
        callback(e);
    }
}


async function deployGauge(token, gaugeController) {
    
}
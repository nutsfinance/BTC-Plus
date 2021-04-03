const LiquidityGauge = artifacts.require("LiquidityGauge");

const gauges = [
    "0x82123A434A968403D6ca370F16612322146B8FC4",
    "0x2F2379A38EEC183fa4F89Fdc5EC709493f95D305",
    "0x8b327b36E390f3b74aDd16442e3cBF8348f4D64B",
    "0x5f7f26a767398630753C59026D4250D5A059f9F4",
    "0x00f80eA8Ef9a7C974Fa4Cc3F049bE59ba758d906",
    "0xa1DB7a3D26F151c5b93445b2da46f7bed5bcD5Fa"
];

const COOLDOWN = 86400 * 7;

module.exports = async function (callback) {
    try {
        for (const gauge of gauges) {
            console.log(`Updating gauge: ${gauge}`);
            const liquidityGauge = await LiquidityGauge.at(gauge);    
            await liquidityGauge.setDirectClaimCooldown(COOLDOWN);
        }

        callback();
    } catch (e) {
        callback(e);
    }
}
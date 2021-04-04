const ERC20Proxy = artifacts.require("ERC20Proxy");
const Plus = artifacts.require("Plus");
const LiquidityGaugeProxy = artifacts.require("LiquidityGaugeProxy");
const LiquidityGauge = artifacts.require("LiquidityGauge");
const GaugeControllerProxy = artifacts.require("GaugeControllerProxy");
const GaugeController = artifacts.require("GaugeController");
const VotingEscrowProxy = artifacts.require("VotingEscrowProxy");
const VotingEscrow = artifacts.require("VotingEscrow");

const GOVERNANCE = "0x2932516D9564CB799DDA2c16559caD5b8357a0D6";
const PROXY_ADMIN = "0x03C7CF9A445a6FB7bD9340659f2b5f4c7C746814";

const BSC_MULTISIG = '0x05F4Fb3812c3F5cF605EE7Cd1A0F1491254de0FA';
const TIMELOCK = '0x1F232C589e6DeB148C8180893F4C6F05afc02686';
const GAUGE_CONTROLLER = '0xc7cAF20bD0C16CCBA7673b0848C4B503325256A4';
const VOTING_ESCROW = '0xd8103E3203E40D1b6F01E9d5db55256f610FB68F';
const AUTO_BTC = "0x6B7Ea9F1EF1E6c662761201998Dc876b88Ed7414";

const PLUSES = [
    "0xcf8D1D3Fce7C2138F85889068e50F0e7a18b5321",
    "0x73FddFb941c11d16C827169Bb94aCC227841C396",
    "0xD7806143A4206aa9A816b964e4c994F533b830b0",
    "0x02827D495B2bBe37e1C021eB91BCdCc92cD3b604",
    "0xd051003a60be3B2feA427448cdc085D08c6E2dcC"
];
const GAUGES = [
    "0x82123A434A968403D6ca370F16612322146B8FC4",
    "0x2F2379A38EEC183fa4F89Fdc5EC709493f95D305",
    "0x8b327b36E390f3b74aDd16442e3cBF8348f4D64B",
    "0x5f7f26a767398630753C59026D4250D5A059f9F4",
    "0x00f80eA8Ef9a7C974Fa4Cc3F049bE59ba758d906",
    "0xa1DB7a3D26F151c5b93445b2da46f7bed5bcD5Fa"
];

module.exports = async function (callback) {
    try {
        const accounts = await web3.eth.getAccounts();

        console.log('Updating autoBTC...');
        const autoBTCProxy = await ERC20Proxy.at(AUTO_BTC);
        await autoBTCProxy.changeAdmin(TIMELOCK, {from: PROXY_ADMIN});

        console.log("Updating plus tokens...");
        for (const plus of PLUSES) {
            const token = await Plus.at(plus);
            await token.setGovernance(BSC_MULTISIG, {from: GOVERNANCE});

            const tokenProxy = await ERC20Proxy.at(plus);
            await tokenProxy.changeAdmin(TIMELOCK, {from: PROXY_ADMIN});
            console.log(`Token updated: ${plus}`);
        }

        console.log('Updating gauge controller...');
        const gaugeController = await GaugeController.at(GAUGE_CONTROLLER);
        await gaugeController.setGovernance(BSC_MULTISIG, {from: GOVERNANCE});
        const gaugeControllerProxy = await GaugeControllerProxy.at(GAUGE_CONTROLLER);
        await gaugeControllerProxy.changeAdmin(TIMELOCK, {from: PROXY_ADMIN});

        console.log(`Updating voting escrow...`);
        const votingEscrow = await VotingEscrow.at(VOTING_ESCROW);
        await votingEscrow.commit_transfer_ownership(BSC_MULTISIG, {from: GOVERNANCE});
        await votingEscrow.apply_transfer_ownership({from: GOVERNANCE});
        const votingEscrowProxy = await VotingEscrowProxy.at(VOTING_ESCROW);
        await votingEscrowProxy.changeAdmin(TIMELOCK, {from: PROXY_ADMIN});

        console.log("Updating gauges...");
        for (const gauge of GAUGES) {
            const gaugeProxy = await LiquidityGaugeProxy.at(gauge);
            await gaugeProxy.changeAdmin(TIMELOCK, {from: PROXY_ADMIN});
            console.log(`Gauge updated: ${gauge}`);
        }

        callback();
    } catch (e) {
        callback(e);
    }
}
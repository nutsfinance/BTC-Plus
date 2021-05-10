const LiquidityGauge = artifacts.require("LiquidityGauge");
const GaugeController = artifacts.require("GaugeController");
const MockToken = artifacts.require("MockToken");
const SinglePlus = artifacts.require("SinglePlus");
const MockVotingEscrow = artifacts.require("MockVotingEscrow");

const toWei = web3.utils.toWei;
const BN = web3.utils.BN;

FUZZ_ORIGIN = '0xAaaaAaAAaaaAAaAAaAaaaaAAAAAaAaaaAaAaaAA0'
FUZZ_ACCOUNT_1 = '0xAaAaaAAAaAaaAaAaAaaAAaAaAAAAAaAAAaaAaAa2'
FUZZ_ACCOUNT_2 = '0xafFEaFFEAFfeAfFEAffeaFfEAfFEaffeafFeAFfE'

module.exports = async function (callback) {
    try {
        contracts = [];

        console.log("Deploying reward")
        reward = await MockToken.new("Mock Reward", "mReward", 18);     
        contracts.push({ Contract: "Reward", Address: reward.address });
            
        console.log("Deploying Controller")
        controller = await GaugeController.new();
        contracts.push({ Contract: "Controller", Address: controller.address });

        // 864 AC for all plus gauges per day
        await controller.initialize(reward.address, toWei('864'));

        voting = await MockVotingEscrow.new();
        contracts.push({ Contract: "Voting", Address: voting.address });

        console.log("Deploying underlying")
        underlying1 = await MockToken.new("Mock Token 1", "mToken1", 18);
        contracts.push({ Contract: "underlying1", Address: underlying1.address });
        underlying2 = await MockToken.new("Mock Token 2", "mToken2", 18);
        contracts.push({ Contract: "underlying2", Address: underlying2.address });

        token1 = await SinglePlus.new();
        await token1.initialize(underlying1.address, '', '');
        token2 = await SinglePlus.new();
        await token2.initialize(underlying2.address, '', '');
        token3 = await MockToken.new("Mock Token 3", "mToken3", 18);

        console.log("Setting up gauges")
        gauge1 = await LiquidityGauge.new();
        contracts.push({ Contract: "Gauge 1", Address: gauge1.address });
        await gauge1.initialize(token1.address, controller.address, voting.address);
        gauge2 = await LiquidityGauge.new();
        contracts.push({ Contract: "Gauge 2", Address: gauge2.address });
        await gauge2.initialize(token2.address, controller.address, voting.address);
        gauge3 = await LiquidityGauge.new();
        contracts.push({ Contract: "Gauge 3", Address: gauge3.address });
        await gauge3.initialize(token3.address, controller.address, voting.address);

        await controller.addGauge(gauge1.address, true, toWei("1"), "0");
        await controller.addGauge(gauge2.address, true, toWei("1.5"), "0");
        await controller.addGauge(gauge3.address, false, "0", toWei("17.28"));

        controller.setGovernance(FUZZ_ORIGIN)

        console.log("Printing addresses")
        console.table(contracts);
        callback();
    } catch (e) {
        callback(e);
    }
}

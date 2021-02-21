const BTCPlus = artifacts.require("BTCPlus");
const MockToken = artifacts.require("MockToken");
const Pool = artifacts.require("SinglePool");

const deployBTCPlus = async (deployer, accounts) => {
    // const btcPlus = await deployer.deploy(BTCPlus);
    // await btcPlus.initialize();

    // const mockWBTC = await deployer.deploy(MockToken);
    // await mockWBTC.initialize("Mock WBTC", "MockWBTC", 8);
    // const wbtcPool = await deployer.deploy(Pool);
    // await wbtcPool.initialize(btcPlus.address, mockWBTC.address);
    // await btcPlus.addPool(mockWBTC.address, wbtcPool.address);

    // const mockRenBTC = await deployer.deploy(MockToken);
    // await mockRenBTC.initialize("Mock renWBTC", "MockRenBTC", 8);
    // const renPool = await deployer.deploy(Pool);
    // await renPool.initialize(btcPlus.address, mockRenBTC.address);
    // await btcPlus.addPool(mockRenBTC.address, renPool.address);

    // console.log("BTC+: " + btcPlus.address);
    // console.log("WBTC: " + mockWBTC.address);
    // console.log("renBTC: " + mockRenBTC.address);

    const wbtc = await MockToken.at("0xF26d963a0420F285cBa59dC6C0a65e34E55C8396");
    const renBTC = await MockToken.at("0xDC3bEC090E595D8DB22B8Fdf1904331984D87cdc");
    await wbtc.mint("0xc1C0aE73E89a9ec2136853a7776bCe0181c1c6CB", "10000000000");
    await renBTC.mint("0xc1C0aE73E89a9ec2136853a7776bCe0181c1c6CB", "10000000000");
}

module.exports = function (deployer, network, accounts) {
    deployer
        .then(() => deployBTCPlus(deployer, accounts))
        .catch(error => {
            console.log(error);
            process.exit(1);
        });
};

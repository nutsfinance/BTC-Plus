const BTCPlus = artifacts.require("BTCPlus");

const deployBTCPlus = async (deployer, accounts) => {
    const btcPlus = await deployer.deploy(BTCPlus);
    await btcPlus.initialize();
}

module.exports = function (deployer, network, accounts) {
    deployer
        .then(() => deployBTCPlus(deployer, accounts))
        .catch(error => {
            console.log(error);
            process.exit(1);
        });
};

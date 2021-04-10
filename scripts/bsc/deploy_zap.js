const BTCZapBsc = artifacts.require("BTCZapBsc");

module.exports = async function (callback) {
    try {
        console.log('Deploying BTCZapBsc...');
        const zap = await BTCZapBsc.new();
        console.log(`BTCZapBsc: ${zap.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
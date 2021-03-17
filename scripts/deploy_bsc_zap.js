const BTCZapBsc = artifacts.require("BTCZapBsc");

module.exports = async function (callback) {
    try {
        const zap = await BTCZapBsc.new();
        console.log(`Zap: ${zap.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
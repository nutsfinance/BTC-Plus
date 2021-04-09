const MockACoconut = artifacts.require("MockACoconut");

module.exports = async function (callback) {
    try {

        console.log('Deploying mAC...');
        const mAC = await MockACoconut.new();
        console.log(`mAC: ${mAC.address}`);

        callback();
    } catch (e) {
        callback(e);
    }
}
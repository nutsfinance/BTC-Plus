const TimeLock = artifacts.require("TimeLock");

FUZZ_ORIGIN = '0xAaaaAaAAaaaAAaAAaAaaaaAAAAAaAaaaAaAaaAA0'
FUZZ_ACCOUNT_1 = '0xAaAaaAAAaAaaAaAaAaaAAaAaAAAAAaAAAaaAaAa2'
FUZZ_ACCOUNT_2 = '0xafFEaFFEAFfeAfFEAffeaFfEAfFEaffeafFeAFfE'

module.exports = async function (callback) {
    try {
        contracts = [];

        console.log("Deploying timelock")
        timelock = await TimeLock.new(FUZZ_ORIGIN, 86400);     
        contracts.push({ Contract: "timelock", Address: timelock.address });
            
        console.log("Printing addresses")
        console.table(contracts);
        callback();
    } catch (e) {
        callback(e);
    }
}

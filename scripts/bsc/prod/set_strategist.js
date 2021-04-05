const Plus = artifacts.require("Plus");

const STRATEGIST = '0x098d907E1A3F26cC65B8ACa1c37E41B208699bac';

const PLUSES = [
    "0xcf8D1D3Fce7C2138F85889068e50F0e7a18b5321",
    "0x73FddFb941c11d16C827169Bb94aCC227841C396",
    "0xD7806143A4206aa9A816b964e4c994F533b830b0",
    "0x02827D495B2bBe37e1C021eB91BCdCc92cD3b604",
    "0xd051003a60be3B2feA427448cdc085D08c6E2dcC"
];

module.exports = async function (callback) {
    try {
        console.log("Updating plus tokens...");
        for (const plus of PLUSES) {
            const token = await Plus.at(plus);
            await token.setStrategist(STRATEGIST, true);
        }

        callback();
    } catch (e) {
        callback(e);
    }
}
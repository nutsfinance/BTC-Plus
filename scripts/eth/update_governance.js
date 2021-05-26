const ERC20Proxy = artifacts.require("ERC20Proxy");
const Plus = artifacts.require("Plus");
const LiquidityGaugeProxy = artifacts.require("LiquidityGaugeProxy");
const GaugeControllerProxy = artifacts.require("GaugeControllerProxy");
const GaugeController = artifacts.require("GaugeController");
const VotingEscrowProxy = artifacts.require("VotingEscrowProxy");
const VotingEscrow = artifacts.require("VotingEscrow");
const ZapProxy = artifacts.require("ZapProxy");
const ProxyAdmin = artifacts.require("@openzeppelin/contracts/ProxyAdmin");

const GOVERNANCE = "0x2932516D9564CB799DDA2c16559caD5b8357a0D6";
const PROXY_ADMIN = "0x03C7CF9A445a6FB7bD9340659f2b5f4c7C746814";

const AC_MULTISIG = '0xc25D6AD0C82F21bE056699d575284e18678F8fE5';
const NEW_PROXY_ADMIN = '0x777fAd9a870f75aa9eD162aee0584e4d2801Ce68';

const GAUGE_CONTROLLER = '0x610af93A398733d7eAC27a895E6e7090D6F3786e';
const VOTING_ESCROW = '0x858a8553239f4ec773C9b83C5AE5e8a584dC320c';
const CURVE_BTC_ZAP = "0x6722d631072beDaB698b7bFe8095D34FF7955a78";

const PLUSES = [
    "0x87BAA3E048528d21302Fb15acd09a4e5cB5098cB",   // brenCrv+
    "0xb346d6Fcea1F328b64cF5F1Fe5108841607A7Fef",   // bsBTCCrv+
    "0x25d8293E1d6209d6fa21983f5E46ee6CD36d7196",   // btBTCCrv+
    "0xd929f4d3ACBD19107BC416685e7f6559dC07F3F5",   // bhrenCrv+
    "0xDe79d36aB6D2489dd36729A657a25f299Cb2Fbca"    // CurveBTC+
];
const GAUGES = [
    "0x120d7574c72C6EAF0f14d7583EAa970Db4D3deC3",   // Sushi-CurveBTC+-WBTC Gauge
];

module.exports = async function (callback) {
    try {
        console.log("Updating plus tokens...");
        for (const plus of PLUSES) {
            const token = await Plus.at(plus);
            await token.setGovernance(AC_MULTISIG, {from: GOVERNANCE});

            const tokenProxy = await ERC20Proxy.at(plus);
            await tokenProxy.changeAdmin(NEW_PROXY_ADMIN, {from: PROXY_ADMIN});
            console.log(`Token updated: ${plus}`);
        }

        console.log('Updating zap...');
        const zapProxy = await ZapProxy.at(CURVE_BTC_ZAP);
        await zapProxy.changeAdmin(NEW_PROXY_ADMIN, {from: PROXY_ADMIN});

        console.log('Updating gauge controller...');
        const gaugeController = await GaugeController.at(GAUGE_CONTROLLER);
        await gaugeController.setGovernance(AC_MULTISIG, {from: GOVERNANCE});
        const gaugeControllerProxy = await GaugeControllerProxy.at(GAUGE_CONTROLLER);
        await gaugeControllerProxy.changeAdmin(NEW_PROXY_ADMIN, {from: PROXY_ADMIN});

        console.log(`Updating voting escrow...`);
        const votingEscrow = await VotingEscrow.at(VOTING_ESCROW);
        await votingEscrow.commit_transfer_ownership(AC_MULTISIG, {from: GOVERNANCE});
        await votingEscrow.apply_transfer_ownership({from: GOVERNANCE});
        const votingEscrowProxy = await VotingEscrowProxy.at(VOTING_ESCROW);
        await votingEscrowProxy.changeAdmin(NEW_PROXY_ADMIN, {from: PROXY_ADMIN});

        console.log("Updating gauges...");
        for (const gauge of GAUGES) {
            const gaugeProxy = await LiquidityGaugeProxy.at(gauge);
            await gaugeProxy.changeAdmin(NEW_PROXY_ADMIN, {from: PROXY_ADMIN});
            console.log(`Gauge updated: ${gauge}`);
        }

        console.log("Validating proxy admins...");
        const proxyAdmin = await ProxyAdmin.at(NEW_PROXY_ADMIN);
        for (const plus of PLUSES) {
            console.log(`Plus token: ` + (await proxyAdmin.getProxyAdmin(plus)));
        }
        console.log(`Zap: ` + (await proxyAdmin.getProxyAdmin(CURVE_BTC_ZAP)));
        console.log(`Gauge controller: ` + (await proxyAdmin.getProxyAdmin(GAUGE_CONTROLLER)));
        console.log(`Voting escrow: ` + (await proxyAdmin.getProxyAdmin(VOTING_ESCROW)));
        for (const gauge of GAUGES) {
            console.log(`Gauge: ` + (await proxyAdmin.getProxyAdmin(gauge)));
        }


        callback();
    } catch (e) {
        callback(e);
    }
}
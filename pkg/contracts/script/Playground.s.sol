// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import {CVStrategyHelpersV0_0, CVStrategyV0_0, StrategyStruct} from "../test/CVStrategyHelpersV0_0.sol";
import {IArbitrator, SafeArbitrator} from "../src/SafeArbitrator.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
// import {SafeSetup} from "../test/shared/SafeSetup.sol";
// import {ISafe as Safe, SafeProxyFactory, Enum} from "../src/interfaces/ISafe.sol";
// import {CollateralVault} from "../src/CollateralVault.sol";
// import {DeployCollateralVaultTemplate} from "./DeployCollateralVaultTemplate.sol";
import {SimpleSafe} from "../src/SimpleSafe.sol";

contract Playground is Script, CVStrategyHelpersV0_0 {
    address public SENDER = 0xb05A948B5c1b057B88D381bDe3A375EfEA87EbAD;
    // address public ARBITRATOR = 0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0;
    // address public TRIBUNAL_SAFE = 0xb05A948B5c1b057B88D381bDe3A375EfEA87EbAD;
    address public COUNCIL_SAFE = 0xC7f2Cf4845C6db0e1a1e91ED41Bcd0FcC1b0E141;
    address public CV_STRATEGY_PROXY = 0x04288a2c4e8EadF17eD6B8B55757fC0281c99176;
    // address public COLLATERAL_VAULT = 0xF61F348a6b47E9d012C5d0119B22Af7B6571F419;

    function run() public {
        // SimpleSafe newSafe = SimpleSafe(COUNCIL_SAFE);
        // console.log(newSafe.getOwners()[0]);
        //  vm.startBroadcast(pool_admin());
        // uint256 councilMemberPKEnv = vm.envUint("PK");
        // if (councilMemberPKEnv == 0) {
        //     revert("PK not set");
        // }
        // CollateralVault deployedCollateralVault = CollateralVault(payable(COLLATERAL_VAULT)); // Assuming your deployment logic

        // CollateralVault deployedCollateralVault = new CollateralVault();
        // DeployCollateralVaultTemplate.deployCollateralVaultTemplate();
        // console.log(
        //     "address(0x3b1fbFB04DB3585920b2eAdBb8839FC9680FE8cd).code.length: %s", address(COLLATERAL_VAULT).code.length
        // );
        // console.log("owner", deployedCollateralVault.owner());
        CVStrategyV0_0 strategy = CVStrategyV0_0(payable(CV_STRATEGY_PROXY));
        // (uint256 submitter, uint256 challenger) = strategy.getCollateralAmounts();
        // console.log("submitter: %s, challenger: %s", submitter, challenger);
        // vm.startBroadcast(pool_admin());
        // CVStrategyV0_0 strategy = CVStrategyV0_0(payable(CV_STRATEGY_PROXY));
        // Safe councilSafeDeploy = Safe(COUNCIL_SAFE);

        vm.startBroadcast(SENDER);
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(new SafeArbitrator()), abi.encodeWithSelector(SafeArbitrator.initialize.selector, 0.001 ether)
        );
        IArbitrator arbitrator = SafeArbitrator(payable(address(proxy)));
        (uint256 maxRatio, uint256 weight, uint256 decay, uint256 minThresholdPoints) = strategy.cvParams();
        (
            ,
            address tribunalSafe,
            uint256 submitterCollateralAmount,
            uint256 challengerCollateralAmount,
            uint256 defaultRuling,
            uint256 defaultRulingTimeout
        ) = strategy.arbitrableConfig();
        strategy.setPoolParams(
            StrategyStruct.ArbitrableConfig({
                arbitrator: arbitrator,
                tribunalSafe: tribunalSafe,
                submitterCollateralAmount: submitterCollateralAmount,
                challengerCollateralAmount: challengerCollateralAmount,
                defaultRuling: defaultRuling,
                defaultRulingTimeout: defaultRulingTimeout
            }),
            StrategyStruct.CVParams({
                decay: maxRatio,
                maxRatio: weight,
                weight: decay,
                minThresholdPoints: minThresholdPoints
            })
        );
        vm.stopBroadcast();

        // safeHelper(
        //     councilSafeDeploy,
        //     councilMemberPKEnv,
        //     address(councilSafeDeploy),
        //     abi.encodeWithSelector(
        //         strategy.setPoolParams.selector,
        //         StrategyStruct.ArbitrableConfig({
        //             arbitrator: arbitrator,
        //             tribunalSafe: SENDER,
        //             submitterCollateralAmount: 3 ether,
        //             challengerCollateralAmount: 2 ether,
        //             defaultRuling: 1,
        //             defaultRulingTimeout: 600
        //         }),
        //         StrategyStruct.CVParams({
        //             decay: _etherToFloat(0.9999799 ether),
        //             maxRatio: _etherToFloat(0.2 ether),
        //             weight: _etherToFloat(0.001 ether),
        //             minThresholdPoints: 0.2 ether
        //         })
        //     )
        // );

        // vm.stopBroadcast();
        // _councilSafe();
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import {CVStrategyHelpersV0_0, CVStrategyV0_0, StrategyStruct} from "../test/CVStrategyHelpersV0_0.sol";
import {IArbitrator} from "../src/SafeArbitrator.sol";
import {SafeSetup} from "../test/shared/SafeSetup.sol";
import {ISafe as Safe, SafeProxyFactory, Enum} from "../src/interfaces/ISafe.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {DeployCollateralVaultTemplate} from "./DeployCollateralVaultTemplate.sol";

contract Playground is Script, CVStrategyHelpersV0_0, SafeSetup {
    address public SENDER = 0x07AD02e0C1FA0b09fC945ff197E18e9C256838c6;
    address public ARBITRATOR = 0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0;
    address public TRIBUNAL_SAFE = 0x07AD02e0C1FA0b09fC945ff197E18e9C256838c6;
    address public COUNCIL_SAFE = 0x3b779854D03FA6a54853A8786cCD3234E44d6662;
    address public CV_STRATEGY_PROXY = 0x4826533B4897376654Bb4d4AD88B7faFD0C98528;
    address public COLLATERAL_VAULT = 0xF61F348a6b47E9d012C5d0119B22Af7B6571F419;

    function run() public {
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

        (uint256 maxRatio, uint256 weight, uint256 decay, uint256 minThresholdPoints) = strategy.cvParams();

        console.log("Max ratio: ", maxRatio);
        console.log("Weight: ", weight);
        console.log("Decay: ", decay);
        console.log("Min threshold points: ", minThresholdPoints);

        (
            IArbitrator arbitrator,
            address tribunalSafe,
            uint256 submitterCollateralAmount,
            uint256 challengerCollateralAmount,
            uint256 defaultRuling,
            uint256 defaultRulingTimeout
        ) = strategy.arbitrableConfig();

        console.log("Arbitrator: ", address(arbitrator));
        console.log("Tribunal safe: ", tribunalSafe);
        console.log("Submitter collateral amount: ", submitterCollateralAmount);
        console.log("Challenger collateral amount: ", challengerCollateralAmount);
        console.log("Default ruling: ", defaultRuling);
        console.log("Default ruling timeout: ", defaultRulingTimeout);

        // vm.startBroadcast(pool_admin());
        // CVStrategyV0_0 strategy = CVStrategyV0_0(payable(CV_STRATEGY_PROXY));
        // Safe councilSafeDeploy = Safe(COUNCIL_SAFE);
        // IArbitrator arbitrator = IArbitrator(ARBITRATOR);

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
    }
}

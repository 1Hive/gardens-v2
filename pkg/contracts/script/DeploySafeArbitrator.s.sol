// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import "forge-std/Script.sol";
import {SafeArbitrator} from "../src/SafeArbitrator.sol";
import {CVStrategyV0_0, ArbitrableConfig} from "../src/CVStrategy/CVStrategyV0_0.sol";

contract DeploySafeArbitrator is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        address sender = 0xb05A948B5c1b057B88D381bDe3A375EfEA87EbAD;

        address newSafeArbitrator = address(
            new ERC1967Proxy(
                address(new SafeArbitrator()),
                abi.encodeWithSelector(SafeArbitrator.initialize.selector, 0.001 ether, address(proxyOwner))
            )
        );

        console.log("New Safe Arbitrator: ", newSafeArbitrator);

         // CV STRATEGIES
        //  address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        //  for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
        //      CVStrategyV0_0 strategy = CVStrategyV0_0(payable(address(cvStrategyProxies[i])));
        //      if (address(strategy.registryCommunity().councilSafe()) != sender) {
        //          continue;
        //      }
        //      address existingSybil = address(strategy.sybilScorer());
        //      (
        //          ,
        //          address tribunalSafe,
        //          uint256 submitterCollateralAmount,
        //          uint256 challengerCollateralAmount,
        //          uint256 defaultRuling,
        //          uint256 defaultRulingTimeout
        //      ) = strategy.arbitrableConfigs(strategy.currentArbitrableConfigVersion());
        //      (uint256 maxRatio, uint256 weight, uint256 decay, uint256 minThresholdPoints) = strategy.cvParams();
        //      strategy.setPoolParams(
        //          ArbitrableConfig(
        //              IArbitrator(newSafeArbitrator),
        //              tribunalSafe,
        //              submitterCollateralAmount,
        //              challengerCollateralAmount,
        //              defaultRuling,
        //              defaultRulingTimeout
        //          ),
        //          CVParams(maxRatio, weight, decay, minThresholdPoints)
        //      );
        //  }
    }
}

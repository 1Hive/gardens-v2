// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import "forge-std/Script.sol";
import {SafeArbitrator} from "../src/SafeArbitrator.sol";
import {CVStrategy, ArbitrableConfig} from "../src/CVStrategy/CVStrategy.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeploySafeArbitrator is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        address safeArbitrator = networkJson.readAddress(getKeyNetwork(".ENVS.ARBITRATOR"));
        // address sender = networkJson.readAddress(getKeyNetwork(".ENVS.SENDER"));
        address newImplementation = address(new SafeArbitrator());

        if (safeArbitrator == address(0)) {
            address newSafeArbitrator = address(
                new ERC1967Proxy(
                    newImplementation,
                    abi.encodeWithSelector(SafeArbitrator.initialize.selector, 0.001 ether, address(proxyOwner))
                )
            );
            console.log("New Safe Arbitrator: ", newSafeArbitrator);
        } else {
            SafeArbitrator(safeArbitrator).upgradeTo(newImplementation);
            console.log("Safe Arbitrator upgraded: ", safeArbitrator);
        }

        // CV STRATEGIES
        //  address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        //  for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
        //      CVStrategy strategy = CVStrategy(payable(address(cvStrategyProxies[i])));
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

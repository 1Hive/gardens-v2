// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import "forge-std/Script.sol";
import {PassportScorer} from "../src/PassportScorer.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";

contract DeployPassportScorer is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        address listManager = 0xA718ACA8Eb8f01EcfE929BF16c19e562B57b053b; // Multichain EOA
        // address sender = networkJson.readAddress(getKeyNetwork(".ENVS.SENDER"));

        address newPassportScorer = address(
            new ERC1967Proxy(
                address(new PassportScorer()),
                abi.encodeWithSelector(PassportScorer.initialize.selector, address(listManager), address(proxyOwner))
            )
        );


        // CV STRATEGIES
        // address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        // for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
        //     CVStrategy strategy = CVStrategy(payable(address(cvStrategyProxies[i])));
        //     if (address(strategy.registryCommunity().councilSafe()) != sender) {
        //         continue;
        //     }
        //     address existingSybil = address(strategy.sybilScorer());
        //     if (existingSybil == address(0)) {
        //         continue;
        //     }
        //     (uint256 existingThreshold,,) = PassportScorer(existingSybil).strategies(address(cvStrategyProxies[i]));
        //     strategy.setSybilScorer(newPassportScorer, existingThreshold);
        // }
    }
}

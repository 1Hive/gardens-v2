// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./BaseMultiChain.s.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";

// Uncoment setSybilScorer
// contract SetStrategyPassportScorer is BaseMultiChain {
//     using stdJson for string;

//     function runCurrentNetwork(string memory networkJson) public override {
//         address passportScorerProxy = networkJson.readAddress(getKeyNetwork(".ENVS.PASSPORT_SCORER"));
//         PassportScorer passportScorer = PassportScorer(address(passportScorerProxy));

//         address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
//         for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
//             CVStrategy strategy = CVStrategy(payable(address(cvStrategyProxies[i])));
//             (uint256 threshold,,) = passportScorer.strategies(address(strategy));
//             strategy.setSybilScorer(passportScorerProxy, threshold);
//         }
//     }
// }

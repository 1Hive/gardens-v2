// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import {PassportScorer} from "../src/PassportScorer.sol";
import {SafeArbitrator} from "../src/SafeArbitrator.sol";

/// @notice Upgrades the shared security-sensitive UUPS proxies for one configured network.
contract UpgradeSecuritySingletons is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        address passportScorerProxy = networkJson.readAddress(getKeyNetwork(".ENVS.PASSPORT_SCORER"));
        address safeArbitratorProxy = networkJson.readAddress(getKeyNetwork(".ENVS.ARBITRATOR"));

        require(passportScorerProxy.code.length != 0, "passport scorer proxy has no code");
        require(safeArbitratorProxy.code.length != 0, "safe arbitrator proxy has no code");
        require(PassportScorer(passportScorerProxy).owner() == pool_admin(), "passport scorer owner mismatch");
        require(SafeArbitrator(payable(safeArbitratorProxy)).owner() == pool_admin(), "safe arbitrator owner mismatch");

        address passportScorerImplementation = address(new PassportScorer());
        address safeArbitratorImplementation = address(new SafeArbitrator());

        PassportScorer(passportScorerProxy).upgradeTo(passportScorerImplementation);
        SafeArbitrator(payable(safeArbitratorProxy)).upgradeTo(safeArbitratorImplementation);

        _writeNetworkAddress(".IMPLEMENTATIONS.PASSPORT_SCORER", passportScorerImplementation);
        _writeNetworkAddress(".IMPLEMENTATIONS.SAFE_ARBITRATOR", safeArbitratorImplementation);
    }
}

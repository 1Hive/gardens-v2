// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import {PassportScorer} from "../src/PassportScorer.sol";

contract UpgradePassportScorer is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        address proxy = networkJson.readAddress(getKeyNetwork(".ENVS.PASSPORT_SCORER"));
        require(proxy.code.length != 0, "passport scorer proxy has no code");
        require(PassportScorer(proxy).owner() == pool_admin(), "passport scorer owner mismatch");

        address implementation = address(new PassportScorer());
        PassportScorer(proxy).upgradeTo(implementation);
        _writeNetworkAddress(".IMPLEMENTATIONS.PASSPORT_SCORER", implementation);
    }
}

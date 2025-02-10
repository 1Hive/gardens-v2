// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./BaseMultiChain.s.sol";

contract PassportScorerWriter is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        address passportScorerProxy = networkJson.readAddress(getKeyNetwork(".ENVS.PASSPORT_SCORER"));
        PassportScorer passportScorer = PassportScorer(address(passportScorerProxy));
        address passportManager = 0xA718ACA8Eb8f01EcfE929BF16c19e562B57b053b;
        passportScorer.changeListManager(passportManager);
    }
}

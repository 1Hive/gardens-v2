// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";

contract RenounceProxyOwnerUpgradeAccess is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        address proxyOwnerAddress = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        require(proxyOwnerAddress != address(0), "PROXY_OWNER is zero");
        require(proxyOwnerAddress.code.length > 0, "PROXY_OWNER has no code");

        ProxyOwner proxyOwner = ProxyOwner(payable(proxyOwnerAddress));
        address currentUpgradeAccess = proxyOwner.upgradeAccess();

        console2.log("Network", CURRENT_NETWORK);
        console2.log("Proxy owner", proxyOwnerAddress);
        console2.log("Proxy owner mainOwner", proxyOwner.proxyOwner());
        console2.log("Current upgrade access", currentUpgradeAccess);
        console2.log("Sender", SENDER);

        if (currentUpgradeAccess == address(0)) {
            console2.log("Upgrade access already renounced");
            return;
        }

        require(currentUpgradeAccess == SENDER, "sender is not current upgrade access");
        proxyOwner.renounceUpgradeAccess();
        console2.log("Upgrade access renounced");
    }
}

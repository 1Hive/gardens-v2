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
        address expectedOwner = vm.envOr("RENOUNCE_EXPECTED_OWNER", proxyOwner.mainOwner());
        require(expectedOwner != address(0), "main owner is zero");
        require(proxyOwner.mainOwner() == expectedOwner, "unexpected main owner");

        console2.log("Network", CURRENT_NETWORK);
        console2.log("Proxy owner", proxyOwnerAddress);
        console2.log("Proxy owner mainOwner", proxyOwner.proxyOwner());
        console2.log("Current upgrade access", currentUpgradeAccess);
        console2.log("Sender", SENDER);

        if (currentUpgradeAccess == address(0)) {
            console2.log("Upgrade access already renounced");
        } else {
            require(currentUpgradeAccess == SENDER, "sender is not current upgrade access");
            proxyOwner.renounceUpgradeAccess();
            console2.log("Upgrade access renounced");
        }

        require(proxyOwner.upgradeAccess() == address(0), "upgrade access remains active");
        require(proxyOwner.owner() == expectedOwner, "ProxyOwner effective owner mismatch");

        address factory = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        require(ProxyOwner(payable(factory)).owner() == expectedOwner, "factory effective owner mismatch");
        address[] memory communities = networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        for (uint256 i; i < communities.length; ++i) {
            require(ProxyOwner(payable(communities[i])).owner() == expectedOwner, "community effective owner mismatch");
        }
        address[] memory strategies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        for (uint256 i; i < strategies.length; ++i) {
            require(ProxyOwner(payable(strategies[i])).owner() == expectedOwner, "strategy effective owner mismatch");
        }
        console2.log("Effective ownership verified for factory, communities, and strategies");
    }
}

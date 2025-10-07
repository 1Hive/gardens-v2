// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import {CVStrategyV0_0} from "../src/CVStrategy/CVStrategyV0_0.sol";
import {RegistryCommunityV0_0} from "../src/RegistryCommunity/RegistryCommunityV0_0.sol";
import {RegistryFactoryV0_0} from "../src/RegistryFactory/RegistryFactoryV0_0.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";

contract DeployProxyOwner is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        address proxyOwner = address(
            new ERC1967Proxy(
                address(new ProxyOwner()), abi.encodeWithSelector(ProxyOwner.initialize.selector, address(SENDER))
            )
        );
        console.log("ProxyOwner: ", proxyOwner);
    }
}

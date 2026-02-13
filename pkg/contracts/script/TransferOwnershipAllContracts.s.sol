// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./BaseMultiChain.s.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";

contract TransferOwnershipAllContracts is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        address proxyOwner = address(
            new ERC1967Proxy(
                address(new ProxyOwner()), abi.encodeWithSelector(ProxyOwner.initialize.selector, address(SENDER))
            )
        );
        console.log("ProxyOwner: ", proxyOwner);

        // address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        ProxyOwner proxy = ProxyOwner(payable(address(proxyOwner)));
        proxy.upgradeTo(address(new ProxyOwner()));

        // ARBITRATOR
        address arbitratorScorerProxy = networkJson.readAddress(getKeyNetwork(".ENVS.ARBITRATOR"));
        SafeArbitrator(payable(address(arbitratorScorerProxy))).transferOwnership(proxyOwner);

        // PASSPORT SCORER
        address passportScorerProxy = networkJson.readAddress(getKeyNetwork(".ENVS.PASSPORT_SCORER"));
        PassportScorer(payable(address(passportScorerProxy))).transferOwnership(proxyOwner);

        // REGISTRY FACTORY
        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        RegistryFactory(payable(address(registryFactoryProxy))).transferOwnership(proxyOwner);

        // REGISTRY COMMUNITIES
        address[] memory registryCommunityProxies =
            networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            RegistryCommunity(payable(address(registryCommunityProxies[i]))).transferOwnership(proxyOwner);
        }

        // CV STRATEGIES
        address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            CVStrategy(payable(address(cvStrategyProxies[i]))).transferOwnership(proxyOwner);
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/StdJson.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {RegistryCommunityDiamondInit} from "../src/RegistryCommunity/RegistryCommunityDiamondInit.sol";
import {CVStrategyDiamondInit} from "../src/CVStrategy/CVStrategyDiamondInit.sol";

contract VerifyNetworkConfigState is Script {
    using stdJson for string;

    bytes32 internal constant EIP1967_IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    function run(string memory network) public view {
        require(bytes(network).length != 0, "network is required");
        string memory networkJson = _readNetworksJson();
        string memory networkKey = _networkKey(network);

        RegistryFactory factory =
            RegistryFactory(payable(networkJson.readAddress(string.concat(networkKey, ".PROXIES.REGISTRY_FACTORY"))));

        require(address(factory) != address(0), "registry factory proxy missing");
        require(address(factory).code.length > 0, "registry factory proxy has no code");

        _verifyOptionalProxyImplementation(
            factory, networkJson, networkKey, ".IMPLEMENTATIONS.REGISTRY_FACTORY", "factory"
        );
        _verifyOptionalProxyImplementationFromEnv(
            networkJson, networkKey, ".ENVS.PROXY_OWNER", ".IMPLEMENTATIONS.PROXY_OWNER", "proxy owner"
        );
        _verifyOptionalProxyImplementationFromEnv(
            networkJson, networkKey, ".ENVS.PAUSE_CONTROLLER", ".IMPLEMENTATIONS.PAUSE_CONTROLLER", "pause controller"
        );
        _verifyOptionalProxyImplementationFromEnv(
            networkJson,
            networkKey,
            ".ENVS.STREAMING_ESCROW_FACTORY",
            ".IMPLEMENTATIONS.STREAMING_ESCROW_FACTORY",
            "streaming escrow factory"
        );

        address expectedCommunityImpl = _readRequiredAddress(networkJson, networkKey, ".IMPLEMENTATIONS.REGISTRY_COMMUNITY");
        address expectedStrategyImpl = _readRequiredAddress(networkJson, networkKey, ".IMPLEMENTATIONS.CV_STRATEGY");
        address expectedCollateralVaultImpl =
            _readRequiredAddress(networkJson, networkKey, ".IMPLEMENTATIONS.COLLATERAL_VAULT");
        address expectedStreamingEscrowImpl =
            _readRequiredAddress(networkJson, networkKey, ".IMPLEMENTATIONS.STREAMING_ESCROW");

        require(factory.registryCommunityTemplate() == expectedCommunityImpl, "factory registryCommunityTemplate mismatch");
        require(factory.strategyTemplate() == expectedStrategyImpl, "factory strategyTemplate mismatch");
        require(factory.collateralVaultTemplate() == expectedCollateralVaultImpl, "factory collateralVaultTemplate mismatch");
        require(
            factory.streamingEscrowFactory() == _readOptionalAddress(networkJson, networkKey, ".ENVS.STREAMING_ESCROW_FACTORY"),
            "factory streamingEscrowFactory mismatch"
        );
        require(
            factory.globalPauseController() == _readOptionalAddress(networkJson, networkKey, ".ENVS.PAUSE_CONTROLLER"),
            "factory globalPauseController mismatch"
        );

        _verifyConfiguredCode(expectedCommunityImpl, "registry community implementation");
        _verifyConfiguredCode(expectedStrategyImpl, "strategy implementation");
        _verifyConfiguredCode(expectedCollateralVaultImpl, "collateral vault implementation");
        _verifyConfiguredCode(_readRequiredAddress(networkJson, networkKey, ".IMPLEMENTATIONS.PAUSE_CONTROLLER"), "pause controller implementation");
        _verifyConfiguredCode(
            _readRequiredAddress(networkJson, networkKey, ".IMPLEMENTATIONS.STREAMING_ESCROW_FACTORY"),
            "streaming escrow factory implementation"
        );
        _verifyConfiguredCode(expectedStreamingEscrowImpl, "streaming escrow implementation");

        _verifyFactoryCuts(factory, networkJson, networkKey);
        address[] memory communityProxies =
            _verifyProxyFleet(networkJson, networkKey, ".PROXIES.REGISTRY_COMMUNITIES", expectedCommunityImpl, "community");
        address[] memory strategyProxies =
            _verifyProxyFleet(networkJson, networkKey, ".PROXIES.CV_STRATEGIES", expectedStrategyImpl, "strategy");
        _verifyExpectedCutSelectors(factory, communityProxies, strategyProxies);

        address streamingEscrowFactory = _readOptionalAddress(networkJson, networkKey, ".ENVS.STREAMING_ESCROW_FACTORY");
        if (streamingEscrowFactory != address(0)) {
            address liveEscrowImplementation =
                abi.decode(_staticCall(streamingEscrowFactory, abi.encodeWithSignature("escrowImplementation()")), (address));
            require(liveEscrowImplementation == expectedStreamingEscrowImpl, "streaming escrow implementation mismatch");
        }
    }

    function _verifyExpectedCutSelectors(
        RegistryFactory factory,
        address[] memory communityProxies,
        address[] memory strategyProxies
    ) internal view {
        if (communityProxies.length != 0) {
            (IDiamondCut.FacetCut[] memory communityCuts,,) = factory.getCommunityFacets();
            _verifyDiamondSelectorRouting(communityProxies[0], communityCuts, "community");
        }

        if (strategyProxies.length != 0) {
            (IDiamondCut.FacetCut[] memory strategyCuts,,) = factory.getStrategyFacets();
            _verifyDiamondSelectorRouting(strategyProxies[0], strategyCuts, "strategy");
        }
    }

    function _verifyDiamondSelectorRouting(address proxy, IDiamondCut.FacetCut[] memory cuts, string memory label)
        internal
        view
    {
        require(proxy.code.length > 0, string.concat(label, " proxy has no code"));

        for (uint256 i = 0; i < cuts.length; i++) {
            address expectedFacet = cuts[i].facetAddress;
            bytes4[] memory selectors = cuts[i].functionSelectors;

            for (uint256 j = 0; j < selectors.length; j++) {
                bytes4 selector = selectors[j];
                address resolvedFacet =
                    abi.decode(_staticCall(proxy, abi.encodeCall(IDiamondLoupe.facetAddress, (selector))), (address));
                require(resolvedFacet == expectedFacet, string.concat(label, " selector facet mismatch"));
            }
        }
    }

    function _verifyFactoryCuts(RegistryFactory factory, string memory networkJson, string memory networkKey) internal view {
        (IDiamondCut.FacetCut[] memory communityCuts, address communityInit, bytes memory communityInitCalldata) =
            factory.getCommunityFacets();
        (IDiamondCut.FacetCut[] memory strategyCuts, address strategyInit, bytes memory strategyInitCalldata) =
            factory.getStrategyFacets();

        require(communityInit == _readRequiredAddress(networkJson, networkKey, ".INITS.REGISTRY_COMMUNITY_DIAMOND_INIT"), "community init mismatch");
        require(strategyInit == _readRequiredAddress(networkJson, networkKey, ".INITS.CV_STRATEGY_DIAMOND_INIT"), "strategy init mismatch");
        require(
            keccak256(communityInitCalldata) == keccak256(abi.encodeCall(RegistryCommunityDiamondInit.init, ())),
            "community init calldata mismatch"
        );
        require(
            keccak256(strategyInitCalldata) == keccak256(abi.encodeCall(CVStrategyDiamondInit.init, ())),
            "strategy init calldata mismatch"
        );

        address[7] memory communityExpectedFacets = [
            _readFacetAddress(networkJson, networkKey, ".FACETS.COMMUNITY_DIAMOND_LOUPE"),
            _readRequiredAddress(networkJson, networkKey, ".FACETS.COMMUNITY_ADMIN"),
            _readRequiredAddress(networkJson, networkKey, ".FACETS.COMMUNITY_MEMBER"),
            _readRequiredAddress(networkJson, networkKey, ".FACETS.COMMUNITY_PAUSE"),
            _readRequiredAddress(networkJson, networkKey, ".FACETS.COMMUNITY_POOL"),
            _readRequiredAddress(networkJson, networkKey, ".FACETS.COMMUNITY_POWER"),
            _readRequiredAddress(networkJson, networkKey, ".FACETS.COMMUNITY_STRATEGY")
        ];
        address[9] memory strategyExpectedFacets = [
            _readFacetAddress(networkJson, networkKey, ".FACETS.STRATEGY_DIAMOND_LOUPE"),
            _readRequiredAddress(networkJson, networkKey, ".FACETS.CV_ADMIN"),
            _readRequiredAddress(networkJson, networkKey, ".FACETS.CV_ALLOCATION"),
            _readRequiredAddress(networkJson, networkKey, ".FACETS.CV_DISPUTE"),
            _readRequiredAddress(networkJson, networkKey, ".FACETS.CV_PAUSE"),
            _readRequiredAddress(networkJson, networkKey, ".FACETS.CV_POWER"),
            _readRequiredAddress(networkJson, networkKey, ".FACETS.CV_PROPOSAL"),
            _readRequiredAddress(networkJson, networkKey, ".FACETS.CV_SYNC_POWER"),
            _readRequiredAddress(networkJson, networkKey, ".FACETS.CV_STREAMING")
        ];

        require(communityCuts.length == communityExpectedFacets.length, "community cut count mismatch");
        require(strategyCuts.length == strategyExpectedFacets.length, "strategy cut count mismatch");

        for (uint256 i = 0; i < communityExpectedFacets.length; i++) {
            address expectedFacet = communityExpectedFacets[i];
            require(communityCuts[i].facetAddress == expectedFacet, "community facet mismatch");
            require(communityCuts[i].functionSelectors.length > 0, "community facet selectors missing");
            _verifyConfiguredCode(expectedFacet, "community facet");
        }

        for (uint256 i = 0; i < strategyExpectedFacets.length; i++) {
            address expectedFacet = strategyExpectedFacets[i];
            require(strategyCuts[i].facetAddress == expectedFacet, "strategy facet mismatch");
            require(strategyCuts[i].functionSelectors.length > 0, "strategy facet selectors missing");
            _verifyConfiguredCode(expectedFacet, "strategy facet");
        }
    }

    function _readFacetAddress(string memory networkJson, string memory networkKey, string memory specificSuffix)
        internal
        view
        returns (address)
    {
        address specific = _readOptionalAddress(networkJson, networkKey, specificSuffix);
        if (specific == address(0)) {
            if (_hasSuffix(specificSuffix, "COMMUNITY_DIAMOND_LOUPE")) {
                specific = _readOptionalAddress(networkJson, networkKey, ".FACETS.DIAMOND_LOUPE");
            } else if (_hasSuffix(specificSuffix, "STRATEGY_DIAMOND_LOUPE")) {
                specific = _readOptionalAddress(networkJson, networkKey, ".FACETS.DIAMOND_LOUPE");
            }
        }

        require(specific != address(0), "required facet address missing");
        return specific;
    }

    function _hasSuffix(string memory value, string memory suffix) internal pure returns (bool) {
        bytes memory valueBytes = bytes(value);
        bytes memory suffixBytes = bytes(suffix);

        if (suffixBytes.length > valueBytes.length) {
            return false;
        }

        uint256 offset = valueBytes.length - suffixBytes.length;
        for (uint256 i = 0; i < suffixBytes.length; i++) {
            if (valueBytes[offset + i] != suffixBytes[i]) {
                return false;
            }
        }
        return true;
    }

    function _verifyProxyFleet(
        string memory networkJson,
        string memory networkKey,
        string memory proxyArrayKey,
        address expectedImplementation,
        string memory label
    ) internal view returns (address[] memory proxies) {
        proxies = networkJson.readAddressArray(string.concat(networkKey, proxyArrayKey));
        for (uint256 i = 0; i < proxies.length; i++) {
            require(proxies[i].code.length > 0, string.concat(label, " proxy has no code"));
            require(_implementationOf(proxies[i]) == expectedImplementation, string.concat(label, " implementation mismatch"));
        }
    }

    function _verifyOptionalProxyImplementation(
        RegistryFactory factory,
        string memory networkJson,
        string memory networkKey,
        string memory implementationKey,
        string memory label
    ) internal view {
        address expectedImplementation = _readOptionalAddress(networkJson, networkKey, implementationKey);
        if (expectedImplementation == address(0)) {
            return;
        }

        require(_implementationOf(address(factory)) == expectedImplementation, string.concat(label, " implementation mismatch"));
        _verifyConfiguredCode(expectedImplementation, string.concat(label, " implementation"));
    }

    function _verifyOptionalProxyImplementationFromEnv(
        string memory networkJson,
        string memory networkKey,
        string memory envKey,
        string memory implementationKey,
        string memory label
    ) internal view {
        address proxy = _readOptionalAddress(networkJson, networkKey, envKey);
        address expectedImplementation = _readOptionalAddress(networkJson, networkKey, implementationKey);

        if (proxy == address(0) || expectedImplementation == address(0)) {
            return;
        }

        require(proxy.code.length > 0, string.concat(label, " proxy has no code"));
        require(_implementationOf(proxy) == expectedImplementation, string.concat(label, " implementation mismatch"));
        _verifyConfiguredCode(expectedImplementation, string.concat(label, " implementation"));
    }

    function _verifyConfiguredCode(address target, string memory label) internal view {
        require(target != address(0), string.concat(label, " is zero"));
        require(target.code.length > 0, string.concat(label, " has no code"));
    }

    function _staticCall(address target, bytes memory data) internal view returns (bytes memory result) {
        (bool ok, bytes memory returndata) = target.staticcall(data);
        require(ok, "staticcall failed");
        return returndata;
    }

    function _implementationOf(address proxy) internal view returns (address implementation) {
        bytes32 raw = vm.load(proxy, EIP1967_IMPLEMENTATION_SLOT);
        implementation = address(uint160(uint256(raw)));
    }

    function _readRequiredAddress(string memory networkJson, string memory networkKey, string memory suffix)
        internal
        view
        returns (address)
    {
        address value = networkJson.readAddress(string.concat(networkKey, suffix));
        require(value != address(0), "required config address missing");
        return value;
    }

    function _readOptionalAddress(string memory networkJson, string memory networkKey, string memory suffix)
        internal
        view
        returns (address)
    {
        bytes memory raw = vm.parseJson(networkJson, string.concat(networkKey, suffix));
        if (raw.length == 0) {
            return address(0);
        }
        return abi.decode(raw, (address));
    }

    function _networkKey(string memory network) internal pure returns (string memory) {
        return string.concat("$.networks[?(@.name=='", network, "')]");
    }

    function _readNetworksJson() internal view returns (string memory) {
        string memory root = vm.projectRoot();
        return vm.readFile(string.concat(root, "/pkg/contracts/config/networks.json"));
    }
}

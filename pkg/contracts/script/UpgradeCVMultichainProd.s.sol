// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./BaseMultiChain.s.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {CVAdminFacet} from "../src/CVStrategy/facets/CVAdminFacet.sol";
import {CVAllocationFacet} from "../src/CVStrategy/facets/CVAllocationFacet.sol";
import {CVDisputeFacet} from "../src/CVStrategy/facets/CVDisputeFacet.sol";
import {CVPauseFacet} from "../src/CVStrategy/facets/CVPauseFacet.sol";
import {CVPowerFacet} from "../src/CVStrategy/facets/CVPowerFacet.sol";
import {CVProposalFacet} from "../src/CVStrategy/facets/CVProposalFacet.sol";
import {CVSyncPowerFacet} from "../src/CVStrategy/facets/CVSyncPowerFacet.sol";
import {CVStrategyDiamondInit} from "../src/CVStrategy/CVStrategyDiamondInit.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {CommunityAdminFacet} from "../src/RegistryCommunity/facets/CommunityAdminFacet.sol";
import {CommunityMemberFacet} from "../src/RegistryCommunity/facets/CommunityMemberFacet.sol";
import {CommunityPauseFacet} from "../src/RegistryCommunity/facets/CommunityPauseFacet.sol";
import {CommunityPoolFacet} from "../src/RegistryCommunity/facets/CommunityPoolFacet.sol";
import {CommunityPowerFacet} from "../src/RegistryCommunity/facets/CommunityPowerFacet.sol";
import {CommunityStrategyFacet} from "../src/RegistryCommunity/facets/CommunityStrategyFacet.sol";
import {RegistryCommunityDiamondInit} from "../src/RegistryCommunity/RegistryCommunityDiamondInit.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {ICVStrategy} from "../src/CVStrategy/ICVStrategy.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";
import {DiamondLoupeFacet} from "../src/diamonds/facets/DiamondLoupeFacet.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {StrategyDiamondConfiguratorBase} from "../test/helpers/StrategyDiamondConfigurator.sol";
import {CommunityDiamondConfiguratorBase} from "../test/helpers/CommunityDiamondConfigurator.sol";

contract UpgradeCVMultichainProd is BaseMultiChain, StrategyDiamondConfiguratorBase, CommunityDiamondConfiguratorBase {
    using stdJson for string;

    struct JsonWriter {
        string path;
        bool hasEntries;
    }

    struct FacetCuts {
        IDiamond.FacetCut[] cvCuts;
        IDiamond.FacetCut[] communityCuts;
    }

    struct UpgradeContext {
        address registryFactoryImplementation;
        address registryImplementation;
        address strategyImplementation;
        address registryFactoryProxy;
        address safeOwner;
        address pauseController;
        IDiamond.FacetCut[] cvCuts;
        IDiamond.FacetCut[] communityCuts;
        IDiamond.FacetCut[] upgradedCommunityCuts;
        JsonWriter writer;
    }

    function runCurrentNetwork(string memory networkJson) public override {
        UpgradeContext memory context;
        context.registryFactoryImplementation = address(new RegistryFactory());
        context.registryImplementation = address(new RegistryCommunity());
        context.strategyImplementation = address(new CVStrategy());
        // address passportScorer = networkJson.readAddress(getKeyNetwork(".ENVS.PASSPORT_SCORER"));
        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        context.pauseController = networkJson.readAddress(getKeyNetwork(".ENVS.PAUSE_CONTROLLER"));
        if (context.pauseController == address(0)) {
            revert("PAUSE_CONTROLLER not set in networks.json");
        }
        context.safeOwner = ProxyOwner(proxyOwner).owner();

        FacetCuts memory facetCuts = _buildFacetCuts();
        context.cvCuts = facetCuts.cvCuts;
        context.communityCuts = facetCuts.communityCuts;
        context.upgradedCommunityCuts = _buildUpgradedCommunityFacetCuts();

        context.writer = _initPayloadWriter(context.safeOwner, networkJson);

        // 1. REGISTRY FACTORY UPGRADE
        context.registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        context = _writeRegistryFactoryUpgrades(context);

        // 2. REGISTRY COMMUNITIES UPGRADES
        context = _writeCommunityUpgrades(context, networkJson);

        // 3. CV STRATEGIES UPGRADES
        context = _writeStrategyUpgrades(context, networkJson);

        _finalizePayload(context.writer, context.safeOwner, context.registryFactoryProxy, networkJson);
    }

    function _writeRegistryFactoryUpgrades(UpgradeContext memory context)
        internal
        returns (UpgradeContext memory)
    {
        RegistryFactory registryFactory = RegistryFactory(payable(address(context.registryFactoryProxy)));

        bytes memory upgradeRegistryFactory = abi.encodeWithSelector(
            registryFactory.upgradeTo.selector, context.registryFactoryImplementation
        );
        context.writer = _appendTransaction(
            context.writer, _createTransactionJson(context.registryFactoryProxy, upgradeRegistryFactory)
        );

        bytes memory setCommunityFacets = abi.encodeWithSelector(
            registryFactory.setCommunityFacets.selector,
            context.communityCuts,
            address(new RegistryCommunityDiamondInit()),
            abi.encodeCall(RegistryCommunityDiamondInit.init, ())
        );
        context.writer = _appendTransaction(
            context.writer, _createTransactionJson(context.registryFactoryProxy, setCommunityFacets)
        );
        bytes memory setStrategyFacets = abi.encodeWithSelector(
            registryFactory.setStrategyFacets.selector,
            context.cvCuts,
            address(new CVStrategyDiamondInit()),
            abi.encodeCall(CVStrategyDiamondInit.init, ())
        );
        context.writer = _appendTransaction(
            context.writer, _createTransactionJson(context.registryFactoryProxy, setStrategyFacets)
        );

        bytes memory setGlobalPauseController = abi.encodeWithSelector(
            registryFactory.setGlobalPauseController.selector, context.pauseController
        );
        context.writer = _appendTransaction(
            context.writer, _createTransactionJson(context.registryFactoryProxy, setGlobalPauseController)
        );

        bytes memory setRegistryCommunityTemplate = abi.encodeWithSelector(
            registryFactory.setRegistryCommunityTemplate.selector, context.registryImplementation
        );
        context.writer = _appendTransaction(
            context.writer, _createTransactionJson(context.registryFactoryProxy, setRegistryCommunityTemplate)
        );

        bytes memory setStrategyTemplate = abi.encodeWithSelector(
            registryFactory.setStrategyTemplate.selector, context.strategyImplementation
        );
        context.writer = _appendTransaction(
            context.writer, _createTransactionJson(context.registryFactoryProxy, setStrategyTemplate)
        );

        return context;
    }

    function _writeCommunityUpgrades(UpgradeContext memory context, string memory networkJson)
        internal
        returns (UpgradeContext memory)
    {
        address[] memory registryCommunityProxies =
            networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        bytes[] memory registryTransactions = new bytes[](registryCommunityProxies.length * 3);
        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            (registryTransactions[i * 3], registryTransactions[i * 3 + 1], registryTransactions[i * 3 + 2]) =
                _upgradeRegistryCommunity(
                    registryCommunityProxies[i],
                    context.registryImplementation,
                    context.strategyImplementation,
                    context.cvCuts
                );
        }
        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            context.writer = _appendTransaction(
                context.writer, _createTransactionJson(registryCommunityProxies[i], registryTransactions[i * 3])
            );
            context.writer = _appendTransaction(
                context.writer, _createTransactionJson(registryCommunityProxies[i], registryTransactions[i * 3 + 1])
            );
            context.writer = _appendTransaction(
                context.writer, _createTransactionJson(registryCommunityProxies[i], registryTransactions[i * 3 + 2])
            );
            if (context.upgradedCommunityCuts.length > 0) {
                bytes memory communityDiamondCut = abi.encodeWithSelector(
                    RegistryCommunity.diamondCut.selector,
                    context.upgradedCommunityCuts,
                    address(new RegistryCommunityDiamondInit()),
                    abi.encodeCall(RegistryCommunityDiamondInit.init, ())
                );
                context.writer = _appendTransaction(
                    context.writer, _createTransactionJson(registryCommunityProxies[i], communityDiamondCut)
                );
            }
        }

        return context;
    }

    function _writeStrategyUpgrades(UpgradeContext memory context, string memory networkJson)
        internal
        returns (UpgradeContext memory)
    {
        address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        bytes[] memory upgradeCVStrategies = new bytes[](cvStrategyProxies.length);
        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            upgradeCVStrategies[i] = _upgradeCVStrategy(cvStrategyProxies[i], context.strategyImplementation);
        }
        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            context.writer = _appendTransaction(
                context.writer, _createTransactionJson(cvStrategyProxies[i], upgradeCVStrategies[i])
            );
        }

        return context;
    }

    function _finalizePayload(
        JsonWriter memory writer,
        address safeOwner,
        address registryFactoryProxy,
        string memory networkJson
    ) internal {
        console2.log("Upgraded Registry Factory: %s", registryFactoryProxy);
        console2.log(
            "Upgraded Registry Communities: %s",
            networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES")).length
        );
        console2.log(
            "Upgraded CV Strategies: %s", networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES")).length
        );

        _finalizePayloadWriter(writer);
        console2.log("Wrote %s", writer.path);
    }

    function _removeLastChar(string memory input) internal pure returns (string memory) {
        bytes memory inputBytes = bytes(input);
        require(inputBytes.length > 0, "String is empty");
        // Create a new bytes array with one less length
        bytes memory trimmedBytes = new bytes(inputBytes.length - 1);
        for (uint256 i = 0; i < inputBytes.length - 1; i++) {
            trimmedBytes[i] = inputBytes[i];
        }
        return string(trimmedBytes);
    }

    function _upgradeRegistryCommunity(
        address registryProxy,
        address registryImplementation,
        address strategyImplementation,
        IDiamond.FacetCut[] memory cvCuts
    ) internal returns (bytes memory, bytes memory, bytes memory) {
        RegistryCommunity registryCommunity = RegistryCommunity(payable(registryProxy));
        bytes memory upgradeRegistryCommunity =
            abi.encodeWithSelector(registryCommunity.upgradeTo.selector, registryImplementation);
        bytes memory setStrategyTemplateCommunity =
            abi.encodeWithSelector(registryCommunity.setStrategyTemplate.selector, strategyImplementation);
        bytes memory setStrategyFacets = abi.encodeWithSelector(
            registryCommunity.setStrategyFacets.selector,
            cvCuts,
            address(new CVStrategyDiamondInit()),
            abi.encodeCall(CVStrategyDiamondInit.init, ())
        );

        return (upgradeRegistryCommunity, setStrategyTemplateCommunity, setStrategyFacets);
    }

    function _upgradeCVStrategy(address _cvStrategyProxy, address _strategyImplementation)
        internal
        view
        returns (bytes memory)
    {
        CVStrategy cvStrategy = CVStrategy(payable(_cvStrategyProxy));
        return abi.encodeWithSelector(cvStrategy.upgradeTo.selector, _strategyImplementation);
    }

    function _buildUpgradedCommunityFacetCuts() internal returns (IDiamond.FacetCut[] memory cuts) {
        CommunityPoolFacet communityPoolFacet = new CommunityPoolFacet();
        bytes4[] memory poolSelectors = new bytes4[](2);
        poolSelectors[0] = bytes4(
            keccak256(
                "createPool(address,((uint256,uint256,uint256,uint256),uint8,uint8,(uint256),(address,address,uint256,uint256,uint256,uint256),address,address,address,uint256,address[],address,uint256),(uint256,string))"
            )
        );
        poolSelectors[1] = bytes4(
            keccak256(
                "createPool(address,address,((uint256,uint256,uint256,uint256),uint8,uint8,(uint256),(address,address,uint256,uint256,uint256,uint256),address,address,address,uint256,address[],address,uint256),(uint256,string))"
            )
        );
        cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(communityPoolFacet),
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: poolSelectors
        });
    }

    function _buildUpgradedStrategyFacetCuts() internal returns (IDiamond.FacetCut[] memory cuts) {
        cuts = new IDiamond.FacetCut[](0);
    }

    function _buildFacetCuts() internal returns (FacetCuts memory cuts) {
        CVAdminFacet cvAdminFacet = new CVAdminFacet();
        CVAllocationFacet cvAllocationFacet = new CVAllocationFacet();
        CVDisputeFacet cvDisputeFacet = new CVDisputeFacet();
        CVPauseFacet cvPauseFacet = new CVPauseFacet();
        CVPowerFacet cvPowerFacet = new CVPowerFacet();
        CVProposalFacet cvProposalFacet = new CVProposalFacet();
        CVSyncPowerFacet cvSyncPowerFacet = new CVSyncPowerFacet();

        CommunityAdminFacet communityAdminFacet = new CommunityAdminFacet();
        CommunityMemberFacet communityMemberFacet = new CommunityMemberFacet();
        CommunityPauseFacet communityPauseFacet = new CommunityPauseFacet();
        CommunityPoolFacet communityPoolFacet = new CommunityPoolFacet();
        CommunityPowerFacet communityPowerFacet = new CommunityPowerFacet();
        CommunityStrategyFacet communityStrategyFacet = new CommunityStrategyFacet();

        DiamondLoupeFacet loupeFacet = new DiamondLoupeFacet();

        cuts.cvCuts = _buildCVFacetCuts(
            cvAdminFacet,
            cvAllocationFacet,
            cvDisputeFacet,
            cvPauseFacet,
            cvPowerFacet,
            cvProposalFacet,
            cvSyncPowerFacet,
            loupeFacet
        );
        cuts.communityCuts = _buildCommunityFacetCuts(
            communityAdminFacet,
            communityMemberFacet,
            communityPauseFacet,
            communityPoolFacet,
            communityPowerFacet,
            communityStrategyFacet,
            loupeFacet
        );
    }

    function _buildCVFacetCuts(
        CVAdminFacet cvAdminFacet,
        CVAllocationFacet cvAllocationFacet,
        CVDisputeFacet cvDisputeFacet,
        CVPauseFacet cvPauseFacet,
        CVPowerFacet cvPowerFacet,
        CVProposalFacet cvProposalFacet,
        CVSyncPowerFacet cvSyncPowerFacet,
        DiamondLoupeFacet loupeFacet
    ) internal pure returns (IDiamond.FacetCut[] memory cuts) {
        IDiamond.FacetCut[] memory baseCuts =
            _buildFacetCuts(
                cvAdminFacet,
                cvAllocationFacet,
                cvDisputeFacet,
                cvPauseFacet,
                cvPowerFacet,
                cvProposalFacet,
                cvSyncPowerFacet
            );
        cuts = new IDiamond.FacetCut[](8);
        cuts[0] = _buildLoupeFacetCut(loupeFacet);
        for (uint256 i = 0; i < 7; i++) {
            cuts[i + 1] = baseCuts[i];
        }
    }

    function _buildCommunityFacetCuts(
        CommunityAdminFacet communityAdminFacet,
        CommunityMemberFacet communityMemberFacet,
        CommunityPauseFacet communityPauseFacet,
        CommunityPoolFacet communityPoolFacet,
        CommunityPowerFacet communityPowerFacet,
        CommunityStrategyFacet communityStrategyFacet,
        DiamondLoupeFacet loupeFacet
    ) internal pure returns (IDiamond.FacetCut[] memory cuts) {
        IDiamond.FacetCut[] memory baseCuts = CommunityDiamondConfiguratorBase._buildFacetCuts(
            communityAdminFacet,
            communityMemberFacet,
            communityPauseFacet,
            communityPoolFacet,
            communityPowerFacet,
            communityStrategyFacet
        );
        cuts = new IDiamond.FacetCut[](7);
        cuts[0] = _buildLoupeFacetCut(loupeFacet);
        for (uint256 i = 0; i < 6; i++) {
            cuts[i + 1] = baseCuts[i];
        }
    }

    function _buildLoupeFacetCut(DiamondLoupeFacet _loupeFacet)
        internal
        pure
        override(StrategyDiamondConfiguratorBase, CommunityDiamondConfiguratorBase)
        returns (IDiamond.FacetCut memory)
    {
        bytes4[] memory loupeSelectors = new bytes4[](5);
        loupeSelectors[0] = IDiamondLoupe.facets.selector;
        loupeSelectors[1] = IDiamondLoupe.facetFunctionSelectors.selector;
        loupeSelectors[2] = IDiamondLoupe.facetAddresses.selector;
        loupeSelectors[3] = IDiamondLoupe.facetAddress.selector;
        loupeSelectors[4] = IERC165.supportsInterface.selector;
        return IDiamond.FacetCut({
            facetAddress: address(_loupeFacet), action: IDiamond.FacetCutAction.Auto, functionSelectors: loupeSelectors
        });
    }

    function _initPayloadWriter(address safeOwner, string memory networkJson)
        internal
        returns (JsonWriter memory writer)
    {
        vm.createDir("transaction-builder", true);
        writer.path = string.concat(
            vm.projectRoot(), "/pkg/contracts/transaction-builder/", CURRENT_NETWORK, "-payload.json"
        );
        string memory payloadHeader = string.concat(
            "{",
            '"version":"1.0",',
            '"chainId":"',
            vm.toString(block.chainid),
            '",',
            '"createdAt":',
            vm.toString(block.timestamp * 1000),
            ",",
            '"meta":{',
            '"name":"Contracts Upgrades Batch",',
            '"description":"Safe Transaction Builder payload to upgrade contracts from Safe owner",',
            '"txBuilderVersion":"1.18.0",',
            '"createdFromSafeAddress":"',
            _addressToString(safeOwner),
            '",',
            '"createdFromOwnerAddress":"',
            _addressToString(msg.sender),
            '",',
            '"hash":"',
            networkJson.readString(getKeyNetwork(".hash")),
            '"},',
            '"transactions":['
        );
        vm.writeFile(writer.path, payloadHeader);
    }

    function _appendTransaction(JsonWriter memory writer, string memory transactionJson)
        internal
        returns (JsonWriter memory)
    {
        string memory entry = writer.hasEntries ? string.concat(",", transactionJson) : transactionJson;
        vm.writeLine(writer.path, entry);
        writer.hasEntries = true;
        return writer;
    }

    function _finalizePayloadWriter(JsonWriter memory writer) internal {
        vm.writeLine(writer.path, "]}");
    }

    function _createTransactionJson(address to, bytes memory data) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                '{"to":"',
                _addressToString(to),
                '","value":"0","data":"',
                _bytesToHexString(data),
                '","operation":0,"contractMethod":{"inputs":[],"name":"","payable":false},"contractInputsValues":{}}'
            )
        );
    }

    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }

    function _bytesToHexString(bytes memory _bytes) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(2 + _bytes.length * 2);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < _bytes.length; i++) {
            str[2 + i * 2] = alphabet[uint8(_bytes[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(_bytes[i] & 0x0f)];
        }
        return string(str);
    }
}

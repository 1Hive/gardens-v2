// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/StdJson.sol";

import {UpgradeCVMultichainScript as UpgradeCVMultichainRunner} from "../script/UpgradeCVMultichain.s.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {RegistryCommunity, RegistryCommunityInitializeParams} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {RegistryCommunityDiamondInit} from "../src/RegistryCommunity/RegistryCommunityDiamondInit.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {CVStrategyDiamondInit} from "../src/CVStrategy/CVStrategyDiamondInit.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Metadata} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {CommunityDiamondConfigurator} from "./helpers/CommunityDiamondConfigurator.sol";
import {StrategyDiamondConfigurator} from "./helpers/StrategyDiamondConfigurator.sol";
import {CommunityPowerFacet} from "../src/RegistryCommunity/facets/CommunityPowerFacet.sol";
import {CommunityMemberFacet} from "../src/RegistryCommunity/facets/CommunityMemberFacet.sol";
import {CVAdminFacet} from "../src/CVStrategy/facets/CVAdminFacet.sol";
import {CVAllocationFacet} from "../src/CVStrategy/facets/CVAllocationFacet.sol";
import {CVStreamingFacet} from "../src/CVStrategy/facets/CVStreamingFacet.sol";
import {MockPauseController} from "./helpers/PauseHelpers.sol";

contract MockRegistryForUpgradeScript {
    bytes32 public lastProfileId;

    function createProfile(uint256 nonce, string memory name, Metadata memory, address, address[] memory)
        external
        returns (bytes32)
    {
        lastProfileId = keccak256(abi.encodePacked(nonce, name));
        return lastProfileId;
    }
}

contract MockAlloForUpgradeScript {
    address public registry;

    constructor(address registry_) {
        registry = registry_;
    }

    function getRegistry() external view returns (address) {
        return registry;
    }
}

contract DummyCodeContract {}

contract UpgradeCVMultichainHarness is UpgradeCVMultichainRunner {
    string internal networksPath;
    mapping(bytes32 => uint8) internal flagOverrides;

    function setNetworksPath(string memory path) external {
        networksPath = path;
    }

    function setCurrentNetworkForTest(string memory network) external {
        CURRENT_NETWORK = network;
    }

    function setPhaseForTest(uint8 phase) external {
        phaseSelection = Phase(phase);
    }

    function setFactoryActionForTest(uint8 action) external {
        factoryAction = FactoryAction(action);
    }

    function executeCurrentNetworkForTest() external {
        runCurrentNetwork(getNetworkJson());
        _flushPendingNetworkWrites();
    }

    function setFlagForTest(string memory key, bool value) external {
        flagOverrides[keccak256(bytes(key))] = value ? 2 : 1;
    }

    function setFactoryStrategyFacetsForTest(
        address factoryProxy,
        IDiamondCut.FacetCut[] memory cuts,
        address init,
        bytes memory initCalldata
    ) external {
        RegistryFactory(payable(factoryProxy)).setStrategyFacets(cuts, init, initCalldata);
    }

    function computeDesiredStrategyCutsDigestForTest() external returns (bytes32) {
        FacetCuts memory facetCuts = _buildFacetCuts();
        return _facetCutsDigest(facetCuts.cvCuts);
    }

    function _networksJsonPath() internal view override returns (string memory) {
        return networksPath;
    }

    function _flagEnabled(string memory key) internal view override returns (bool) {
        uint8 overrideValue = flagOverrides[keccak256(bytes(key))];
        if (overrideValue == 1) return false;
        if (overrideValue == 2) return true;
        return super._flagEnabled(key);
    }
}

contract UpgradeCVMultichainScript is Test {
    using stdJson for string;

    string internal constant NETWORK_NAME = "script-test";

    UpgradeCVMultichainHarness internal script;
    CommunityDiamondConfigurator internal oldCommunityConfigurator;
    CommunityDiamondConfigurator internal newCommunityConfigurator;
    StrategyDiamondConfigurator internal oldStrategyConfigurator;
    StrategyDiamondConfigurator internal newStrategyConfigurator;
    RegistryFactory internal factory;
    RegistryCommunity internal community;
    CVStrategy internal strategy;

    RegistryFactory internal oldFactoryImpl;
    RegistryCommunity internal oldCommunityImpl;
    CVStrategy internal oldStrategyImpl;

    MockRegistryForUpgradeScript internal registryMock;
    MockAlloForUpgradeScript internal alloMock;
    MockPauseController internal pauseController;
    DummyCodeContract internal streamingEscrowFactory;
    DummyCodeContract internal collateralVaultTemplate;

    string internal fixturePath;

    function setUp() public {
        script = new UpgradeCVMultichainHarness();
        script.setCurrentNetworkForTest(NETWORK_NAME);

        oldCommunityConfigurator = new CommunityDiamondConfigurator();
        newCommunityConfigurator = new CommunityDiamondConfigurator();
        oldStrategyConfigurator = new StrategyDiamondConfigurator();
        newStrategyConfigurator = new StrategyDiamondConfigurator();
        registryMock = new MockRegistryForUpgradeScript();
        alloMock = new MockAlloForUpgradeScript(address(registryMock));
        pauseController = new MockPauseController();
        streamingEscrowFactory = new DummyCodeContract();
        collateralVaultTemplate = new DummyCodeContract();

        oldFactoryImpl = new RegistryFactory();
        oldCommunityImpl = new RegistryCommunity();
        oldStrategyImpl = new CVStrategy();

        factory = RegistryFactory(
            payable(
                address(
                    new ERC1967Proxy(
                        address(oldFactoryImpl),
                        abi.encodeCall(
                            RegistryFactory.initialize,
                            (
                                address(this),
                                address(this),
                                address(oldCommunityImpl),
                                address(oldStrategyImpl),
                                address(collateralVaultTemplate)
                            )
                        )
                    )
                )
            )
        );

        factory.setGlobalPauseController(address(pauseController));
        factory.setStreamingEscrowFactory(address(streamingEscrowFactory));
        factory.setCommunityFacets(
            oldCommunityConfigurator.getFacetCuts(),
            address(oldCommunityConfigurator.diamondInit()),
            abi.encodeCall(RegistryCommunityDiamondInit.init, ())
        );
        factory.setStrategyFacets(
            oldStrategyConfigurator.getFacetCuts(),
            address(oldStrategyConfigurator.diamondInit()),
            abi.encodeCall(CVStrategyDiamondInit.init, ())
        );

        RegistryCommunityInitializeParams memory params;
        params._allo = address(alloMock);
        params._gardenToken = IERC20(address(0xBEEF));
        params._registerStakeAmount = 1;
        params._communityFee = 0;
        params._nonce = 1;
        params._registryFactory = address(factory);
        params._feeReceiver = address(this);
        params._metadata = Metadata({protocol: 1, pointer: "meta"});
        params._councilSafe = payable(address(0xCAFE));
        params._communityName = "Test";
        params._isKickEnabled = false;
        params.covenantIpfsHash = "hash";

        community = RegistryCommunity(
            payable(
                address(
                    new ERC1967Proxy(
                        address(oldCommunityImpl),
                        abi.encodeCall(
                            RegistryCommunity.initialize,
                            (params, address(oldStrategyImpl), address(collateralVaultTemplate), address(this))
                        )
                    )
                )
            )
        );

        strategy = CVStrategy(
            payable(
                address(
                    new ERC1967Proxy(
                        address(oldStrategyImpl),
                        abi.encodeWithSelector(
                            CVStrategy.init.selector, address(alloMock), address(collateralVaultTemplate), address(this)
                        )
                    )
                )
            )
        );
        IDiamondCut(address(strategy)).diamondCut(
            oldStrategyConfigurator.getFacetCuts(),
            address(oldStrategyConfigurator.diamondInit()),
            abi.encodeCall(CVStrategyDiamondInit.init, ())
        );

        factory.transferOwnership(address(script));
        community.transferOwnership(address(script));
        strategy.transferOwnership(address(script));

        vm.createDir(string.concat(vm.projectRoot(), "/pkg/contracts/test/tmp"), true);
    }

    function test_runCurrentNetwork_all_upgrades_and_updates_config() public {
        _useFixture("all");
        _setDefaultScriptEnv();
        _writeFixtureJson(address(oldFactoryImpl), address(oldCommunityImpl), address(oldStrategyImpl), address(0), address(0));

        script.setPhaseForTest(0);
        script.setFactoryActionForTest(0);
        script.executeCurrentNetworkForTest();

        string memory updated = vm.readFile(fixturePath);

        address factoryImpl = updated.readAddress("$.networks[0].IMPLEMENTATIONS.REGISTRY_FACTORY");
        address communityImpl = updated.readAddress("$.networks[0].IMPLEMENTATIONS.REGISTRY_COMMUNITY");
        address strategyImpl = updated.readAddress("$.networks[0].IMPLEMENTATIONS.CV_STRATEGY");
        address communityInit = updated.readAddress("$.networks[0].INITS.REGISTRY_COMMUNITY_DIAMOND_INIT");
        address strategyInit = updated.readAddress("$.networks[0].INITS.CV_STRATEGY_DIAMOND_INIT");

        assertEq(_implementation(address(factory)), factoryImpl);
        assertEq(_implementation(address(community)), communityImpl);
        assertEq(_implementation(address(strategy)), strategyImpl);
        assertEq(factory.registryCommunityTemplate(), communityImpl);
        assertEq(factory.strategyTemplate(), strategyImpl);
        assertEq(community.strategyTemplate(), strategyImpl);

        (, address liveCommunityInit,) = factory.getCommunityFacets();
        (, address liveStrategyInit,) = factory.getStrategyFacets();
        assertEq(liveCommunityInit, communityInit);
        assertEq(liveStrategyInit, strategyInit);

        assertEq(
            IDiamondLoupe(address(community)).facetAddress(CommunityPowerFacet.ercAddress.selector),
            updated.readAddress("$.networks[0].FACETS.COMMUNITY_POWER")
        );
        assertEq(
            IDiamondLoupe(address(strategy)).facetAddress(CVAdminFacet.setVotingPowerRegistry.selector),
            updated.readAddress("$.networks[0].FACETS.CV_ADMIN")
        );
        assertEq(
            IDiamondLoupe(address(strategy)).facetAddress(CVStreamingFacet.isAuthorizedRebalanceCaller.selector),
            updated.readAddress("$.networks[0].FACETS.CV_STREAMING")
        );
        assertEq(
            IDiamondLoupe(address(strategy)).facetAddress(CVStreamingFacet.setAuthorizedRebalanceCaller.selector),
            updated.readAddress("$.networks[0].FACETS.CV_STREAMING")
        );
        _assertFactoryStrategyCutsIncludeSelector(CVStreamingFacet.isAuthorizedRebalanceCaller.selector);
    }

    function test_runCurrentNetwork_respects_skip_flags() public {
        _useFixture("skip-flags");
        _setDefaultScriptEnv();
        _writeFixtureJson(address(oldFactoryImpl), address(oldCommunityImpl), address(oldStrategyImpl), address(0), address(0));

        script.setPhaseForTest(0);
        script.setFactoryActionForTest(0);
        script.setFlagForTest("SKIP_COMMUNITY_UPGRADE_TO", true);
        script.setFlagForTest("SKIP_COMMUNITY_STRATEGY_TEMPLATE", true);
        script.setFlagForTest("SKIP_STRATEGY_UPGRADE_TO", true);
        script.setFlagForTest("SKIP_STRATEGY_DIAMOND_CUT", true);
        script.executeCurrentNetworkForTest();

        string memory updated = vm.readFile(fixturePath);
        address factoryImpl = updated.readAddress("$.networks[0].IMPLEMENTATIONS.REGISTRY_FACTORY");
        address syncedCommunityImpl = updated.readAddress("$.networks[0].IMPLEMENTATIONS.REGISTRY_COMMUNITY");
        address syncedStrategyImpl = updated.readAddress("$.networks[0].IMPLEMENTATIONS.CV_STRATEGY");

        assertEq(_implementation(address(factory)), factoryImpl);
        assertEq(_implementation(address(community)), address(oldCommunityImpl));
        assertEq(_implementation(address(strategy)), address(oldStrategyImpl));
        assertEq(syncedCommunityImpl, address(oldCommunityImpl));
        assertEq(syncedStrategyImpl, address(oldStrategyImpl));
        assertEq(community.strategyTemplate(), address(oldStrategyImpl));
        assertTrue(factory.registryCommunityTemplate() != address(oldCommunityImpl));
        assertTrue(factory.strategyTemplate() != address(oldStrategyImpl));
    }

    function test_runCurrentNetwork_reuses_configured_implementations_and_inits() public {
        _useFixture("reuse-configured");
        _setDefaultScriptEnv();
        RegistryFactory configuredFactoryImpl = new RegistryFactory();
        RegistryCommunity configuredCommunityImpl = new RegistryCommunity();
        CVStrategy configuredStrategyImpl = new CVStrategy();

        _writeFixtureJson(
            address(configuredFactoryImpl),
            address(configuredCommunityImpl),
            address(configuredStrategyImpl),
            address(newCommunityConfigurator.diamondInit()),
            address(newStrategyConfigurator.diamondInit())
        );

        script.setPhaseForTest(0);
        script.setFactoryActionForTest(0);
        script.setFlagForTest("REUSE_CONFIGURED_IMPLEMENTATIONS", true);
        script.setFlagForTest("REUSE_CONFIGURED_INITS", true);
        script.executeCurrentNetworkForTest();

        string memory updated = vm.readFile(fixturePath);
        assertEq(updated.readAddress("$.networks[0].IMPLEMENTATIONS.REGISTRY_FACTORY"), address(configuredFactoryImpl));
        assertEq(updated.readAddress("$.networks[0].IMPLEMENTATIONS.REGISTRY_COMMUNITY"), address(configuredCommunityImpl));
        assertEq(updated.readAddress("$.networks[0].IMPLEMENTATIONS.CV_STRATEGY"), address(configuredStrategyImpl));
        assertEq(updated.readAddress("$.networks[0].INITS.REGISTRY_COMMUNITY_DIAMOND_INIT"), address(newCommunityConfigurator.diamondInit()));
        assertEq(updated.readAddress("$.networks[0].INITS.CV_STRATEGY_DIAMOND_INIT"), address(newStrategyConfigurator.diamondInit()));

        assertEq(_implementation(address(factory)), address(configuredFactoryImpl));
        assertEq(_implementation(address(community)), address(configuredCommunityImpl));
        assertEq(_implementation(address(strategy)), address(configuredStrategyImpl));
    }

    function test_runCurrentNetwork_does_not_persist_network_writes_when_run_reverts() public {
        _useFixture("atomic-writes");
        _setDefaultScriptEnv();
        _writeFixtureJson(address(oldFactoryImpl), address(oldCommunityImpl), address(oldStrategyImpl), address(0), address(0));

        string memory beforeJson = vm.readFile(fixturePath);

        script.setPhaseForTest(0);
        script.setFactoryActionForTest(0);
        script.setFlagForTest("REUSE_CONFIGURED_INITS", true);

        vm.expectRevert(bytes("configured registry community init invalid"));
        script.executeCurrentNetworkForTest();

        string memory afterJson = vm.readFile(fixturePath);
        assertEq(afterJson, beforeJson);
    }

    function test_runCurrentNetwork_factory_only_updates_factory_facets_and_templates_from_snapshot() public {
        _useFixture("factory-only");
        _setDefaultScriptEnv();
        _writeFixtureJson(address(oldFactoryImpl), address(oldCommunityImpl), address(oldStrategyImpl), address(0), address(0));

        script.setPhaseForTest(1);
        script.setFactoryActionForTest(0);
        script.executeCurrentNetworkForTest();

        string memory updated = vm.readFile(fixturePath);
        address newFactoryImpl = updated.readAddress("$.networks[0].IMPLEMENTATIONS.REGISTRY_FACTORY");
        address newCommunityImpl = updated.readAddress("$.networks[0].IMPLEMENTATIONS.REGISTRY_COMMUNITY");
        address newStrategyImpl = updated.readAddress("$.networks[0].IMPLEMENTATIONS.CV_STRATEGY");

        assertEq(_implementation(address(factory)), newFactoryImpl);
        assertEq(_implementation(address(community)), address(oldCommunityImpl));
        assertEq(_implementation(address(strategy)), address(oldStrategyImpl));
        assertEq(factory.registryCommunityTemplate(), newCommunityImpl);
        assertEq(factory.strategyTemplate(), newStrategyImpl);

        (, address liveCommunityInit,) = factory.getCommunityFacets();
        (, address liveStrategyInit,) = factory.getStrategyFacets();
        assertEq(liveCommunityInit, updated.readAddress("$.networks[0].INITS.REGISTRY_COMMUNITY_DIAMOND_INIT"));
        assertEq(liveStrategyInit, updated.readAddress("$.networks[0].INITS.CV_STRATEGY_DIAMOND_INIT"));
    }

    function test_runCurrentNetwork_factory_strategy_facets_use_live_state_not_config_digest() public {
        _useFixture("factory-live-state");
        _setDefaultScriptEnv();

        IDiamondCut.FacetCut[] memory staleCuts = oldStrategyConfigurator.getFacetCuts();
        bytes4[] memory staleStreamingSelectors = new bytes4[](2);
        staleStreamingSelectors[0] = CVStreamingFacet.rebalance.selector;
        staleStreamingSelectors[1] = CVStreamingFacet.stopEscrowStream.selector;
        staleCuts[8].functionSelectors = staleStreamingSelectors;

        script.setFactoryStrategyFacetsForTest(
            address(factory),
            staleCuts,
            address(oldStrategyConfigurator.diamondInit()),
            abi.encodeCall(CVStrategyDiamondInit.init, ())
        );

        _writeFixtureJson(address(oldFactoryImpl), address(oldCommunityImpl), address(oldStrategyImpl), address(0), address(0));
        string memory desiredDigestHex = vm.toString(script.computeDesiredStrategyCutsDigestForTest());
        _writeFixtureJson(
            address(oldFactoryImpl),
            address(oldCommunityImpl),
            address(oldStrategyImpl),
            address(0),
            address(0),
            "",
            desiredDigestHex
        );

        script.setPhaseForTest(1);
        script.setFactoryActionForTest(3);
        script.executeCurrentNetworkForTest();

        _assertFactoryStrategyCutsIncludeSelector(CVStreamingFacet.setAuthorizedRebalanceCaller.selector);
        _assertFactoryStrategyCutsIncludeSelector(CVStreamingFacet.isAuthorizedRebalanceCaller.selector);
        _assertFactoryStrategyCutsIncludeSelector(CVStreamingFacet.wrapIfNeeded.selector);
    }

    function test_configurators_include_full_public_facet_surface() public view {
        IDiamondCut.FacetCut[] memory strategyCuts = newStrategyConfigurator.getFacetCuts();
        IDiamondCut.FacetCut[] memory communityCuts = newCommunityConfigurator.getFacetCuts();

        assertTrue(_cutsContainSelector(strategyCuts, CVAllocationFacet.getPoolAmount.selector));
        assertTrue(_cutsContainSelector(strategyCuts, CVStreamingFacet.wrapIfNeeded.selector));
        assertTrue(_cutsContainSelector(strategyCuts, CVStreamingFacet.setAuthorizedRebalanceCaller.selector));
        assertTrue(_cutsContainSelector(strategyCuts, CVStreamingFacet.isAuthorizedRebalanceCaller.selector));

        assertTrue(_cutsContainSelector(communityCuts, CommunityMemberFacet.registerMember.selector));
        assertTrue(_cutsContainSelector(communityCuts, CommunityPowerFacet.isRegisteredMember.selector));
    }

    function test_runCurrentNetwork_strategy_phase_only_upgrades_strategy_proxy() public {
        _useFixture("strategies-only");
        _setDefaultScriptEnv();
        _writeFixtureJson(address(oldFactoryImpl), address(oldCommunityImpl), address(oldStrategyImpl), address(0), address(0));

        script.setPhaseForTest(3);
        script.setFactoryActionForTest(0);
        script.executeCurrentNetworkForTest();

        string memory updated = vm.readFile(fixturePath);
        address newStrategyImpl = updated.readAddress("$.networks[0].IMPLEMENTATIONS.CV_STRATEGY");

        assertEq(_implementation(address(factory)), address(oldFactoryImpl));
        assertEq(_implementation(address(community)), address(oldCommunityImpl));
        assertEq(_implementation(address(strategy)), newStrategyImpl);
        assertEq(
            IDiamondLoupe(address(strategy)).facetAddress(CVAdminFacet.setVotingPowerRegistry.selector),
            updated.readAddress("$.networks[0].FACETS.CV_ADMIN")
        );
        assertEq(
            IDiamondLoupe(address(strategy)).facetAddress(CVStreamingFacet.isAuthorizedRebalanceCaller.selector),
            updated.readAddress("$.networks[0].FACETS.CV_STREAMING")
        );
    }

    function test_runCurrentNetwork_communities_phase_only_upgrades_community_proxy_and_syncs_live_impl() public {
        _useFixture("communities-only");
        _setDefaultScriptEnv();
        _writeFixtureJson(address(oldFactoryImpl), address(oldCommunityImpl), address(oldStrategyImpl), address(0), address(0));

        script.setPhaseForTest(2);
        script.setFactoryActionForTest(0);
        script.executeCurrentNetworkForTest();

        string memory updated = vm.readFile(fixturePath);
        address syncedCommunityImpl = updated.readAddress("$.networks[0].IMPLEMENTATIONS.REGISTRY_COMMUNITY");
        address syncedStrategyImpl = updated.readAddress("$.networks[0].IMPLEMENTATIONS.CV_STRATEGY");

        assertEq(_implementation(address(factory)), address(oldFactoryImpl));
        assertEq(_implementation(address(community)), syncedCommunityImpl);
        assertTrue(syncedCommunityImpl != address(oldCommunityImpl));
        assertEq(_implementation(address(strategy)), address(oldStrategyImpl));
        assertEq(syncedStrategyImpl, address(oldStrategyImpl));
        assertEq(community.strategyTemplate(), address(oldStrategyImpl));
        assertEq(
            IDiamondLoupe(address(community)).facetAddress(CommunityPowerFacet.ercAddress.selector),
            updated.readAddress("$.networks[0].FACETS.COMMUNITY_POWER")
        );
    }

    function _writeFixtureJson(
        address factoryImpl,
        address communityImpl,
        address strategyImpl,
        address communityInit,
        address strategyInit
    ) internal {
        _writeFixtureJson(factoryImpl, communityImpl, strategyImpl, communityInit, strategyInit, "", "");
    }

    function _writeFixtureJson(
        address factoryImpl,
        address communityImpl,
        address strategyImpl,
        address communityInit,
        address strategyInit,
        string memory communityCutsDigest,
        string memory strategyCutsDigest
    ) internal {
        string memory json = string.concat(
            '{"networks":[{',
            _networkMetaJson(),
            ",",
            _envsJson(),
            ",",
            _proxiesJson(),
            ",",
            _implementationsJson(factoryImpl, communityImpl, strategyImpl),
            ",",
            _initsJson(communityInit, strategyInit),
            ",",
            _factoryStateJson(communityCutsDigest, strategyCutsDigest),
            ',"FACETS":',
            _facetsJson(),
            "}]}");

        vm.writeFile(fixturePath, json);
        vm.parseJson(json);
    }

    function _useFixture(string memory label) internal {
        fixturePath = string.concat(vm.projectRoot(), "/pkg/contracts/test/tmp/upgrade-cv-multichain-", label, ".json");
        script.setNetworksPath(fixturePath);
    }

    function _setDefaultScriptEnv() internal {
        script.setFlagForTest("SKIP_PREFLIGHT", true);
        script.setFlagForTest("SKIP_NETWORK_WRITES", false);
        script.setFlagForTest("FORCE_NETWORK_WRITES", true);
        script.setFlagForTest("REUSE_CONFIGURED_IMPLEMENTATIONS", false);
        script.setFlagForTest("REUSE_CONFIGURED_INITS", false);
        script.setFlagForTest("FORCE_FACETS", false);
        script.setFlagForTest("SPLIT_FACTORY_FACETS", false);
        script.setFlagForTest("CHECK_FACTORY_IMPL", false);
        script.setFlagForTest("ESTIMATE_FACTORY_GAS", false);
        script.setFlagForTest("SKIP_COMMUNITY_UPGRADE_TO", false);
        script.setFlagForTest("SKIP_COMMUNITY_STRATEGY_TEMPLATE", false);
        script.setFlagForTest("SKIP_COMMUNITY_DIAMOND_CUT", false);
        script.setFlagForTest("COMMUNITY_DCUT_BEFORE_UPGRADE", false);
        script.setFlagForTest("SKIP_STRATEGY_UPGRADE_TO", false);
        script.setFlagForTest("SKIP_STRATEGY_DIAMOND_CUT", false);
        script.setFlagForTest("STRATEGY_DCUT_BEFORE_UPGRADE", false);
        script.setFlagForTest("SKIP_STRATEGY_DIAMOND_INIT", false);
    }

    function _networkMetaJson() internal pure returns (string memory) {
        return string.concat('"name":"', NETWORK_NAME, '","chainId":31337,"hash":"test-hash"');
    }

    function _envsJson() internal view returns (string memory) {
        return string.concat(
            '"ENVS":{"PAUSE_CONTROLLER":"',
            vm.toString(address(pauseController)),
            '","STREAMING_ESCROW_FACTORY":"',
            vm.toString(address(streamingEscrowFactory)),
            '"}'
        );
    }

    function _proxiesJson() internal view returns (string memory) {
        return string.concat(
            '"PROXIES":{"REGISTRY_FACTORY":"',
            vm.toString(address(factory)),
            '","REGISTRY_COMMUNITIES":["',
            vm.toString(address(community)),
            '"],"CV_STRATEGIES":["',
            vm.toString(address(strategy)),
            '"]}'
        );
    }

    function _implementationsJson(address factoryImpl, address communityImpl, address strategyImpl)
        internal
        view
        returns (string memory)
    {
        return string.concat(
            '"IMPLEMENTATIONS":{"REGISTRY_FACTORY":"',
            vm.toString(factoryImpl),
            '","REGISTRY_COMMUNITY":"',
            vm.toString(communityImpl),
            '","CV_STRATEGY":"',
            vm.toString(strategyImpl),
            '"}'
        );
    }

    function _initsJson(address communityInit, address strategyInit) internal view returns (string memory) {
        return string.concat(
            '"INITS":{"REGISTRY_COMMUNITY_DIAMOND_INIT":"',
            vm.toString(communityInit),
            '","CV_STRATEGY_DIAMOND_INIT":"',
            vm.toString(strategyInit),
            '"}'
        );
    }

    function _facetsJson() internal view returns (string memory) {
        return string.concat("{", _communityFacetsJson(), ",", _strategyFacetsJson(), "}");
    }

    function _factoryStateJson(string memory communityCutsDigest, string memory strategyCutsDigest)
        internal
        pure
        returns (string memory)
    {
        return string.concat(
            '"FACTORY_STATE":{"COMMUNITY_CUTS_DIGEST":"',
            communityCutsDigest,
            '","STRATEGY_CUTS_DIGEST":"',
            strategyCutsDigest,
            '"}'
        );
    }

    function _communityFacetsJson() internal view returns (string memory) {
        return string.concat(
            '"DIAMOND_LOUPE":"',
            vm.toString(address(newCommunityConfigurator.loupeFacet())),
            '","COMMUNITY_ADMIN":"',
            vm.toString(address(newCommunityConfigurator.adminFacet())),
            '","COMMUNITY_MEMBER":"',
            vm.toString(address(newCommunityConfigurator.memberFacet())),
            '","COMMUNITY_PAUSE":"',
            vm.toString(address(newCommunityConfigurator.pauseFacet())),
            '","COMMUNITY_POOL":"',
            vm.toString(address(newCommunityConfigurator.poolFacet())),
            '","COMMUNITY_POWER":"',
            vm.toString(address(newCommunityConfigurator.powerFacet())),
            '","COMMUNITY_STRATEGY":"',
            vm.toString(address(newCommunityConfigurator.strategyFacet())),
            '"'
        );
    }

    function _strategyFacetsJson() internal view returns (string memory) {
        return string.concat(
            '"CV_ADMIN":"',
            vm.toString(address(newStrategyConfigurator.adminFacet())),
            '","CV_ALLOCATION":"',
            vm.toString(address(newStrategyConfigurator.allocationFacet())),
            '","CV_DISPUTE":"',
            vm.toString(address(newStrategyConfigurator.disputeFacet())),
            '","CV_PAUSE":"',
            vm.toString(address(newStrategyConfigurator.pauseFacet())),
            '","CV_POWER":"',
            vm.toString(address(newStrategyConfigurator.powerFacet())),
            '","CV_PROPOSAL":"',
            vm.toString(address(newStrategyConfigurator.proposalFacet())),
            '","CV_SYNC_POWER":"',
            vm.toString(address(newStrategyConfigurator.syncPowerFacet())),
            '","CV_STREAMING":"',
            vm.toString(address(newStrategyConfigurator.streamingFacet())),
            '"'
        );
    }

    function _assertFactoryStrategyCutsIncludeSelector(bytes4 selector) internal view {
        (IDiamondCut.FacetCut[] memory strategyCuts,,) = factory.getStrategyFacets();
        bool found;
        for (uint256 i = 0; i < strategyCuts.length; i++) {
            for (uint256 j = 0; j < strategyCuts[i].functionSelectors.length; j++) {
                if (strategyCuts[i].functionSelectors[j] == selector) {
                    found = true;
                    break;
                }
            }
            if (found) break;
        }
        assertTrue(found);
    }

    function _cutsContainSelector(IDiamondCut.FacetCut[] memory cuts, bytes4 selector) internal pure returns (bool) {
        for (uint256 i = 0; i < cuts.length; i++) {
            for (uint256 j = 0; j < cuts[i].functionSelectors.length; j++) {
                if (cuts[i].functionSelectors[j] == selector) {
                    return true;
                }
            }
        }
        return false;
    }

    function _implementation(address proxy) internal view returns (address impl) {
        bytes32 slot = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
        impl = address(uint160(uint256(vm.load(proxy, slot))));
    }
}

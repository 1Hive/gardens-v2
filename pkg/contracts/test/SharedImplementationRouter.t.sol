// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {SharedImplementationRouter, CVStrategyRouter, RegistryCommunityRouter} from "../src/routing/SharedImplementationRouter.sol";
import {ProxyOwnableUpgrader} from "../src/ProxyOwnableUpgrader.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {IERC165} from "../src/diamonds/interfaces/IERC165.sol";
import {IERC173} from "../src/diamonds/interfaces/IERC173.sol";
import {IArbitrable} from "../src/interfaces/IArbitrable.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {CVStrategyBaseFacet} from "../src/CVStrategy/CVStrategyBaseFacet.sol";
import {CVPauseFacet} from "../src/CVStrategy/facets/CVPauseFacet.sol";
import {PauseFacetBase} from "../src/pausing/PauseFacetBase.sol";
import {RegistryCommunity, RegistryCommunityInitializeParams} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {Metadata} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MockPauseController} from "./helpers/PauseHelpers.sol";

contract RouterMockRegistry {
    function createProfile(uint256, string memory, Metadata memory, address, address[] memory)
        external pure returns (bytes32) { return bytes32(uint256(1)); }
}

contract RouterMockAllo {
    address public registry;
    constructor(address registry_) { registry = registry_; }
    function getRegistry() external view returns (address) { return registry; }
}

contract RouterMockCommunity {
    address public registryFactory;
    constructor(address factory_) { registryFactory = factory_; }
}

contract RouterStatefulStrategyInit {
    error InitFailed();
    bytes32 internal constant SLOT = keccak256("gardens.test.router.strategy.init");

    function init(uint256 value) external {
        bytes32 slot = SLOT;
        assembly { sstore(slot, value) }
    }

    function fail() external pure { revert InitFailed(); }
}

contract RoutedCoreV1 {
    function version() external pure returns (uint256) { return 1; }
}

contract RoutedCoreV2 {
    function version() external pure returns (uint256) { return 2; }
}

contract RoutedReceiveCore {
    bytes32 internal constant SLOT = keccak256("gardens.test.router.received");
    receive() external payable {
        bytes32 slot = SLOT;
        assembly { sstore(slot, callvalue()) }
    }
}

contract RoutedReceiveReverter {
    error ReceiveFailed();
    receive() external payable { revert ReceiveFailed(); }
}

contract RoutedPauseProbe {
    function unpause() external pure returns (uint256) { return 1; }
    function unregisterMember() external pure returns (uint256) { return 2; }
}

contract RoutedFacetV1 {
    bytes32 internal constant SLOT = keccak256("gardens.test.router.value");
    function setValue(uint256 value) external {
        bytes32 slot = SLOT;
        assembly { sstore(slot, value) }
    }
    function value() external view returns (uint256 result) {
        bytes32 slot = SLOT;
        assembly { result := sload(slot) }
    }
}

contract RoutedFacetV2 is RoutedFacetV1 {
    function doubledValue() external view returns (uint256) { return this.value() * 2; }
}

contract RawOwnerPauseFacet is CVStrategyBaseFacet, PauseFacetBase {
    function _pauseOwner() internal view override returns (address) {
        return proxyOwner();
    }
}

contract SharedImplementationRouterTest is Test {
    RegistryFactory factory;
    CVStrategyRouter strategyRouter;
    RegistryCommunityRouter communityRouter;
    address strategyProxy;
    address communityProxy;
    RoutedFacetV1 facetV1;
    RoutedFacetV2 facetV2;

    function setUp() public {
        RoutedCoreV1 core = new RoutedCoreV1();
        facetV1 = new RoutedFacetV1();
        facetV2 = new RoutedFacetV2();
        RegistryFactory factoryImplementation = new RegistryFactory();
        factory = RegistryFactory(payable(address(new ERC1967Proxy(
            address(factoryImplementation),
            abi.encodeCall(RegistryFactory.initialize, (address(this), address(1), address(core), address(core), address(core)))
        ))));
        strategyRouter = new CVStrategyRouter(address(factory));
        communityRouter = new RegistryCommunityRouter(address(factory));
        factory.setStrategyFacets(_cuts(address(facetV1), false), address(0), "");
        factory.setCommunityFacets(_cuts(address(facetV1), false), address(0), "");
        factory.setStrategyImplementation(address(core));
        factory.setCommunityImplementation(address(core));
        factory.setStrategyTemplate(address(strategyRouter));
        factory.setRegistryCommunityTemplate(address(communityRouter));
        strategyProxy = address(new ERC1967Proxy(
            address(strategyRouter), abi.encodeWithSelector(ProxyOwnableUpgrader.initialize.selector, address(this))
        ));
        communityProxy = address(new ERC1967Proxy(
            address(communityRouter), abi.encodeWithSelector(ProxyOwnableUpgrader.initialize.selector, address(this))
        ));
    }

    function test_sharedImplementationAndFacetChangesKeepInstanceStorage() public {
        RoutedFacetV1(strategyProxy).setValue(7);
        RoutedFacetV1(communityProxy).setValue(11);
        assertEq(RoutedFacetV1(strategyProxy).value(), 7);
        assertEq(RoutedFacetV1(communityProxy).value(), 11);
        assertEq(RoutedCoreV1(strategyProxy).version(), 1);
        assertEq(RoutedCoreV1(communityProxy).version(), 1);

        RoutedCoreV2 coreV2 = new RoutedCoreV2();
        factory.setStrategyRelease(_cuts(address(facetV2), true), address(coreV2));
        factory.setCommunityRelease(_cuts(address(facetV2), true), address(coreV2));
        assertEq(RoutedCoreV2(strategyProxy).version(), 2);
        assertEq(RoutedCoreV2(communityProxy).version(), 2);
        assertEq(RoutedFacetV1(strategyProxy).value(), 7);
        assertEq(RoutedFacetV1(communityProxy).value(), 11);
        assertEq(RoutedFacetV2(strategyProxy).doubledValue(), 14);
        assertEq(RoutedFacetV2(communityProxy).doubledValue(), 22);
        assertEq(IDiamondLoupe(strategyProxy).facetAddress(RoutedFacetV2.doubledValue.selector), address(facetV2));
    }

    function test_singleFactoryImplementationWriteUpdatesEveryStrategy() public {
        address anotherStrategy = address(new ERC1967Proxy(
            address(strategyRouter), abi.encodeWithSelector(ProxyOwnableUpgrader.initialize.selector, address(this))
        ));
        RoutedCoreV2 coreV2 = new RoutedCoreV2();
        factory.setStrategyImplementation(address(coreV2));
        assertEq(RoutedCoreV2(strategyProxy).version(), 2);
        assertEq(RoutedCoreV2(anotherStrategy).version(), 2);
    }

    function test_nextStrategyPauseFacetReleaseResolvesOwnerOnExistingProxy() public {
        ProxyOwner sharedOwner = ProxyOwner(address(new ERC1967Proxy(
            address(new ProxyOwner()), abi.encodeCall(ProxyOwner.initialize, (address(this)))
        )));
        address existing = address(new ERC1967Proxy(
            address(strategyRouter), abi.encodeWithSelector(ProxyOwnableUpgrader.initialize.selector, address(sharedOwner))
        ));
        MockPauseController controller = new MockPauseController();
        RawOwnerPauseFacet oldPauseFacet = new RawOwnerPauseFacet();
        CVPauseFacet newPauseFacet = new CVPauseFacet();

        factory.setStrategyRelease(_pauseCuts(address(oldPauseFacet)), factory.strategyImplementation());
        RoutedFacetV1(existing).setValue(19);
        vm.expectRevert(abi.encodeWithSelector(
            PauseFacetBase.NotOwner.selector, address(this), address(sharedOwner)
        ));
        CVPauseFacet(existing).setPauseController(address(controller));

        factory.setStrategyRelease(_pauseCuts(address(newPauseFacet)), factory.strategyImplementation());
        assertEq(factory.strategyFacet(PauseFacetBase.setPauseController.selector), address(newPauseFacet));
        assertEq(IDiamondLoupe(existing).facetAddress(PauseFacetBase.setPauseController.selector), address(newPauseFacet));
        assertEq(ProxyOwnableUpgrader(existing).owner(), address(this));
        assertEq(RoutedFacetV1(existing).value(), 19);

        CVPauseFacet(existing).setPauseController(address(controller));
        assertEq(CVPauseFacet(existing).pauseController(), address(controller));
        vm.prank(address(0xBEEF));
        vm.expectRevert(abi.encodeWithSelector(PauseFacetBase.NotOwner.selector, address(0xBEEF), address(this)));
        CVPauseFacet(existing).setPauseController(address(controller));

        address createdAfterRelease = address(new ERC1967Proxy(
            address(strategyRouter), abi.encodeWithSelector(ProxyOwnableUpgrader.initialize.selector, address(this))
        ));
        CVPauseFacet(createdAfterRelease).setPauseController(address(controller));
        assertEq(CVPauseFacet(createdAfterRelease).pauseController(), address(controller));
    }

    function test_factoryRejectsSwappedRouterFamilies() public {
        vm.expectRevert(abi.encodeWithSelector(RegistryFactory.InvalidRoutingTarget.selector, address(communityRouter)));
        factory.setStrategyTemplate(address(communityRouter));
        vm.expectRevert(abi.encodeWithSelector(RegistryFactory.InvalidRoutingTarget.selector, address(strategyRouter)));
        factory.setRegistryCommunityTemplate(address(strategyRouter));
    }

    function test_factoryRejectsInvalidCoreAndFacetTargets() public {
        RoutedCoreV2 newCore = new RoutedCoreV2();
        vm.expectRevert(abi.encodeWithSelector(RegistryFactory.InvalidRoutingTarget.selector, address(0xBEEF)));
        factory.setStrategyImplementation(address(0xBEEF));
        vm.expectRevert(abi.encodeWithSelector(RegistryFactory.InvalidRoutingTarget.selector, address(strategyRouter)));
        factory.setCommunityImplementation(address(strategyRouter));

        IDiamond.FacetCut[] memory cuts = _cuts(address(0xBEEF), false);
        vm.expectRevert(abi.encodeWithSelector(RegistryFactory.InvalidRoutingTarget.selector, address(0xBEEF)));
        factory.setStrategyRelease(cuts, address(newCore));
        assertEq(RoutedCoreV1(strategyProxy).version(), 1);

        cuts = _cuts(address(communityRouter), false);
        vm.expectRevert(abi.encodeWithSelector(RegistryFactory.InvalidRoutingTarget.selector, address(communityRouter)));
        factory.setCommunityRelease(cuts, address(newCore));
        assertEq(RoutedCoreV1(communityProxy).version(), 1);
    }

    function test_factoryRejectsInvalidRoutedSelectorSetsAtomically() public {
        RoutedCoreV2 newCore = new RoutedCoreV2();
        IDiamond.FacetCut[] memory cuts = _cuts(address(facetV1), false);
        cuts[0].action = IDiamond.FacetCutAction.Remove;
        vm.expectRevert(RegistryFactory.UnsupportedRoutingCut.selector);
        factory.setStrategyRelease(cuts, address(newCore));

        cuts = _cuts(address(facetV1), false);
        cuts[0].functionSelectors[1] = cuts[0].functionSelectors[0];
        vm.expectRevert(abi.encodeWithSelector(
            RegistryFactory.DuplicateRoutingSelector.selector, RoutedFacetV1.setValue.selector
        ));
        factory.setStrategyRelease(cuts, address(newCore));

        cuts = _cuts(address(facetV1), false);
        cuts[0].functionSelectors[1] = ProxyOwnableUpgrader.owner.selector;
        vm.expectRevert(abi.encodeWithSelector(
            RegistryFactory.ReservedRoutingSelector.selector, ProxyOwnableUpgrader.owner.selector
        ));
        factory.setCommunityRelease(cuts, address(newCore));

        assertEq(RoutedCoreV1(strategyProxy).version(), 1);
        assertEq(RoutedCoreV1(communityProxy).version(), 1);
        assertEq(factory.strategyFacet(RoutedFacetV1.value.selector), address(facetV1));
        assertEq(factory.communityFacet(RoutedFacetV1.value.selector), address(facetV1));
    }

    function test_factoryRequiresAtomicReleaseForLegacyFacetEditsOnceRouted() public {
        vm.expectRevert(RegistryFactory.UseAtomicRoutingRelease.selector);
        factory.clearStrategyFacetCuts();
        vm.expectRevert(RegistryFactory.UseAtomicRoutingRelease.selector);
        factory.clearCommunityFacetCuts();
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = RoutedFacetV2.doubledValue.selector;
        vm.expectRevert(RegistryFactory.UseAtomicRoutingRelease.selector);
        factory.upsertStrategyFacetCut(0, address(facetV2), IDiamond.FacetCutAction.Auto, selectors);
        vm.expectRevert(RegistryFactory.UseAtomicRoutingRelease.selector);
        factory.upsertCommunityFacetCut(0, address(facetV2), IDiamond.FacetCutAction.Auto, selectors);
    }

    function test_removedSelectorCannotReachStaleFacet() public {
        RoutedCoreV2 coreV2 = new RoutedCoreV2();
        factory.setStrategyRelease(_cuts(address(facetV2), true), address(coreV2));
        factory.setStrategyRelease(_cuts(address(facetV1), false), address(coreV2));
        assertEq(IDiamondLoupe(strategyProxy).facetAddress(RoutedFacetV2.doubledValue.selector), address(0));
        vm.expectRevert();
        RoutedFacetV2(strategyProxy).doubledValue();
    }

    function test_onlyOwnerCanUpgradeRouterOrChangeFactoryTargets() public {
        CVStrategyRouter replacement = new CVStrategyRouter(address(factory));
        vm.prank(address(0xBEEF));
        vm.expectRevert();
        ProxyOwnableUpgrader(strategyProxy).upgradeTo(address(replacement));
        RoutedCoreV2 newCore = new RoutedCoreV2();
        vm.prank(address(0xBEEF));
        vm.expectRevert();
        factory.setStrategyImplementation(address(newCore));

        ProxyOwnableUpgrader(strategyProxy).upgradeTo(address(replacement));
        assertEq(CVStrategyRouter(payable(strategyProxy)).routingFactory(), address(factory));
        assertEq(RoutedCoreV1(strategyProxy).version(), 1);
    }

    function test_routerRejectsMissingFactoryTargetsAndBubblesCoreFailure() public {
        RouterStatefulStrategyInit core = new RouterStatefulStrategyInit();
        factory.setStrategyImplementation(address(core));
        vm.expectRevert(RouterStatefulStrategyInit.InitFailed.selector);
        RouterStatefulStrategyInit(strategyProxy).fail();

        vm.etch(address(facetV1), "");
        vm.expectRevert(abi.encodeWithSelector(
            SharedImplementationRouter.RoutingTargetUnavailable.selector, RoutedFacetV1.value.selector
        ));
        RoutedFacetV1(strategyProxy).value();

        vm.etch(address(core), "");
        vm.expectRevert(abi.encodeWithSelector(
            SharedImplementationRouter.RoutingTargetUnavailable.selector, RoutedCoreV1.version.selector
        ));
        RoutedCoreV1(strategyProxy).version();
    }

    function test_routerOwnershipCanPassFromProxyOwnerOrItsOwner() public {
        ProxyOwner ownerLogic = new ProxyOwner();
        ProxyOwner sharedOwner = ProxyOwner(address(new ERC1967Proxy(
            address(ownerLogic), abi.encodeCall(ProxyOwner.initialize, (address(this)))
        )));
        address ownedStrategy = address(new ERC1967Proxy(
            address(strategyRouter), abi.encodeWithSelector(ProxyOwnableUpgrader.initialize.selector, address(sharedOwner))
        ));
        vm.prank(address(0xBEEF));
        vm.expectRevert(abi.encodeWithSelector(
            ProxyOwnableUpgrader.CallerNotOwner.selector, address(0xBEEF), address(this)
        ));
        ProxyOwnableUpgrader(ownedStrategy).transferOwnership(address(0xCAFE));

        ProxyOwnableUpgrader(ownedStrategy).transferOwnership(address(sharedOwner));
        vm.prank(address(sharedOwner));
        ProxyOwnableUpgrader(ownedStrategy).transferOwnership(address(0xCAFE));
        assertEq(ProxyOwnableUpgrader(ownedStrategy).proxyOwner(), address(0xCAFE));
    }

    function test_proxyOwnerUpgradeAccessControlsRouterUpgrade() public {
        ProxyOwner ownerLogic = new ProxyOwner();
        ProxyOwner sharedOwner = ProxyOwner(address(new ERC1967Proxy(
            address(ownerLogic), abi.encodeCall(ProxyOwner.initialize, (address(this)))
        )));
        address ownedStrategy = address(new ERC1967Proxy(
            address(strategyRouter), abi.encodeWithSelector(ProxyOwnableUpgrader.initialize.selector, address(sharedOwner))
        ));
        address upgradeWallet = address(0xBEEF);
        sharedOwner.grantUpgradeAccess(upgradeWallet);
        CVStrategyRouter replacement = new CVStrategyRouter(address(factory));
        vm.expectRevert();
        ProxyOwnableUpgrader(ownedStrategy).upgradeTo(address(replacement));
        vm.prank(upgradeWallet);
        ProxyOwnableUpgrader(ownedStrategy).upgradeTo(address(replacement));
        assertEq(CVStrategyRouter(payable(ownedStrategy)).routingFactory(), address(factory));
    }

    function test_localDiamondCutIsDisabled() public {
        vm.expectRevert(SharedImplementationRouter.LocalDiamondCutDisabled.selector);
        IDiamondCut(strategyProxy).diamondCut(new IDiamond.FacetCut[](0), address(0), "");
    }

    function test_loupeReportsCurrentFactoryFacetsAndRouterSelectors() public {
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](3);
        bytes4[] memory first = new bytes4[](2);
        first[0] = RoutedFacetV1.setValue.selector;
        first[1] = IDiamondLoupe.facets.selector;
        cuts[0] = IDiamond.FacetCut(address(facetV1), IDiamond.FacetCutAction.Auto, first);
        bytes4[] memory second = new bytes4[](1);
        second[0] = RoutedFacetV1.value.selector;
        cuts[1] = IDiamond.FacetCut(address(facetV1), IDiamond.FacetCutAction.Auto, second);
        bytes4[] memory third = new bytes4[](1);
        third[0] = RoutedFacetV2.doubledValue.selector;
        cuts[2] = IDiamond.FacetCut(address(facetV2), IDiamond.FacetCutAction.Auto, third);
        factory.setStrategyRelease(cuts, address(new RoutedCoreV2()));

        IDiamondLoupe loupe = IDiamondLoupe(strategyProxy);
        IDiamondLoupe.Facet[] memory facets = loupe.facets();
        assertEq(facets.length, 3);
        assertEq(facets[0].facetAddress, address(facetV1));
        assertEq(facets[0].functionSelectors.length, 2);
        assertEq(facets[0].functionSelectors[0], RoutedFacetV1.setValue.selector);
        assertEq(facets[0].functionSelectors[1], RoutedFacetV1.value.selector);
        assertEq(facets[1].facetAddress, address(facetV2));
        assertEq(facets[1].functionSelectors[0], RoutedFacetV2.doubledValue.selector);
        assertEq(facets[2].facetAddress, strategyProxy);
        assertEq(facets[2].functionSelectors.length, 5);
        assertEq(CVStrategyRouter(payable(strategyProxy)).getFacets().length, 3);
        assertEq(loupe.facetAddress(IDiamondLoupe.facets.selector), strategyProxy);
        assertEq(loupe.facetAddress(RoutedFacetV1.value.selector), address(facetV1));
        assertEq(loupe.facetAddress(bytes4(0xdeadbeef)), address(0));
        assertEq(loupe.facetFunctionSelectors(address(facetV1)).length, 2);
        assertEq(loupe.facetFunctionSelectors(address(0xBEEF)).length, 0);
        address[] memory addresses = loupe.facetAddresses();
        assertEq(addresses.length, 3);
        assertEq(addresses[0], address(facetV1));
        assertEq(addresses[1], address(facetV2));
        assertEq(addresses[2], strategyProxy);

        factory.setCommunityRelease(cuts, address(new RoutedCoreV2()));
        assertEq(IDiamondLoupe(communityProxy).facets().length, 3);
        assertEq(IDiamondLoupe(communityProxy).facetAddress(RoutedFacetV1.value.selector), address(facetV1));
    }

    function test_routerInterfaceSupportMatchesFamily() public {
        assertFalse(CVStrategyRouter(payable(strategyProxy)).supportsInterface(type(IDiamondCut).interfaceId));
        assertTrue(CVStrategyRouter(payable(strategyProxy)).supportsInterface(type(IERC165).interfaceId));
        assertTrue(CVStrategyRouter(payable(strategyProxy)).supportsInterface(type(IDiamondLoupe).interfaceId));
        assertTrue(CVStrategyRouter(payable(strategyProxy)).supportsInterface(type(IERC173).interfaceId));
        assertTrue(CVStrategyRouter(payable(strategyProxy)).supportsInterface(type(IArbitrable).interfaceId));
        assertFalse(RegistryCommunityRouter(payable(communityProxy)).supportsInterface(type(IArbitrable).interfaceId));
        assertFalse(RegistryCommunityRouter(payable(communityProxy)).supportsInterface(bytes4(0xdeadbeef)));
    }

    function test_routedFacetPauseEnforcementUsesInstanceController() public {
        MockPauseController controller = new MockPauseController();
        bytes32 pauseSlot = keccak256("gardens.pause.storage");
        vm.store(strategyProxy, pauseSlot, bytes32(uint256(uint160(address(controller)))));
        vm.store(communityProxy, pauseSlot, bytes32(uint256(uint160(address(controller)))));
        controller.setGlobalPaused(true);
        vm.expectRevert(abi.encodeWithSelector(SharedImplementationRouter.StrategyPaused.selector, address(controller)));
        RoutedFacetV1(strategyProxy).setValue(1);
        vm.expectRevert(abi.encodeWithSelector(SharedImplementationRouter.CommunityPaused.selector, address(controller)));
        RoutedFacetV1(communityProxy).setValue(1);

        controller.setGlobalPaused(false);
        controller.setSelectorPaused(RoutedFacetV1.setValue.selector, true);
        vm.expectRevert(abi.encodeWithSelector(
            SharedImplementationRouter.StrategySelectorPaused.selector, RoutedFacetV1.setValue.selector, address(controller)
        ));
        RoutedFacetV1(strategyProxy).setValue(1);
        vm.expectRevert(abi.encodeWithSelector(
            SharedImplementationRouter.CommunitySelectorPaused.selector, RoutedFacetV1.setValue.selector, address(controller)
        ));
        RoutedFacetV1(communityProxy).setValue(1);
        assertEq(RoutedFacetV1(strategyProxy).value(), 0);

        controller.setSelectorPaused(RoutedFacetV1.setValue.selector, false);
        RoutedFacetV1(strategyProxy).setValue(3);
        assertEq(RoutedFacetV1(strategyProxy).value(), 3);
    }

    function test_pauseManagementAndExitSelectorsRemainCallableDuringPause() public {
        RoutedPauseProbe probe = new RoutedPauseProbe();
        bytes4[] memory strategySelectors = new bytes4[](1);
        strategySelectors[0] = RoutedPauseProbe.unpause.selector;
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut(address(probe), IDiamond.FacetCutAction.Auto, strategySelectors);
        factory.setStrategyRelease(cuts, address(new RoutedCoreV2()));

        bytes4[] memory communitySelectors = new bytes4[](1);
        communitySelectors[0] = RoutedPauseProbe.unregisterMember.selector;
        cuts[0] = IDiamond.FacetCut(address(probe), IDiamond.FacetCutAction.Auto, communitySelectors);
        factory.setCommunityRelease(cuts, address(new RoutedCoreV2()));

        MockPauseController controller = new MockPauseController();
        bytes32 pauseSlot = keccak256("gardens.pause.storage");
        vm.store(strategyProxy, pauseSlot, bytes32(uint256(uint160(address(controller)))));
        vm.store(communityProxy, pauseSlot, bytes32(uint256(uint160(address(controller)))));
        controller.setGlobalPaused(true);
        assertEq(RoutedPauseProbe(strategyProxy).unpause(), 1);
        assertEq(RoutedPauseProbe(communityProxy).unregisterMember(), 2);
    }

    function test_ownerMigrationDelegatesToSelectedCoreAndBubblesFailure() public {
        RouterStatefulStrategyInit core = new RouterStatefulStrategyInit();
        factory.setStrategyImplementation(address(core));
        factory.setCommunityImplementation(address(core));
        vm.prank(address(0xBEEF));
        vm.expectRevert();
        CVStrategyRouter(payable(strategyProxy)).runImplementationMigration(abi.encodeCall(core.init, (1)));
        CVStrategyRouter(payable(strategyProxy)).runImplementationMigration(abi.encodeCall(core.init, (17)));
        RegistryCommunityRouter(payable(communityProxy)).runImplementationMigration(abi.encodeCall(core.init, (23)));
        bytes32 slot = keccak256("gardens.test.router.strategy.init");
        assertEq(uint256(vm.load(strategyProxy, slot)), 17);
        assertEq(uint256(vm.load(communityProxy, slot)), 23);
        vm.expectRevert(RouterStatefulStrategyInit.InitFailed.selector);
        CVStrategyRouter(payable(strategyProxy)).runImplementationMigration(abi.encodeCall(core.fail, ()));
    }

    function test_receiveDelegatesValueAndBubblesFailure() public {
        factory.setStrategyImplementation(address(new RoutedReceiveCore()));
        vm.deal(address(this), 2 ether);
        (bool success,) = strategyProxy.call{value: 1 ether}("");
        assertTrue(success);
        assertEq(uint256(vm.load(strategyProxy, keccak256("gardens.test.router.received"))), 1 ether);
        assertEq(strategyProxy.balance, 1 ether);

        factory.setStrategyImplementation(address(new RoutedReceiveReverter()));
        bytes memory returned;
        (success, returned) = strategyProxy.call{value: 1 ether}("");
        assertFalse(success);
        assertEq(returned, abi.encodeWithSelector(RoutedReceiveReverter.ReceiveFailed.selector));
        assertEq(strategyProxy.balance, 1 ether);
    }

    function test_measureCoreReadRoutingGas() public {
        RoutedCoreV1 core = new RoutedCoreV1();
        address direct = address(new ERC1967Proxy(address(core), ""));
        RoutedCoreV1(direct).version();
        RoutedCoreV1(strategyProxy).version();
        uint256 start = gasleft();
        RoutedCoreV1(direct).version();
        uint256 directGas = start - gasleft();
        start = gasleft();
        RoutedCoreV1(strategyProxy).version();
        uint256 routedGas = start - gasleft();
        emit log_named_uint("direct core read gas", directGas);
        emit log_named_uint("routed core read gas", routedGas);
        emit log_named_uint("routing overhead gas", routedGas - directGas);
    }

    function test_realStrategyMigratesThroughUUPS() public {
        CVStrategy core = new CVStrategy();
        factory.setStrategyImplementation(address(core));
        address existing = address(new ERC1967Proxy(
            address(core), abi.encodeCall(CVStrategy.init, (address(0x1111), address(0x2222), address(this)))
        ));
        IDiamondCut(existing).diamondCut(_cuts(address(facetV2), true), address(0), "");
        CVStrategy(payable(existing)).upgradeTo(address(strategyRouter));
        assertEq(CVStrategy(payable(existing)).proxyOwner(), address(this));
        assertEq(address(CVStrategy(payable(existing)).registryCommunity()), address(0));
        RoutedFacetV1(existing).setValue(9);
        assertEq(RoutedFacetV1(existing).value(), 9);
        assertEq(IDiamondLoupe(existing).facetAddress(RoutedFacetV2.doubledValue.selector), address(0));
        vm.expectRevert();
        RoutedFacetV2(existing).doubledValue();
    }

    function test_newRoutedStrategyRunsConfiguredInitializer() public {
        factory.setStrategyImplementation(address(new CVStrategy()));
        RouterStatefulStrategyInit facetInit = new RouterStatefulStrategyInit();
        factory.setStrategyFacetInit(address(facetInit), abi.encodeCall(facetInit.init, (77)));
        RouterMockCommunity community = new RouterMockCommunity(address(factory));

        address created = address(new ERC1967Proxy(
            address(strategyRouter),
            abi.encodeCall(CVStrategy.init, (address(0x1111), address(0x2222), address(community)))
        ));

        assertEq(uint256(vm.load(created, keccak256("gardens.test.router.strategy.init"))), 77);
        assertEq(CVStrategy(payable(created)).proxyOwner(), address(community));
    }

    function test_newRoutedStrategyRejectsDifferentCommunityFactory() public {
        factory.setStrategyImplementation(address(new CVStrategy()));
        RouterMockCommunity community = new RouterMockCommunity(address(0xBEEF));

        vm.expectRevert(abi.encodeWithSelector(
            CVStrategy.StrategyRoutingFactoryMismatch.selector, address(factory), address(0xBEEF)
        ));
        new ERC1967Proxy(
            address(strategyRouter),
            abi.encodeCall(CVStrategy.init, (address(0x1111), address(0x2222), address(community)))
        );
    }

    function test_newRoutedStrategyRevertsWhenConfiguredInitializerFails() public {
        factory.setStrategyImplementation(address(new CVStrategy()));
        RouterStatefulStrategyInit facetInit = new RouterStatefulStrategyInit();
        factory.setStrategyFacetInit(address(facetInit), abi.encodeCall(facetInit.fail, ()));
        RouterMockCommunity community = new RouterMockCommunity(address(factory));

        vm.expectRevert(RouterStatefulStrategyInit.InitFailed.selector);
        new ERC1967Proxy(
            address(strategyRouter),
            abi.encodeCall(CVStrategy.init, (address(0x1111), address(0x2222), address(community)))
        );
    }

    function test_realCommunityMigratesThroughUUPS() public {
        RegistryCommunity core = new RegistryCommunity();
        factory.setCommunityImplementation(address(core));
        RouterMockRegistry registry = new RouterMockRegistry();
        RouterMockAllo allo = new RouterMockAllo(address(registry));
        RegistryCommunityInitializeParams memory params = RegistryCommunityInitializeParams({
            _allo: address(allo),
            _gardenToken: IERC20(address(0x1111)),
            _registerStakeAmount: 1,
            _communityFee: 0,
            _nonce: 0,
            _registryFactory: address(factory),
            _feeReceiver: address(0),
            _metadata: Metadata({protocol: 1, pointer: "test"}),
            _councilSafe: payable(address(this)),
            _communityName: "test",
            _isKickEnabled: false,
            covenantIpfsHash: "test"
        });
        address existing = address(new ERC1967Proxy(
            address(core),
            abi.encodeCall(RegistryCommunity.initialize, (params, address(0), address(0), address(this)))
        ));
        RegistryCommunity(payable(existing)).upgradeTo(address(communityRouter));
        assertEq(RegistryCommunity(payable(existing)).registryFactory(), address(factory));
        assertEq(RegistryCommunity(payable(existing)).communityName(), "test");
        RoutedFacetV1(existing).setValue(13);
        assertEq(RoutedFacetV1(existing).value(), 13);
    }

    function test_factoryCreatesCommunityOnRouterWithoutLocalCuts() public {
        RegistryCommunity core = new RegistryCommunity();
        factory.setCommunityImplementation(address(core));
        factory.setGlobalPauseController(address(new MockPauseController()));
        RouterMockRegistry registry = new RouterMockRegistry();
        RouterMockAllo allo = new RouterMockAllo(address(registry));
        RegistryCommunityInitializeParams memory params = RegistryCommunityInitializeParams({
            _allo: address(allo),
            _gardenToken: IERC20(address(0x1111)),
            _registerStakeAmount: 1,
            _communityFee: 0,
            _nonce: 0,
            _registryFactory: address(0),
            _feeReceiver: address(0),
            _metadata: Metadata({protocol: 1, pointer: "test"}),
            _councilSafe: payable(address(this)),
            _communityName: "new community",
            _isKickEnabled: false,
            covenantIpfsHash: "test"
        });
        address created = factory.createRegistry(params);
        assertEq(RegistryCommunityRouter(payable(created)).routingFactory(), address(factory));
        assertEq(RegistryCommunity(payable(created)).communityName(), "new community");
        RoutedFacetV1(created).setValue(17);
        assertEq(RoutedFacetV1(created).value(), 17);
        assertEq(IDiamondLoupe(created).facetAddress(RoutedFacetV1.value.selector), address(facetV1));
    }

    function _cuts(address facet, bool includeNew) internal pure returns (IDiamond.FacetCut[] memory cuts) {
        bytes4[] memory selectors = new bytes4[](includeNew ? 3 : 2);
        selectors[0] = RoutedFacetV1.setValue.selector;
        selectors[1] = RoutedFacetV1.value.selector;
        if (includeNew) selectors[2] = RoutedFacetV2.doubledValue.selector;
        cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: facet, action: IDiamond.FacetCutAction.Auto, functionSelectors: selectors
        });
    }

    function _pauseCuts(address pauseFacet) internal view returns (IDiamond.FacetCut[] memory cuts) {
        cuts = new IDiamond.FacetCut[](2);
        cuts[0] = _cuts(address(facetV1), false)[0];
        bytes4[] memory pauseSelectors = new bytes4[](2);
        pauseSelectors[0] = PauseFacetBase.setPauseController.selector;
        pauseSelectors[1] = PauseFacetBase.pauseController.selector;
        cuts[1] = IDiamond.FacetCut({
            facetAddress: pauseFacet, action: IDiamond.FacetCutAction.Auto, functionSelectors: pauseSelectors
        });
    }
}

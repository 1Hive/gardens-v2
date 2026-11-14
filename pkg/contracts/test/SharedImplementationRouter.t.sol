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
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
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

contract RoutedCoreV1 {
    function version() external pure returns (uint256) { return 1; }
}

contract RoutedCoreV2 {
    function version() external pure returns (uint256) { return 2; }
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
}

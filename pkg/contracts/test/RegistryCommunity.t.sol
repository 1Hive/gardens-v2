// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Metadata} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {IStrategy} from "allo-v2-contracts/core/interfaces/IStrategy.sol";
import {
    CVStrategyInitializeParamsV0_3,
    CVParams,
    PointSystemConfig,
    PointSystem,
    ProposalType,
    ArbitrableConfig
} from "../src/CVStrategy/ICVStrategy.sol";
import {IArbitrator} from "../src/interfaces/IArbitrator.sol";

import {
    RegistryCommunity,
    RegistryCommunityInitializeParams,
    CommunityParams
} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {CommunityPauseFacet} from "../src/RegistryCommunity/facets/CommunityPauseFacet.sol";
import {FAllo} from "../src/interfaces/FAllo.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IERC173} from "../src/diamonds/interfaces/IERC173.sol";
import {IERC165} from "../src/diamonds/interfaces/IERC165.sol";
import {RegistryCommunityDiamondInit} from "../src/RegistryCommunity/RegistryCommunityDiamondInit.sol";
import {LibDiamond} from "../src/diamonds/libraries/LibDiamond.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {MockPauseController} from "./helpers/PauseHelpers.sol";

contract DummyCommunityFacet {
    function dummy() external {}
}

contract AddStrategyFacet {
    event StrategyAdded(address strategy);

    function addStrategy(address strategy) external {
        emit StrategyAdded(strategy);
    }
}

contract PoolFacet {
    event PoolCreated(uint256 poolId, address strategy);

    function createPool(address, CVStrategyInitializeParamsV0_3 memory, Metadata memory)
        external
        returns (uint256 poolId, address strategy)
    {
        poolId = 1;
        strategy = address(0xBEEF);
        emit PoolCreated(poolId, strategy);
    }

    function createPool(address, address, CVStrategyInitializeParamsV0_3 memory, Metadata memory)
        external
        returns (uint256 poolId, address strategy)
    {
        poolId = 2;
        strategy = address(0xCAFE);
        emit PoolCreated(poolId, strategy);
    }
}

contract AllStubsFacet {
    function createPool(address, CVStrategyInitializeParamsV0_3 memory, Metadata memory)
        external
        returns (uint256 poolId, address strategy)
    {
        return (11, address(0xBEEF));
    }

    function createPool(address, address, CVStrategyInitializeParamsV0_3 memory, Metadata memory)
        external
        returns (uint256 poolId, address strategy)
    {
        return (12, address(0xCAFE));
    }

    function setArchived(bool) external {}

    function activateMemberInStrategy(address, address) external {}

    function deactivateMemberInStrategy(address, address) external {}

    function increasePower(uint256) external {}

    function decreasePower(uint256) external {}

    function getMemberPowerInStrategy(address, address) external pure returns (uint256) {
        return 42;
    }

    function getMemberStakedAmount(address) external pure returns (uint256) {
        return 5;
    }

    function addStrategyByPoolId(uint256) external {}

    function addStrategy(address) external {}

    function rejectPool(address) external {}

    function removeStrategyByPoolId(uint256) external {}

    function removeStrategy(address) external {}

    function setCouncilSafe(address payable) external {}

    function acceptCouncilSafe() external {}

    function isMember(address) external pure returns (bool) {
        return true;
    }

    function stakeAndRegisterMember(string memory) external {}

    function getStakeAmountWithFees() external pure returns (uint256) {
        return 7;
    }

    function getBasisStakedAmount() external pure returns (uint256) {
        return 9;
    }

    function setBasisStakedAmount(uint256) external {}

    function setCommunityParams(CommunityParams memory) external {}

    function setCommunityFee(uint256) external {}

    function isCouncilMember(address) external pure returns (bool) {
        return true;
    }

    function unregisterMember() external {}

    function kickMember(address, address) external {}
}

contract MockRegistry {
    bytes32 public lastProfileId;

    function createProfile(uint256 nonce, string memory name, Metadata memory, address owner, address[] memory)
        external
        returns (bytes32)
    {
        lastProfileId = keccak256(abi.encodePacked(nonce, name, owner));
        return lastProfileId;
    }
}

contract MockAllo is FAllo {
    address public registry;
    mapping(uint256 => address) public poolStrategies;

    function setRegistry(address registry_) external {
        registry = registry_;
    }

    function setPoolStrategy(uint256 poolId, address strategy) external {
        poolStrategies[poolId] = strategy;
    }

    function createPoolWithCustomStrategy(
        bytes32,
        address,
        bytes memory,
        address,
        uint256,
        Metadata memory,
        address[] memory
    ) external payable returns (uint256) {
        return 0;
    }

    function getRegistry() external view returns (address) {
        return registry;
    }

    function getPool(uint256 poolId) external view returns (IAllo.Pool memory pool) {
        pool.strategy = IStrategy(poolStrategies[poolId]);
    }
}

contract MockRegistryFactoryWithPause {
    address public controller;
    IDiamondCut.FacetCut[] internal communityFacetCuts;
    IDiamondCut.FacetCut[] internal strategyFacetCuts;
    address internal communityInit;
    bytes internal communityInitCalldata;
    address internal strategyInit;
    bytes internal strategyInitCalldata;

    constructor(address controller_) {
        controller = controller_;
    }

    function globalPauseController() external view returns (address) {
        return controller;
    }

    function setCommunityFacets(IDiamondCut.FacetCut[] memory facetCuts, address init, bytes memory initCalldata)
        external
    {
        _setFacetCuts(facetCuts, communityFacetCuts);
        communityInit = init;
        communityInitCalldata = initCalldata;
    }

    function setStrategyFacets(IDiamondCut.FacetCut[] memory facetCuts, address init, bytes memory initCalldata)
        external
    {
        _setFacetCuts(facetCuts, strategyFacetCuts);
        strategyInit = init;
        strategyInitCalldata = initCalldata;
    }

    function getCommunityFacets()
        external
        view
        returns (IDiamondCut.FacetCut[] memory facetCuts, address init, bytes memory initCalldata)
    {
        return (_copyFacetCuts(communityFacetCuts), communityInit, communityInitCalldata);
    }

    function getStrategyFacets()
        external
        view
        returns (IDiamondCut.FacetCut[] memory facetCuts, address init, bytes memory initCalldata)
    {
        return (_copyFacetCuts(strategyFacetCuts), strategyInit, strategyInitCalldata);
    }

    function _setFacetCuts(IDiamondCut.FacetCut[] memory source, IDiamondCut.FacetCut[] storage target) internal {
        while (target.length > 0) {
            target.pop();
        }
        for (uint256 i = 0; i < source.length; i++) {
            target.push();
            IDiamondCut.FacetCut storage dest = target[i];
            dest.facetAddress = source[i].facetAddress;
            dest.action = source[i].action;
            bytes4[] memory selectors = source[i].functionSelectors;
            for (uint256 j = 0; j < selectors.length; j++) {
                dest.functionSelectors.push(selectors[j]);
            }
        }
    }

    function _copyFacetCuts(IDiamondCut.FacetCut[] storage source)
        internal
        view
        returns (IDiamondCut.FacetCut[] memory)
    {
        IDiamondCut.FacetCut[] memory dest = new IDiamondCut.FacetCut[](source.length);
        for (uint256 i = 0; i < source.length; i++) {
            dest[i].facetAddress = source[i].facetAddress;
            dest[i].action = source[i].action;
            bytes4[] storage selectors = source[i].functionSelectors;
            dest[i].functionSelectors = new bytes4[](selectors.length);
            for (uint256 j = 0; j < selectors.length; j++) {
                dest[i].functionSelectors[j] = selectors[j];
            }
        }
        return dest;
    }
}

contract DiamondInitHarnessRC {
    function callInit(address init) external {
        (bool ok, ) = init.delegatecall(abi.encodeWithSelector(RegistryCommunityDiamondInit.init.selector));
        require(ok, "init failed");
    }

    function supportsInterface(bytes4 interfaceId) external view returns (bool) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return ds.supportedInterfaces[interfaceId];
    }
}

contract RegistryCommunityHarness is RegistryCommunity {
    function setMember(address member, bool registered, uint256 staked) external {
        addressToMemberInfo[member].member = member;
        addressToMemberInfo[member].stakedAmount = staked;
        addressToMemberInfo[member].isRegistered = registered;
    }

    function setActivated(address member, address strategy, bool active) external {
        memberActivatedInStrategies[member][strategy] = active;
    }

    function setEnabledStrategy(address strategy, bool enabled) external {
        enabledStrategies[strategy] = enabled;
    }

    function setTotalMembers(uint256 count) external {
        totalMembers = count;
    }

    function setOwner(address owner_) external {
        _transferOwnership(owner_);
    }

    function grantCouncilRole(address member) external {
        _grantRole(COUNCIL_MEMBER, member);
    }

    function exposedOnlyCouncilSafe() external view {
        onlyCouncilSafe();
    }

    function exposedOnlyRegistryMemberSender() external {
        onlyRegistryMemberSender();
    }

    function exposedOnlyRegistryMemberAddress(address sender) external {
        onlyRegistryMemberAddress(sender);
    }

    function exposedOnlyEmptyCommunity() external view {
        onlyEmptyCommunity();
    }

    function exposedOnlyStrategyAddress(address sender, address strategy) external pure {
        onlyStrategyAddress(sender, strategy);
    }

    function exposedOnlyActivatedInStrategy(address strategy) external view {
        onlyActivatedInStrategy(strategy);
    }

    function exposedRevertZeroAddress(address addr) external pure {
        _revertZeroAddress(addr);
    }

    function isMember(address member) public view override returns (bool) {
        return addressToMemberInfo[member].isRegistered;
    }
}

contract RegistryCommunityTest is Test {
    address internal owner = makeAddr("owner");
    address internal councilSafe = makeAddr("councilSafe");
    address internal feeReceiver = makeAddr("feeReceiver");
    bytes4 internal constant CREATE_POOL_WITH_TOKEN_SELECTOR = 0xce7e2cd3;
    bytes4 internal constant CREATE_POOL_WITH_STRATEGY_SELECTOR = 0x82b18ef4;

    function _facetCuts(address facet) internal pure returns (IDiamond.FacetCut[] memory cuts) {
        cuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = DummyCommunityFacet.dummy.selector;
        cuts[0] =
            IDiamond.FacetCut({facetAddress: facet, action: IDiamond.FacetCutAction.Add, functionSelectors: selectors});
    }

    function _facetCutsForAddStrategy(address facet) internal pure returns (IDiamond.FacetCut[] memory cuts) {
        cuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = RegistryCommunity.addStrategy.selector;
        cuts[0] =
            IDiamond.FacetCut({facetAddress: facet, action: IDiamond.FacetCutAction.Add, functionSelectors: selectors});
    }

    function _facetCutsForCreatePool(address facet) internal pure returns (IDiamond.FacetCut[] memory cuts) {
        cuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](2);
        selectors[0] = CREATE_POOL_WITH_TOKEN_SELECTOR;
        selectors[1] = CREATE_POOL_WITH_STRATEGY_SELECTOR;
        cuts[0] =
            IDiamond.FacetCut({facetAddress: facet, action: IDiamond.FacetCutAction.Add, functionSelectors: selectors});
    }

    function _facetCutsForAllStubs(address facet) internal pure returns (IDiamond.FacetCut[] memory cuts) {
        cuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](26);
        selectors[0] = CREATE_POOL_WITH_TOKEN_SELECTOR;
        selectors[1] = CREATE_POOL_WITH_STRATEGY_SELECTOR;
        selectors[2] = RegistryCommunity.setArchived.selector;
        selectors[3] = RegistryCommunity.activateMemberInStrategy.selector;
        selectors[4] = RegistryCommunity.deactivateMemberInStrategy.selector;
        selectors[5] = RegistryCommunity.increasePower.selector;
        selectors[6] = RegistryCommunity.decreasePower.selector;
        selectors[7] = RegistryCommunity.getMemberPowerInStrategy.selector;
        selectors[8] = RegistryCommunity.getMemberStakedAmount.selector;
        selectors[9] = RegistryCommunity.addStrategyByPoolId.selector;
        selectors[10] = RegistryCommunity.addStrategy.selector;
        selectors[11] = RegistryCommunity.rejectPool.selector;
        selectors[12] = RegistryCommunity.removeStrategyByPoolId.selector;
        selectors[13] = RegistryCommunity.removeStrategy.selector;
        selectors[14] = RegistryCommunity.setCouncilSafe.selector;
        selectors[15] = RegistryCommunity.acceptCouncilSafe.selector;
        selectors[16] = RegistryCommunity.isMember.selector;
        selectors[17] = RegistryCommunity.stakeAndRegisterMember.selector;
        selectors[18] = RegistryCommunity.getStakeAmountWithFees.selector;
        selectors[19] = RegistryCommunity.getBasisStakedAmount.selector;
        selectors[20] = RegistryCommunity.setBasisStakedAmount.selector;
        selectors[21] = RegistryCommunity.setCommunityParams.selector;
        selectors[22] = RegistryCommunity.setCommunityFee.selector;
        selectors[23] = RegistryCommunity.isCouncilMember.selector;
        selectors[24] = RegistryCommunity.unregisterMember.selector;
        selectors[25] = RegistryCommunity.kickMember.selector;
        cuts[0] =
            IDiamond.FacetCut({facetAddress: facet, action: IDiamond.FacetCutAction.Add, functionSelectors: selectors});
    }

    function _facetCutsForPause(address facet) internal pure returns (IDiamond.FacetCut[] memory cuts) {
        cuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](12);
        selectors[0] = bytes4(keccak256("setPauseController(address)"));
        selectors[1] = bytes4(keccak256("setPauseFacet(address)"));
        selectors[2] = bytes4(keccak256("pauseFacet()"));
        selectors[3] = bytes4(keccak256("pause(uint256)"));
        selectors[4] = bytes4(keccak256("pause(bytes4,uint256)"));
        selectors[5] = bytes4(keccak256("unpause()"));
        selectors[6] = bytes4(keccak256("unpause(bytes4)"));
        selectors[7] = bytes4(keccak256("pauseController()"));
        selectors[8] = bytes4(keccak256("isPaused()"));
        selectors[9] = bytes4(keccak256("isPaused(bytes4)"));
        selectors[10] = bytes4(keccak256("pausedUntil()"));
        selectors[11] = bytes4(keccak256("pausedSelectorUntil(bytes4)"));
        cuts[0] =
            IDiamond.FacetCut({facetAddress: facet, action: IDiamond.FacetCutAction.Add, functionSelectors: selectors});
    }

    function _defaultParams(address alloAddr) internal view returns (RegistryCommunityInitializeParams memory params) {
        params._allo = alloAddr;
        params._gardenToken = IERC20(address(0xBEEF));
        params._registerStakeAmount = 1;
        params._communityFee = 0;
        params._nonce = 1;
        params._registryFactory = address(0xABCD);
        params._feeReceiver = feeReceiver;
        params._metadata = Metadata({protocol: 1, pointer: "meta"});
        params._councilSafe = payable(councilSafe);
        params._communityName = "name";
        params._isKickEnabled = false;
        params.covenantIpfsHash = "hash";
    }

    function _deployFactoryWithFacets(
        IDiamond.FacetCut[] memory communityCuts,
        IDiamond.FacetCut[] memory strategyCuts,
        address controller
    ) internal returns (MockRegistryFactoryWithPause factory) {
        factory = new MockRegistryFactoryWithPause(controller);
        factory.setCommunityFacets(communityCuts, address(0), "");
        factory.setStrategyFacets(strategyCuts, address(0), "");
    }

    function _deployCommunity(
        RegistryCommunityInitializeParams memory params,
        IDiamond.FacetCut[] memory communityCuts,
        IDiamond.FacetCut[] memory strategyCuts
    ) internal returns (RegistryCommunity community) {
        if (params._registryFactory.code.length == 0) {
            params._registryFactory = address(_deployFactoryWithFacets(communityCuts, strategyCuts, address(0)));
        }
        community = RegistryCommunity(
            address(
                new ERC1967Proxy(
                    address(new RegistryCommunity()),
                    abi.encodeWithSelector(
                        RegistryCommunity.initialize.selector,
                        params,
                        address(0x1111),
                        address(0x2222),
                        owner
                    )
                )
            )
        );
    }

    function test_initialize_success_sets_fields() public {
        DummyCommunityFacet facet = new DummyCommunityFacet();
        MockAllo allo = new MockAllo();
        MockRegistry registry = new MockRegistry();
        allo.setRegistry(address(registry));

        RegistryCommunityInitializeParams memory params = _defaultParams(address(allo));
        RegistryCommunity community = _deployCommunity(params, _facetCuts(address(facet)), _facetCuts(address(facet)));

        assertGt(community.registryFactory().code.length, 0);
        assertEq(address(community.gardenToken()), address(params._gardenToken));
        assertEq(address(community.councilSafe()), params._councilSafe);
        assertEq(community.communityFee(), params._communityFee);
        assertEq(community.registerStakeAmount(), params._registerStakeAmount);
        assertEq(community.communityName(), params._communityName);
        assertEq(community.covenantIpfsHash(), params.covenantIpfsHash);
        assertEq(community.profileId(), registry.lastProfileId());
        assertEq(community.strategyTemplate(), address(0x1111));
        assertEq(community.collateralVaultTemplate(), address(0x2222));
    }

    function test_initialize_sets_pause_controller_when_factory_contract() public {
        DummyCommunityFacet facet = new DummyCommunityFacet();
        MockAllo allo = new MockAllo();
        MockRegistry registry = new MockRegistry();
        allo.setRegistry(address(registry));

        MockPauseController controller = new MockPauseController();
        MockRegistryFactoryWithPause factory = new MockRegistryFactoryWithPause(address(controller));
        factory.setCommunityFacets(_facetCuts(address(facet)), address(0), "");
        factory.setStrategyFacets(_facetCuts(address(facet)), address(0), "");

        RegistryCommunityInitializeParams memory params = _defaultParams(address(allo));
        params._registryFactory = address(factory);
        RegistryCommunity community = _deployCommunity(params, _facetCuts(address(facet)), _facetCuts(address(facet)));

        bytes32 pauseSlot = keccak256("gardens.pause.storage");
        address stored = address(uint160(uint256(vm.load(address(community), pauseSlot))));
        assertEq(stored, address(controller));
    }

    function test_initialize_reverts_on_missing_facets_or_params() public {
        RegistryCommunityInitializeParams memory params = _defaultParams(address(new MockAllo()));

        IDiamond.FacetCut[] memory emptyCuts = new IDiamond.FacetCut[](0);
        params._registryFactory = address(_deployFactoryWithFacets(emptyCuts, emptyCuts, address(0)));
        address impl = address(new RegistryCommunity());
        vm.expectRevert(bytes("Community facets required"));
        new ERC1967Proxy(
            impl,
            abi.encodeWithSelector(
                RegistryCommunity.initialize.selector, params, address(0x1111), address(0x2222), owner
            )
        );

        DummyCommunityFacet facet = new DummyCommunityFacet();
        IDiamond.FacetCut[] memory cuts = _facetCuts(address(facet));

        params._registryFactory = address(_deployFactoryWithFacets(cuts, emptyCuts, address(0)));
        impl = address(new RegistryCommunity());
        vm.expectRevert(bytes("Strategy facets required"));
        new ERC1967Proxy(
            impl,
            abi.encodeWithSelector(
                RegistryCommunity.initialize.selector, params, address(0x1111), address(0x2222), owner
            )
        );

        params._registerStakeAmount = 0;
        params._registryFactory = address(_deployFactoryWithFacets(cuts, cuts, address(0)));
        impl = address(new RegistryCommunity());
        vm.expectRevert(RegistryCommunity.ValueCannotBeZero.selector);
        new ERC1967Proxy(
            impl,
            abi.encodeWithSelector(
                RegistryCommunity.initialize.selector, params, address(0x1111), address(0x2222), owner
            )
        );
    }

    function test_initialize_reverts_on_zero_addresses() public {
        DummyCommunityFacet facet = new DummyCommunityFacet();
        IDiamond.FacetCut[] memory cuts = _facetCuts(address(facet));
        RegistryCommunityInitializeParams memory params = _defaultParams(address(new MockAllo()));
        params._registryFactory = address(_deployFactoryWithFacets(cuts, cuts, address(0)));

        params._gardenToken = IERC20(address(0));
        address impl = address(new RegistryCommunity());
        vm.expectRevert(RegistryCommunity.ValueCannotBeZero.selector);
        new ERC1967Proxy(
            impl,
            abi.encodeWithSelector(
                RegistryCommunity.initialize.selector, params, address(0x1111), address(0x2222), owner
            )
        );

        params = _defaultParams(address(0));
        params._registryFactory = address(_deployFactoryWithFacets(cuts, cuts, address(0)));
        impl = address(new RegistryCommunity());
        vm.expectRevert(RegistryCommunity.ValueCannotBeZero.selector);
        new ERC1967Proxy(
            impl,
            abi.encodeWithSelector(
                RegistryCommunity.initialize.selector, params, address(0x1111), address(0x2222), owner
            )
        );

        params = _defaultParams(address(new MockAllo()));
        params._registryFactory = address(_deployFactoryWithFacets(cuts, cuts, address(0)));
        params._councilSafe = payable(address(0));
        impl = address(new RegistryCommunity());
        vm.expectRevert(RegistryCommunity.ValueCannotBeZero.selector);
        new ERC1967Proxy(
            impl,
            abi.encodeWithSelector(
                RegistryCommunity.initialize.selector, params, address(0x1111), address(0x2222), owner
            )
        );

        params = _defaultParams(address(new MockAllo()));
        params._registryFactory = address(0);
        impl = address(new RegistryCommunity());
        vm.expectRevert(RegistryCommunity.ValueCannotBeZero.selector);
        new ERC1967Proxy(
            impl,
            abi.encodeWithSelector(
                RegistryCommunity.initialize.selector, params, address(0x1111), address(0x2222), owner
            )
        );

        params = _defaultParams(address(new MockAllo()));
        params._registryFactory = address(_deployFactoryWithFacets(cuts, cuts, address(0)));
        params._communityFee = 1;
        params._feeReceiver = address(0);
        impl = address(new RegistryCommunity());
        vm.expectRevert(RegistryCommunity.ValueCannotBeZero.selector);
        new ERC1967Proxy(
            impl,
            abi.encodeWithSelector(
                RegistryCommunity.initialize.selector, params, address(0x1111), address(0x2222), owner
            )
        );
    }

    function test_set_templates_only_owner() public {
        DummyCommunityFacet facet = new DummyCommunityFacet();
        MockAllo allo = new MockAllo();
        MockRegistry registry = new MockRegistry();
        allo.setRegistry(address(registry));

        RegistryCommunityInitializeParams memory params = _defaultParams(address(allo));
        RegistryCommunity community = _deployCommunity(params, _facetCuts(address(facet)), _facetCuts(address(facet)));

        vm.prank(owner);
        community.setStrategyTemplate(address(0xAAAA));
        assertEq(community.strategyTemplate(), address(0xAAAA));

        vm.prank(owner);
        community.setCollateralVaultTemplate(address(0xBBBB));
        assertEq(community.collateralVaultTemplate(), address(0xBBBB));

        vm.expectRevert();
        community.setStrategyTemplate(address(0xCCCC));
    }

    function test_onlyStrategyEnabled_reverts_when_disabled() public {
        RegistryCommunity community = new RegistryCommunity();
        vm.expectRevert(RegistryCommunity.StrategyDisabled.selector);
        community.onlyStrategyEnabled(address(0x1234));
    }

    function test_internal_guards() public {
        RegistryCommunityHarness community = new RegistryCommunityHarness();
        address member = makeAddr("member");
        address other = makeAddr("other");
        address strategy = makeAddr("strategy");

        vm.expectRevert(RegistryCommunity.ValueCannotBeZero.selector);
        community.exposedRevertZeroAddress(address(0));

        vm.expectRevert(RegistryCommunity.UserNotInRegistry.selector);
        community.exposedOnlyRegistryMemberSender();

        community.setMember(member, true, 1);
        vm.prank(member);
        community.exposedOnlyRegistryMemberSender();

        vm.expectRevert(RegistryCommunity.UserNotInRegistry.selector);
        community.exposedOnlyRegistryMemberAddress(other);

        community.exposedOnlyRegistryMemberAddress(member);

        community.setTotalMembers(1);
        vm.expectRevert(abi.encodeWithSelector(RegistryCommunity.OnlyEmptyCommunity.selector, 1));
        community.exposedOnlyEmptyCommunity();

        community.setTotalMembers(0);
        community.exposedOnlyEmptyCommunity();

        vm.expectRevert(RegistryCommunity.SenderNotStrategy.selector);
        community.exposedOnlyStrategyAddress(address(0x1), address(0x2));
        community.exposedOnlyStrategyAddress(strategy, strategy);

        vm.expectRevert(RegistryCommunity.PointsDeactivated.selector);
        community.exposedOnlyActivatedInStrategy(strategy);

        community.setActivated(address(this), strategy, true);
        community.exposedOnlyActivatedInStrategy(strategy);

        vm.expectRevert(RegistryCommunity.StrategyDisabled.selector);
        community.onlyStrategyEnabled(strategy);
        community.setEnabledStrategy(strategy, true);
        community.onlyStrategyEnabled(strategy);
    }

    function test_onlyCouncilSafe() public {
        RegistryCommunityHarness community = new RegistryCommunityHarness();
        address council = makeAddr("council");

        vm.expectRevert(abi.encodeWithSelector(RegistryCommunity.UserNotInCouncil.selector, address(this)));
        community.exposedOnlyCouncilSafe();

        community.grantCouncilRole(council);
        vm.prank(council);
        community.exposedOnlyCouncilSafe();

        address ownerAddr = makeAddr("ownerAddr");
        community.setOwner(ownerAddr);
    }

    function test_stub_functions_revert_without_facets() public {
        RegistryCommunity community = new RegistryCommunity();
        CommunityParams memory communityParams = CommunityParams({
            councilSafe: address(0),
            feeReceiver: address(0),
            communityFee: 0,
            communityName: "",
            registerStakeAmount: 0,
            isKickEnabled: false,
            covenantIpfsHash: ""
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector, RegistryCommunity.addStrategy.selector
            )
        );
        community.addStrategy(address(0x1));

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector, RegistryCommunity.addStrategyByPoolId.selector
            )
        );
        community.addStrategyByPoolId(1);

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector, RegistryCommunity.removeStrategy.selector
            )
        );
        community.removeStrategy(address(0x2));

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector, RegistryCommunity.rejectPool.selector
            )
        );
        community.rejectPool(address(0x3));

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.removeStrategyByPoolId.selector
            )
        );
        community.removeStrategyByPoolId(2);

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector, RegistryCommunity.setCommunityFee.selector
            )
        );
        community.setCommunityFee(1);

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector, RegistryCommunity.setCommunityParams.selector
            )
        );
        community.setCommunityParams(communityParams);

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector, RegistryCommunity.isCouncilMember.selector
            )
        );
        community.isCouncilMember(address(0x4));

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector, RegistryCommunity.isMember.selector
            )
        );
        community.isMember(address(0x5));

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.stakeAndRegisterMember.selector
            )
        );
        community.stakeAndRegisterMember("sig");

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.getStakeAmountWithFees.selector
            )
        );
        community.getStakeAmountWithFees();

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.getBasisStakedAmount.selector
            )
        );
        community.getBasisStakedAmount();

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.setBasisStakedAmount.selector
            )
        );
        community.setBasisStakedAmount(1);

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector, RegistryCommunity.setCouncilSafe.selector
            )
        );
        community.setCouncilSafe(payable(address(0x9)));

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector, RegistryCommunity.acceptCouncilSafe.selector
            )
        );
        community.acceptCouncilSafe();

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector, RegistryCommunity.setArchived.selector
            )
        );
        community.setArchived(true);

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.activateMemberInStrategy.selector
            )
        );
        community.activateMemberInStrategy(address(0xA), address(0xB));

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.deactivateMemberInStrategy.selector
            )
        );
        community.deactivateMemberInStrategy(address(0xA), address(0xB));

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector, RegistryCommunity.increasePower.selector
            )
        );
        community.increasePower(1);

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector, RegistryCommunity.decreasePower.selector
            )
        );
        community.decreasePower(1);

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.getMemberPowerInStrategy.selector
            )
        );
        community.getMemberPowerInStrategy(address(0xA), address(0xB));

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.getMemberStakedAmount.selector
            )
        );
        community.getMemberStakedAmount(address(0xA));

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector, RegistryCommunity.unregisterMember.selector
            )
        );
        community.unregisterMember();

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector, RegistryCommunity.kickMember.selector
            )
        );
        community.kickMember(address(0x6), address(0x7));
    }

    function test_diamondCut_and_delegate_success_paths() public {
        DummyCommunityFacet facet = new DummyCommunityFacet();
        AllStubsFacet allStubs = new AllStubsFacet();
        MockAllo allo = new MockAllo();
        MockRegistry registry = new MockRegistry();
        allo.setRegistry(address(registry));

        RegistryCommunityInitializeParams memory params = _defaultParams(address(allo));
        RegistryCommunity community = _deployCommunity(params, _facetCuts(address(facet)), _facetCuts(address(facet)));

        // Fallback should route to DummyCommunityFacet
        (bool ok,) = address(community).call(abi.encodeWithSelector(DummyCommunityFacet.dummy.selector));
        assertTrue(ok);

        address[] memory allowlist = new address[](0);
        vm.prank(owner);
        community.diamondCut(_facetCutsForAllStubs(address(allStubs)), address(0), "");

        (uint256 poolId, address strategyAddr) = community.createPool(
            address(0x1),
            CVStrategyInitializeParamsV0_3({
                cvParams: CVParams(0, 0, 0, 0),
                proposalType: ProposalType.Funding,
                pointSystem: PointSystem.Unlimited,
                pointConfig: PointSystemConfig(0),
                arbitrableConfig: ArbitrableConfig(IArbitrator(address(0)), address(0), 0, 0, 0, 0),
                registryCommunity: address(community),
                votingPowerRegistry: address(community),
                sybilScorer: address(0),
                sybilScorerThreshold: 0,
                initialAllowlist: allowlist,
                superfluidToken: address(0),
                streamingRatePerSecond: 0
            }),
            Metadata({protocol: 1, pointer: "meta"})
        );
        assertEq(poolId, 11);
        assertEq(strategyAddr, address(0xBEEF));

        (poolId, strategyAddr) = community.createPool(
            address(0x2),
            address(0x3),
            CVStrategyInitializeParamsV0_3({
                cvParams: CVParams(0, 0, 0, 0),
                proposalType: ProposalType.Funding,
                pointSystem: PointSystem.Unlimited,
                pointConfig: PointSystemConfig(0),
                arbitrableConfig: ArbitrableConfig(IArbitrator(address(0)), address(0), 0, 0, 0, 0),
                registryCommunity: address(community),
                votingPowerRegistry: address(community),
                sybilScorer: address(0),
                sybilScorerThreshold: 0,
                initialAllowlist: allowlist,
                superfluidToken: address(0),
                streamingRatePerSecond: 0
            }),
            Metadata({protocol: 1, pointer: "meta"})
        );
        assertEq(poolId, 12);
        assertEq(strategyAddr, address(0xCAFE));

        community.setArchived(true);
        community.activateMemberInStrategy(address(0x1), address(0x2));
        community.deactivateMemberInStrategy(address(0x1), address(0x2));
        community.increasePower(1);
        community.decreasePower(1);
        assertEq(community.getMemberPowerInStrategy(address(0x1), address(0x2)), 42);
        assertEq(community.getMemberStakedAmount(address(0x1)), 5);
        community.addStrategyByPoolId(1);
        community.addStrategy(address(0x3));
        community.rejectPool(address(0x4));
        community.removeStrategyByPoolId(2);
        community.removeStrategy(address(0x5));
        community.setCouncilSafe(payable(address(0x6)));
        community.acceptCouncilSafe();
        assertTrue(community.isMember(address(0x7)));
        community.stakeAndRegisterMember("sig");
        assertEq(community.getStakeAmountWithFees(), 7);
        assertEq(community.getBasisStakedAmount(), 9);
        community.setBasisStakedAmount(2);
        community.setCommunityParams(
            CommunityParams({
                councilSafe: address(0x8),
                feeReceiver: address(0x9),
                communityFee: 0,
                communityName: "name",
                registerStakeAmount: 1,
                isKickEnabled: false,
                covenantIpfsHash: "hash"
            })
        );
        community.setCommunityFee(1);
        assertTrue(community.isCouncilMember(address(0x10)));
        community.unregisterMember();
        community.kickMember(address(0x11), address(0x12));
    }

    function test_diamondCut_reverts_for_non_owner() public {
        DummyCommunityFacet facet = new DummyCommunityFacet();
        MockAllo allo = new MockAllo();
        MockRegistry registry = new MockRegistry();
        allo.setRegistry(address(registry));

        RegistryCommunityInitializeParams memory params = _defaultParams(address(allo));
        RegistryCommunity community = _deployCommunity(params, _facetCuts(address(facet)), _facetCuts(address(facet)));

        IDiamond.FacetCut[] memory cuts = _facetCuts(address(facet));
        vm.expectRevert();
        community.diamondCut(cuts, address(0), "");
    }

    function test_fallback_reverts_unknown_selector() public {
        RegistryCommunity community = new RegistryCommunity();

        (bool ok, bytes memory data) = address(community).call(abi.encodeWithSelector(bytes4(0xdeadbeef)));
        assertFalse(ok);
        assertEq(bytes4(data), RegistryCommunity.CommunityFunctionDoesNotExist.selector);
    }

    function test_pause_enforcement_and_selector_exceptions() public {
        DummyCommunityFacet dummyFacet = new DummyCommunityFacet();
        AddStrategyFacet addStrategyFacet = new AddStrategyFacet();
        CommunityPauseFacet pauseFacet = new CommunityPauseFacet();
        MockPauseController controller = new MockPauseController();
        MockAllo allo = new MockAllo();
        MockRegistry registry = new MockRegistry();
        allo.setRegistry(address(registry));

        RegistryCommunityInitializeParams memory params = _defaultParams(address(allo));
        RegistryCommunity community =
            _deployCommunity(params, _facetCuts(address(dummyFacet)), _facetCuts(address(dummyFacet)));

        vm.prank(owner);
        community.diamondCut(_facetCutsForAddStrategy(address(addStrategyFacet)), address(0), "");
        vm.prank(owner);
        community.diamondCut(_facetCutsForPause(address(pauseFacet)), address(0), "");

        vm.prank(owner);
        CommunityPauseFacet(address(community)).setPauseController(address(controller));

        controller.setGlobalPaused(true);

        vm.expectRevert(abi.encodeWithSelector(RegistryCommunity.CommunityPaused.selector, address(controller)));
        community.addStrategy(address(0x1));

        vm.expectRevert(abi.encodeWithSelector(RegistryCommunity.CommunityPaused.selector, address(controller)));
        DummyCommunityFacet(address(community)).dummy();

        vm.prank(owner);
        CommunityPauseFacet(address(community)).pause(1);

        controller.setGlobalPaused(false);
        controller.setSelectorPaused(RegistryCommunity.addStrategy.selector, true);

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunitySelectorPaused.selector,
                RegistryCommunity.addStrategy.selector,
                address(controller)
            )
        );
        community.addStrategy(address(0x2));
    }

    function test_pause_selector_bypass_before_controller_set() public {
        DummyCommunityFacet dummyFacet = new DummyCommunityFacet();
        CommunityPauseFacet pauseFacet = new CommunityPauseFacet();
        MockAllo allo = new MockAllo();
        MockRegistry registry = new MockRegistry();
        allo.setRegistry(address(registry));

        RegistryCommunityInitializeParams memory params = _defaultParams(address(allo));
        RegistryCommunity community =
            _deployCommunity(params, _facetCuts(address(dummyFacet)), _facetCuts(address(dummyFacet)));

        vm.prank(owner);
        community.diamondCut(_facetCutsForPause(address(pauseFacet)), address(0), "");

        address controller = CommunityPauseFacet(address(community)).pauseController();
        assertEq(controller, address(0));

        MockPauseController pauseController = new MockPauseController();
        vm.prank(owner);
        CommunityPauseFacet(address(community)).setPauseController(address(pauseController));

        assertEq(CommunityPauseFacet(address(community)).pauseController(), address(pauseController));
    }

    function test_registryCommunityDiamondInit_sets_supported_interfaces() public {
        RegistryCommunityDiamondInit init = new RegistryCommunityDiamondInit();
        DiamondInitHarnessRC harness = new DiamondInitHarnessRC();

        harness.callInit(address(init));

        assertTrue(harness.supportsInterface(type(IERC165).interfaceId));
        assertTrue(harness.supportsInterface(type(IDiamondCut).interfaceId));
        assertTrue(harness.supportsInterface(type(IDiamondLoupe).interfaceId));
        assertTrue(harness.supportsInterface(type(IERC173).interfaceId));
    }

    function test_registryCommunityDiamondInit_direct_call() public {
        RegistryCommunityDiamondInit init = new RegistryCommunityDiamondInit();
        init.init();
    }

    function _deployDirectCommunityForCoverage() internal returns (RegistryCommunity community) {
        DummyCommunityFacet facet = new DummyCommunityFacet();
        MockAllo allo = new MockAllo();
        MockRegistry registry = new MockRegistry();
        allo.setRegistry(address(registry));

        RegistryCommunityInitializeParams memory params = _defaultParams(address(allo));
        community = _deployCommunity(params, _facetCuts(address(facet)), _facetCuts(address(facet)));
    }

    function _addStubAndPauseFacets(RegistryCommunity community) internal {
        AllStubsFacet allStubs = new AllStubsFacet();
        CommunityPauseFacet pauseFacet = new CommunityPauseFacet();
        MockPauseController controller = new MockPauseController();

        vm.prank(owner);
        community.diamondCut(_facetCutsForAllStubs(address(allStubs)), address(0), "");
        vm.prank(owner);
        community.diamondCut(_facetCutsForPause(address(pauseFacet)), address(0), "");

        vm.prank(owner);
        community.setPauseController(address(controller));
    }

    function _callAllStubFunctions(RegistryCommunity community) internal {
        address[] memory allowlist = new address[](0);
        community.createPool(
            address(0x1),
            CVStrategyInitializeParamsV0_3({
                cvParams: CVParams(0, 0, 0, 0),
                proposalType: ProposalType.Funding,
                pointSystem: PointSystem.Unlimited,
                pointConfig: PointSystemConfig(0),
                arbitrableConfig: ArbitrableConfig(IArbitrator(address(0)), address(0), 0, 0, 0, 0),
                registryCommunity: address(community),
                votingPowerRegistry: address(community),
                sybilScorer: address(0),
                sybilScorerThreshold: 0,
                initialAllowlist: allowlist,
                superfluidToken: address(0),
                streamingRatePerSecond: 0
            }),
            Metadata({protocol: 1, pointer: "meta"})
        );
        community.createPool(
            address(0x2),
            address(0x3),
            CVStrategyInitializeParamsV0_3({
                cvParams: CVParams(0, 0, 0, 0),
                proposalType: ProposalType.Funding,
                pointSystem: PointSystem.Unlimited,
                pointConfig: PointSystemConfig(0),
                arbitrableConfig: ArbitrableConfig(IArbitrator(address(0)), address(0), 0, 0, 0, 0),
                registryCommunity: address(community),
                votingPowerRegistry: address(community),
                sybilScorer: address(0),
                sybilScorerThreshold: 0,
                initialAllowlist: allowlist,
                superfluidToken: address(0),
                streamingRatePerSecond: 0
            }),
            Metadata({protocol: 1, pointer: "meta"})
        );
        community.setArchived(true);
        community.activateMemberInStrategy(address(0x1), address(0x2));
        community.deactivateMemberInStrategy(address(0x1), address(0x2));
        community.increasePower(1);
        community.decreasePower(1);
        community.getMemberPowerInStrategy(address(0x1), address(0x2));
        community.getMemberStakedAmount(address(0x1));
        community.addStrategyByPoolId(1);
        community.addStrategy(address(0x3));
        community.rejectPool(address(0x4));
        community.removeStrategyByPoolId(2);
        community.removeStrategy(address(0x5));
        community.setCouncilSafe(payable(address(0x6)));
        community.acceptCouncilSafe();
        community.isMember(address(0x7));
        community.stakeAndRegisterMember("sig");
        community.getStakeAmountWithFees();
        community.getBasisStakedAmount();
        community.setBasisStakedAmount(2);
        community.setCommunityParams(
            CommunityParams({
                councilSafe: address(0x8),
                feeReceiver: address(0x9),
                communityFee: 0,
                communityName: "name",
                registerStakeAmount: 1,
                isKickEnabled: false,
                covenantIpfsHash: "hash"
            })
        );
        community.setCommunityFee(1);
        community.isCouncilMember(address(0x10));
        community.unregisterMember();
        community.kickMember(address(0x11), address(0x12));
    }

    function test_direct_initialize_and_stub_calls_cover_delegate_paths() public {
        RegistryCommunity community = _deployDirectCommunityForCoverage();
        _addStubAndPauseFacets(community);
        _callAllStubFunctions(community);

        (bool ok,) = address(community).call(abi.encodeWithSelector(DummyCommunityFacet.dummy.selector));
        assertTrue(ok);

        (ok, ) = address(community).call(abi.encodeWithSelector(bytes4(0xdeadbeef)));
        assertFalse(ok);
    }

}

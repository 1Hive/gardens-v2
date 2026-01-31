// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Metadata} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {IStrategy} from "allo-v2-contracts/core/interfaces/IStrategy.sol";
import {
    CVStrategyInitializeParamsV0_2,
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
import {FAllo} from "../src/interfaces/FAllo.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

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

    function createPool(address, CVStrategyInitializeParamsV0_2 memory, Metadata memory)
        external
        returns (uint256 poolId, address strategy)
    {
        poolId = 1;
        strategy = address(0xBEEF);
        emit PoolCreated(poolId, strategy);
    }

    function createPool(address, address, CVStrategyInitializeParamsV0_2 memory, Metadata memory)
        external
        returns (uint256 poolId, address strategy)
    {
        poolId = 2;
        strategy = address(0xCAFE);
        emit PoolCreated(poolId, strategy);
    }
}

contract AllStubsFacet {
    function createPool(address, CVStrategyInitializeParamsV0_2 memory, Metadata memory)
        external
        returns (uint256 poolId, address strategy)
    {
        return (11, address(0xBEEF));
    }

    function createPool(address, address, CVStrategyInitializeParamsV0_2 memory, Metadata memory)
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

    function createProfile(
        uint256 nonce,
        string memory name,
        Metadata memory,
        address owner,
        address[] memory
    ) external returns (bytes32) {
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

    function strategyFacetCutsLength() external view returns (uint256) {
        return strategyFacetCuts.length;
    }

    function strategyFacetSelectorAt(uint256 index, uint256 selectorIndex) external view returns (bytes4) {
        return strategyFacetCuts[index].functionSelectors[selectorIndex];
    }

    function isMember(address member) public view override returns (bool) {
        return addressToMemberInfo[member].isRegistered;
    }
}

contract RegistryCommunityTest is Test {
    address internal owner = makeAddr("owner");
    address internal councilSafe = makeAddr("councilSafe");
    address internal feeReceiver = makeAddr("feeReceiver");
    bytes4 internal constant CREATE_POOL_WITH_TOKEN_SELECTOR = 0x499ac57f;
    bytes4 internal constant CREATE_POOL_WITH_STRATEGY_SELECTOR = 0xcd564dae;

    function _facetCuts(address facet) internal pure returns (IDiamond.FacetCut[] memory cuts) {
        cuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = DummyCommunityFacet.dummy.selector;
        cuts[0] = IDiamond.FacetCut({
            facetAddress: facet,
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });
    }

    function _facetCutsForAddStrategy(address facet) internal pure returns (IDiamond.FacetCut[] memory cuts) {
        cuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = RegistryCommunity.addStrategy.selector;
        cuts[0] = IDiamond.FacetCut({
            facetAddress: facet,
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });
    }

    function _facetCutsForCreatePool(address facet) internal pure returns (IDiamond.FacetCut[] memory cuts) {
        cuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](2);
        selectors[0] = CREATE_POOL_WITH_TOKEN_SELECTOR;
        selectors[1] = CREATE_POOL_WITH_STRATEGY_SELECTOR;
        cuts[0] = IDiamond.FacetCut({
            facetAddress: facet,
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });
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
        cuts[0] = IDiamond.FacetCut({
            facetAddress: facet,
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });
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

    function _deployCommunity(
        RegistryCommunityInitializeParams memory params,
        IDiamond.FacetCut[] memory communityCuts,
        IDiamond.FacetCut[] memory strategyCuts
    ) internal returns (RegistryCommunity community) {
        community = RegistryCommunity(
            address(
                new ERC1967Proxy(
                    address(new RegistryCommunity()),
                    abi.encodeWithSelector(
                        RegistryCommunity.initialize.selector,
                        params,
                        address(0x1111),
                        address(0x2222),
                        owner,
                        communityCuts,
                        address(0),
                        "",
                        strategyCuts,
                        address(0),
                        ""
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

        assertEq(community.registryFactory(), params._registryFactory);
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

    function test_initialize_reverts_on_missing_facets_or_params() public {
        RegistryCommunityInitializeParams memory params = _defaultParams(address(new MockAllo()));

        IDiamond.FacetCut[] memory emptyCuts = new IDiamond.FacetCut[](0);
        address impl = address(new RegistryCommunity());
        vm.expectRevert(bytes("Community facets required"));
        new ERC1967Proxy(
            impl,
            abi.encodeWithSelector(
                RegistryCommunity.initialize.selector,
                params,
                address(0x1111),
                address(0x2222),
                owner,
                emptyCuts,
                address(0),
                "",
                emptyCuts,
                address(0),
                ""
            )
        );

        DummyCommunityFacet facet = new DummyCommunityFacet();
        IDiamond.FacetCut[] memory cuts = _facetCuts(address(facet));

        impl = address(new RegistryCommunity());
        vm.expectRevert(bytes("Strategy facets required"));
        new ERC1967Proxy(
            impl,
            abi.encodeWithSelector(
                RegistryCommunity.initialize.selector,
                params,
                address(0x1111),
                address(0x2222),
                owner,
                cuts,
                address(0),
                "",
                emptyCuts,
                address(0),
                ""
            )
        );

        params._registerStakeAmount = 0;
        impl = address(new RegistryCommunity());
        vm.expectRevert(RegistryCommunity.ValueCannotBeZero.selector);
        new ERC1967Proxy(
            impl,
            abi.encodeWithSelector(
                RegistryCommunity.initialize.selector,
                params,
                address(0x1111),
                address(0x2222),
                owner,
                cuts,
                address(0),
                "",
                cuts,
                address(0),
                ""
            )
        );
    }

    function test_initialize_reverts_on_zero_addresses() public {
        DummyCommunityFacet facet = new DummyCommunityFacet();
        IDiamond.FacetCut[] memory cuts = _facetCuts(address(facet));
        RegistryCommunityInitializeParams memory params = _defaultParams(address(new MockAllo()));

        params._gardenToken = IERC20(address(0));
        address impl = address(new RegistryCommunity());
        vm.expectRevert(RegistryCommunity.ValueCannotBeZero.selector);
        new ERC1967Proxy(
            impl,
            abi.encodeWithSelector(
                RegistryCommunity.initialize.selector,
                params,
                address(0x1111),
                address(0x2222),
                owner,
                cuts,
                address(0),
                "",
                cuts,
                address(0),
                ""
            )
        );

        params = _defaultParams(address(0));
        impl = address(new RegistryCommunity());
        vm.expectRevert(RegistryCommunity.ValueCannotBeZero.selector);
        new ERC1967Proxy(
            impl,
            abi.encodeWithSelector(
                RegistryCommunity.initialize.selector,
                params,
                address(0x1111),
                address(0x2222),
                owner,
                cuts,
                address(0),
                "",
                cuts,
                address(0),
                ""
            )
        );

        params = _defaultParams(address(new MockAllo()));
        params._councilSafe = payable(address(0));
        impl = address(new RegistryCommunity());
        vm.expectRevert(RegistryCommunity.ValueCannotBeZero.selector);
        new ERC1967Proxy(
            impl,
            abi.encodeWithSelector(
                RegistryCommunity.initialize.selector,
                params,
                address(0x1111),
                address(0x2222),
                owner,
                cuts,
                address(0),
                "",
                cuts,
                address(0),
                ""
            )
        );

        params = _defaultParams(address(new MockAllo()));
        params._registryFactory = address(0);
        impl = address(new RegistryCommunity());
        vm.expectRevert(RegistryCommunity.ValueCannotBeZero.selector);
        new ERC1967Proxy(
            impl,
            abi.encodeWithSelector(
                RegistryCommunity.initialize.selector,
                params,
                address(0x1111),
                address(0x2222),
                owner,
                cuts,
                address(0),
                "",
                cuts,
                address(0),
                ""
            )
        );

        params = _defaultParams(address(new MockAllo()));
        params._communityFee = 1;
        params._feeReceiver = address(0);
        impl = address(new RegistryCommunity());
        vm.expectRevert(RegistryCommunity.ValueCannotBeZero.selector);
        new ERC1967Proxy(
            impl,
            abi.encodeWithSelector(
                RegistryCommunity.initialize.selector,
                params,
                address(0x1111),
                address(0x2222),
                owner,
                cuts,
                address(0),
                "",
                cuts,
                address(0),
                ""
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

        vm.prank(owner);
        community.setStrategyFacets(_facetCuts(address(facet)), address(0), "");

        vm.expectRevert();
        community.setStrategyTemplate(address(0xCCCC));

        vm.expectRevert();
        community.setStrategyFacets(_facetCuts(address(facet)), address(0), "");
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

    function test_onlyCouncilSafe_and_strategyFacetCuts() public {
        RegistryCommunityHarness community = new RegistryCommunityHarness();
        address council = makeAddr("council");

        vm.expectRevert(abi.encodeWithSelector(RegistryCommunity.UserNotInCouncil.selector, address(this)));
        community.exposedOnlyCouncilSafe();

        community.grantCouncilRole(council);
        vm.prank(council);
        community.exposedOnlyCouncilSafe();

        address ownerAddr = makeAddr("ownerAddr");
        community.setOwner(ownerAddr);

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = DummyCommunityFacet.dummy.selector;
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(0x1),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });

        vm.prank(ownerAddr);
        community.setStrategyFacets(cuts, address(0), "");
        assertEq(community.strategyFacetCutsLength(), 1);
        assertEq(community.strategyFacetSelectorAt(0, 0), DummyCommunityFacet.dummy.selector);

        bytes4[] memory selectors2 = new bytes4[](2);
        selectors2[0] = RegistryCommunity.addStrategy.selector;
        selectors2[1] = RegistryCommunity.removeStrategy.selector;
        cuts[0].functionSelectors = selectors2;
        vm.prank(ownerAddr);
        community.setStrategyFacets(cuts, address(0), "");
        assertEq(community.strategyFacetCutsLength(), 1);
        assertEq(community.strategyFacetSelectorAt(0, 0), RegistryCommunity.addStrategy.selector);
        assertEq(community.strategyFacetSelectorAt(0, 1), RegistryCommunity.removeStrategy.selector);
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
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.addStrategy.selector
            )
        );
        community.addStrategy(address(0x1));

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.addStrategyByPoolId.selector
            )
        );
        community.addStrategyByPoolId(1);

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.removeStrategy.selector
            )
        );
        community.removeStrategy(address(0x2));

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.rejectPool.selector
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
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.setCommunityFee.selector
            )
        );
        community.setCommunityFee(1);

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.setCommunityParams.selector
            )
        );
        community.setCommunityParams(communityParams);

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.isCouncilMember.selector
            )
        );
        community.isCouncilMember(address(0x4));

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.isMember.selector
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
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.setCouncilSafe.selector
            )
        );
        community.setCouncilSafe(payable(address(0x9)));

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.acceptCouncilSafe.selector
            )
        );
        community.acceptCouncilSafe();

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.setArchived.selector
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
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.increasePower.selector
            )
        );
        community.increasePower(1);

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.decreasePower.selector
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
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.unregisterMember.selector
            )
        );
        community.unregisterMember();

        vm.expectRevert(
            abi.encodeWithSelector(
                RegistryCommunity.CommunityFunctionDoesNotExist.selector,
                RegistryCommunity.kickMember.selector
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
        (bool ok, ) = address(community).call(abi.encodeWithSelector(DummyCommunityFacet.dummy.selector));
        assertTrue(ok);

        address[] memory allowlist = new address[](0);
        vm.prank(owner);
        community.diamondCut(_facetCutsForAllStubs(address(allStubs)), address(0), "");

        (uint256 poolId, address strategyAddr) = community.createPool(
            address(0x1),
            CVStrategyInitializeParamsV0_2({
                cvParams: CVParams(0, 0, 0, 0),
                proposalType: ProposalType.Funding,
                pointSystem: PointSystem.Unlimited,
                pointConfig: PointSystemConfig(0),
                arbitrableConfig: ArbitrableConfig(IArbitrator(address(0)), address(0), 0, 0, 0, 0),
                registryCommunity: address(community),
                sybilScorer: address(0),
                sybilScorerThreshold: 0,
                initialAllowlist: allowlist,
                superfluidToken: address(0)
            }),
            Metadata({protocol: 1, pointer: "meta"})
        );
        assertEq(poolId, 11);
        assertEq(strategyAddr, address(0xBEEF));

        (poolId, strategyAddr) = community.createPool(
            address(0x2),
            address(0x3),
            CVStrategyInitializeParamsV0_2({
                cvParams: CVParams(0, 0, 0, 0),
                proposalType: ProposalType.Funding,
                pointSystem: PointSystem.Unlimited,
                pointConfig: PointSystemConfig(0),
                arbitrableConfig: ArbitrableConfig(IArbitrator(address(0)), address(0), 0, 0, 0, 0),
                registryCommunity: address(community),
                sybilScorer: address(0),
                sybilScorerThreshold: 0,
                initialAllowlist: allowlist,
                superfluidToken: address(0)
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

    function test_fallback_reverts_unknown_selector() public {
        RegistryCommunity community = new RegistryCommunity();

        (bool ok, bytes memory data) = address(community).call(abi.encodeWithSelector(bytes4(0xdeadbeef)));
        assertFalse(ok);
        assertEq(bytes4(data), RegistryCommunity.CommunityFunctionDoesNotExist.selector);
    }
}

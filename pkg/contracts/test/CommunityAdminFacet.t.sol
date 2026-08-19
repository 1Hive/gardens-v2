// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {CommunityAdminFacet, CommunityParams} from "../src/RegistryCommunity/facets/CommunityAdminFacet.sol";
import {PendingCommunityParams} from "../src/RegistryCommunity/CommunityPendingParamsStorage.sol";
import {ProxyOwnableUpgrader} from "../src/ProxyOwnableUpgrader.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {CommunityDiamondConfigurator} from "./helpers/CommunityDiamondConfigurator.sol";
import {ISafe} from "../src/interfaces/ISafe.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract CommunityAdminFacetHarness is CommunityAdminFacet {
    function initOwner(address owner_) external {
        super.initialize(owner_);
    }

    function grantCouncil(address council) external {
        _grantRole(COUNCIL_MEMBER, council);
        councilSafe = ISafe(council);
    }

    function setTotalMembers(uint256 count) external {
        totalMembers = count;
    }

    function setRegisterStakeAmount(uint256 amount) external {
        registerStakeAmount = amount;
    }

    function setCommunityFeeRaw(uint256 fee) external {
        communityFee = fee;
    }

    function setCommunityNameRaw(string memory name) external {
        communityName = name;
    }

    function setCovenantIpfsHashRaw(string memory hash) external {
        covenantIpfsHash = hash;
    }

    function setKickEnabledRaw(bool enabled) external {
        isKickEnabled = enabled;
    }
}

contract CommunityOwnerResolver {
    address public owner;

    constructor(address owner_) {
        owner = owner_;
    }
}

contract CommunityAdminFacetTest is Test {
    event BasisStakedAmountUpdated(uint256 newAmount);
    event CovenantIpfsHashUpdated(string covenantIpfsHash);
    event KickEnabledUpdated(bool isKickEnabled);
    event PendingCommunityParamsUpdated(
        uint8 indexed fields, uint256 registerStakeAmount, bool isKickEnabled, string covenantIpfsHash
    );
    event PendingCommunityParamsCleared(uint8 indexed clearedFields, uint8 indexed remainingFields);
    event PendingCommunityParamsApproved(uint8 indexed fields, address indexed approver);

    CommunityAdminFacetHarness internal facet;
    address internal owner = makeAddr("owner");
    address internal council = makeAddr("council");
    address internal other = makeAddr("other");

    function setUp() public {
        CommunityAdminFacetHarness impl = new CommunityAdminFacetHarness();
        facet = CommunityAdminFacetHarness(
            payable(address(new ERC1967Proxy(address(impl), abi.encodeWithSelector(impl.initOwner.selector, owner))))
        );
        facet.grantCouncil(council);
    }

    function test_setStrategyTemplate_owner_only() public {
        vm.prank(owner);
        facet.setStrategyTemplate(address(0x1111));
        assertEq(facet.strategyTemplate(), address(0x1111));

        vm.expectRevert(bytes("Ownable: caller is not the owner"));
        facet.setStrategyTemplate(address(0x2222));
    }

    function test_setCollateralVaultTemplate_owner_only() public {
        vm.prank(owner);
        facet.setCollateralVaultTemplate(address(0xAAAA));
        assertEq(facet.collateralVaultTemplate(), address(0xAAAA));

        vm.expectRevert(bytes("Ownable: caller is not the owner"));
        facet.setCollateralVaultTemplate(address(0xBBBB));
    }

    function test_setArchived_requires_council() public {
        vm.expectRevert(abi.encodeWithSelector(CommunityAdminFacet.UserNotInCouncil.selector, address(this)));
        facet.setArchived(true);

        vm.prank(council);
        facet.setArchived(false);
    }

    function test_setBasisStakedAmount_requires_empty() public {
        facet.setRegisterStakeAmount(10);
        facet.setTotalMembers(1);

        vm.prank(council);
        vm.expectRevert(abi.encodeWithSelector(CommunityAdminFacet.OnlyEmptyCommunity.selector, 1));
        facet.setBasisStakedAmount(5);

        facet.setTotalMembers(0);
        vm.prank(council);
        facet.setBasisStakedAmount(7);
        assertEq(facet.registerStakeAmount(), 7);
    }

    function test_setCommunityFee_bounds() public {
        vm.prank(council);
        vm.expectRevert(CommunityAdminFacet.NewFeeGreaterThanMax.selector);
        facet.setCommunityFee(type(uint256).max);

        vm.prank(council);
        facet.setCommunityFee(5);
        assertEq(facet.communityFee(), 5);
    }

    function test_setCouncilSafe_and_accept() public {
        vm.prank(council);
        vm.expectRevert(CommunityAdminFacet.ValueCannotBeZero.selector);
        facet.setCouncilSafe(payable(address(0)));

        vm.prank(council);
        facet.setCouncilSafe(payable(other));
        assertEq(address(facet.pendingCouncilSafe()), other);

        vm.expectRevert(CommunityAdminFacet.SenderNotNewOwner.selector);
        facet.acceptCouncilSafe();

        vm.prank(other);
        facet.acceptCouncilSafe();
        assertEq(address(facet.councilSafe()), other);
        assertEq(address(facet.pendingCouncilSafe()), address(0));
        assertTrue(facet.isCouncilMember(other));
    }

    function test_acceptCouncilSafe_keeps_role_when_pending_safe_matches_current_safe() public {
        assertTrue(facet.isCouncilMember(council));

        vm.prank(council);
        facet.setCouncilSafe(payable(council));
        assertEq(address(facet.pendingCouncilSafe()), council);

        vm.prank(council);
        facet.acceptCouncilSafe();

        assertEq(address(facet.councilSafe()), council);
        assertEq(address(facet.pendingCouncilSafe()), address(0));
        assertTrue(facet.isCouncilMember(council));
    }

    function test_setCommunityParams_updates_fields() public {
        CommunityParams memory params = CommunityParams({
            councilSafe: address(other),
            feeReceiver: address(0xFEE),
            communityFee: 9,
            communityName: "newName",
            registerStakeAmount: 22,
            isKickEnabled: true,
            covenantIpfsHash: "newHash"
        });

        facet.setRegisterStakeAmount(1);
        facet.setCommunityFeeRaw(1);
        facet.setCommunityNameRaw("old");
        facet.setCovenantIpfsHashRaw("oldHash");
        facet.setTotalMembers(0);

        vm.prank(council);
        facet.setCommunityParams(params);

        assertEq(facet.registerStakeAmount(), 22);
        assertEq(facet.communityFee(), 9);
        assertEq(facet.communityName(), "newName");
        assertEq(facet.covenantIpfsHash(), "newHash");
        assertEq(facet.feeReceiver(), address(0xFEE));
        assertEq(address(facet.pendingCouncilSafe()), other);
    }

    function test_setCommunityParams_queues_restricted_fields_when_members_exist() public {
        facet.setRegisterStakeAmount(10);
        facet.setCommunityFeeRaw(1);
        facet.setCommunityNameRaw("name");
        facet.setCovenantIpfsHashRaw("hash");
        facet.setTotalMembers(2);

        CommunityParams memory params = CommunityParams({
            councilSafe: address(0),
            feeReceiver: address(0xFEE),
            communityFee: 1,
            communityName: "name",
            registerStakeAmount: 11,
            isKickEnabled: false,
            covenantIpfsHash: "hash"
        });

        vm.prank(council);
        facet.setCommunityParams(params);

        assertEq(facet.registerStakeAmount(), 10);
        PendingCommunityParams memory pending = facet.getPendingCommunityParams();
        assertEq(pending.fields, 1);
        assertEq(pending.registerStakeAmount, 11);
    }

    function test_setCommunityParams_allows_name_and_fee_updates_with_members() public {
        facet.setRegisterStakeAmount(10);
        facet.setCommunityFeeRaw(1);
        facet.setCommunityNameRaw("old");
        facet.setCovenantIpfsHashRaw("hash");
        facet.setTotalMembers(3);

        CommunityParams memory params = CommunityParams({
            councilSafe: address(0),
            feeReceiver: address(0xF00D),
            communityFee: 2,
            communityName: "newName",
            registerStakeAmount: 10,
            isKickEnabled: false,
            covenantIpfsHash: "hash"
        });

        vm.prank(council);
        facet.setCommunityParams(params);

        assertEq(facet.communityName(), "newName");
        assertEq(facet.communityFee(), 2);
        assertEq(facet.feeReceiver(), address(0xF00D));
        assertEq(facet.registerStakeAmount(), 10);
    }

    function test_setArchived_emits_for_council() public {
        vm.prank(council);
        facet.setArchived(true);
    }

    function test_setCommunityFee_reverts_for_non_council() public {
        vm.expectRevert(abi.encodeWithSelector(CommunityAdminFacet.UserNotInCouncil.selector, address(this)));
        facet.setCommunityFee(1);
    }

    function test_setCommunityParams_reverts_for_non_council() public {
        CommunityParams memory params = CommunityParams({
            councilSafe: address(0),
            feeReceiver: address(0),
            communityFee: 0,
            communityName: "name",
            registerStakeAmount: 1,
            isKickEnabled: false,
            covenantIpfsHash: ""
        });

        vm.expectRevert(abi.encodeWithSelector(CommunityAdminFacet.UserNotInCouncil.selector, address(this)));
        facet.setCommunityParams(params);
    }

    function test_isCouncilMember_false_for_non_member() public view {
        assertFalse(facet.isCouncilMember(address(0xDEAD)));
    }

    function test_setCommunityParams_noop_when_same_values() public {
        facet.setRegisterStakeAmount(10);
        facet.setCommunityFeeRaw(3);
        facet.setCommunityNameRaw("same");
        facet.setCovenantIpfsHashRaw("sameHash");
        facet.setTotalMembers(5);

        CommunityParams memory params = CommunityParams({
            councilSafe: address(0),
            feeReceiver: address(0),
            communityFee: 3,
            communityName: "same",
            registerStakeAmount: 10,
            isKickEnabled: false,
            covenantIpfsHash: "sameHash"
        });

        vm.prank(council);
        facet.setCommunityParams(params);

        assertEq(facet.registerStakeAmount(), 10);
        assertEq(facet.communityFee(), 3);
        assertEq(facet.communityName(), "same");
        assertEq(address(facet.pendingCouncilSafe()), address(0));
    }

    function test_setCommunityParams_applies_unguarded_and_queues_all_guarded_atomically() public {
        facet.setRegisterStakeAmount(10);
        facet.setCommunityFeeRaw(1);
        facet.setCommunityNameRaw("old");
        facet.setCovenantIpfsHashRaw("oldHash");
        facet.setTotalMembers(2);

        CommunityParams memory params = CommunityParams({
            councilSafe: address(0),
            feeReceiver: address(0xFEE),
            communityFee: 2,
            communityName: "new",
            registerStakeAmount: 20,
            isKickEnabled: true,
            covenantIpfsHash: "newHash"
        });

        vm.expectEmit(true, false, false, true, address(facet));
        emit PendingCommunityParamsUpdated(7, 20, true, "newHash");
        vm.prank(council);
        facet.setCommunityParams(params);

        assertEq(facet.communityName(), "new");
        assertEq(facet.communityFee(), 2);
        assertEq(facet.feeReceiver(), address(0xFEE));
        assertEq(facet.registerStakeAmount(), 10);
        assertFalse(facet.isKickEnabled());
        assertEq(facet.covenantIpfsHash(), "oldHash");

        PendingCommunityParams memory pending = facet.getPendingCommunityParams();
        assertEq(pending.fields, 7);
        assertEq(pending.registerStakeAmount, 20);
        assertTrue(pending.isKickEnabled);
        assertEq(pending.covenantIpfsHash, "newHash");
    }

    function test_pending_values_latest_wins_and_active_pass_through_preserves_pending() public {
        facet.setRegisterStakeAmount(10);
        facet.setCovenantIpfsHashRaw("active");
        facet.setTotalMembers(1);

        CommunityParams memory params = _params(11, true, "pending-one");
        vm.prank(council);
        facet.setCommunityParams(params);

        params.registerStakeAmount = 12;
        params.covenantIpfsHash = "pending-two";
        vm.prank(council);
        facet.setCommunityParams(params);

        PendingCommunityParams memory pending = facet.getPendingCommunityParams();
        assertEq(pending.fields, 7);
        assertEq(pending.registerStakeAmount, 12);
        assertEq(pending.covenantIpfsHash, "pending-two");

        CommunityParams memory passThrough = _params(10, false, "active");
        passThrough.communityName = "unguarded update";
        vm.prank(council);
        facet.setCommunityParams(passThrough);

        pending = facet.getPendingCommunityParams();
        assertEq(pending.fields, 7);
        assertEq(pending.registerStakeAmount, 12);
        assertTrue(pending.isKickEnabled);
        assertEq(pending.covenantIpfsHash, "pending-two");
        assertEq(facet.communityName(), "unguarded update");
    }

    function test_cancelPendingCommunityParams_is_selective_and_council_only() public {
        facet.setRegisterStakeAmount(10);
        facet.setCovenantIpfsHashRaw("active");
        facet.setTotalMembers(1);

        vm.prank(council);
        facet.setCommunityParams(_params(12, true, "pending"));

        vm.expectRevert(abi.encodeWithSelector(CommunityAdminFacet.UserNotInCouncil.selector, address(this)));
        facet.cancelPendingCommunityParams(1);

        vm.expectEmit(true, true, false, true, address(facet));
        emit PendingCommunityParamsCleared(5, 2);
        vm.prank(council);
        facet.cancelPendingCommunityParams(5);

        PendingCommunityParams memory pending = facet.getPendingCommunityParams();
        assertEq(pending.fields, 2);
        assertEq(pending.registerStakeAmount, 0);
        assertTrue(pending.isKickEnabled);
        assertEq(pending.covenantIpfsHash, "");

        vm.prank(council);
        vm.expectRevert(
            abi.encodeWithSelector(CommunityAdminFacet.InvalidPendingCommunityParamsFields.selector, uint8(1), uint8(2))
        );
        facet.cancelPendingCommunityParams(1);

        vm.prank(council);
        vm.expectRevert(
            abi.encodeWithSelector(CommunityAdminFacet.InvalidPendingCommunityParamsFields.selector, uint8(8), uint8(2))
        );
        facet.cancelPendingCommunityParams(8);
    }

    function test_approvePendingCommunityParams_applies_all_while_non_empty() public {
        facet.setRegisterStakeAmount(10);
        facet.setCovenantIpfsHashRaw("active");
        facet.setTotalMembers(3);

        vm.prank(council);
        facet.setCommunityParams(_params(0, true, ""));

        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(ProxyOwnableUpgrader.CallerNotOwner.selector, other, owner));
        facet.approvePendingCommunityParams();

        vm.expectEmit(false, false, false, true, address(facet));
        emit BasisStakedAmountUpdated(0);
        vm.expectEmit(false, false, false, true, address(facet));
        emit KickEnabledUpdated(true);
        vm.expectEmit(false, false, false, true, address(facet));
        emit CovenantIpfsHashUpdated("");
        vm.expectEmit(true, true, false, true, address(facet));
        emit PendingCommunityParamsApproved(7, owner);
        vm.prank(owner);
        facet.approvePendingCommunityParams();

        assertEq(facet.registerStakeAmount(), 0);
        assertTrue(facet.isKickEnabled());
        assertEq(facet.covenantIpfsHash(), "");
        assertEq(facet.getPendingCommunityParams().fields, 0);
    }

    function test_approvePendingCommunityParams_uses_resolved_proxy_owner() public {
        CommunityOwnerResolver resolver = new CommunityOwnerResolver(other);
        vm.prank(owner);
        facet.transferOwnership(address(resolver));
        assertEq(facet.owner(), other);

        facet.setRegisterStakeAmount(1);
        facet.setTotalMembers(1);
        vm.prank(council);
        facet.setCommunityParams(_params(2, false, ""));

        vm.prank(other);
        facet.approvePendingCommunityParams();
        assertEq(facet.registerStakeAmount(), 2);
    }

    function test_approvePendingCommunityParams_reverts_when_none_pending() public {
        vm.prank(owner);
        vm.expectRevert(CommunityAdminFacet.NoPendingCommunityParams.selector);
        facet.approvePendingCommunityParams();
    }

    function test_invalid_unguarded_value_rolls_back_pending_queue() public {
        facet.setRegisterStakeAmount(10);
        facet.setTotalMembers(1);
        CommunityParams memory params = _params(11, false, "");
        params.communityFee = type(uint256).max;

        vm.prank(council);
        vm.expectRevert(CommunityAdminFacet.NewFeeGreaterThanMax.selector);
        facet.setCommunityParams(params);

        assertEq(facet.getPendingCommunityParams().fields, 0);
    }

    function test_empty_community_change_applies_and_clears_matching_pending_field() public {
        facet.setRegisterStakeAmount(10);
        facet.setTotalMembers(1);
        vm.prank(council);
        facet.setCommunityParams(_params(11, false, ""));
        assertEq(facet.getPendingCommunityParams().fields, 1);

        facet.setTotalMembers(0);
        vm.prank(council);
        facet.setCommunityParams(_params(12, false, ""));

        assertEq(facet.registerStakeAmount(), 12);
        assertEq(facet.getPendingCommunityParams().fields, 0);
    }

    function test_direct_stake_change_clears_pending_stake_only() public {
        facet.setRegisterStakeAmount(10);
        facet.setCovenantIpfsHashRaw("active");
        facet.setTotalMembers(1);
        vm.prank(council);
        facet.setCommunityParams(_params(11, true, "pending"));

        facet.setTotalMembers(0);
        vm.prank(council);
        facet.setBasisStakedAmount(15);

        PendingCommunityParams memory pending = facet.getPendingCommunityParams();
        assertEq(pending.fields, 6);
        assertEq(facet.registerStakeAmount(), 15);
    }

    function test_canonical_facet_cut_contains_pending_param_selectors() public {
        CommunityDiamondConfigurator configurator = new CommunityDiamondConfigurator();
        IDiamondCut.FacetCut[] memory cuts = configurator.getFacetCuts();
        bytes4[] memory selectors = cuts[1].functionSelectors;

        assertEq(selectors.length, 12);
        assertEq(selectors[9], CommunityAdminFacet.getPendingCommunityParams.selector);
        assertEq(selectors[10], CommunityAdminFacet.approvePendingCommunityParams.selector);
        assertEq(selectors[11], CommunityAdminFacet.cancelPendingCommunityParams.selector);
    }

    function _params(uint256 stake, bool kickEnabled, string memory covenantHash)
        internal
        pure
        returns (CommunityParams memory)
    {
        return CommunityParams({
            councilSafe: address(0),
            feeReceiver: address(0),
            communityFee: 0,
            communityName: "name",
            registerStakeAmount: stake,
            isKickEnabled: kickEnabled,
            covenantIpfsHash: covenantHash
        });
    }
}

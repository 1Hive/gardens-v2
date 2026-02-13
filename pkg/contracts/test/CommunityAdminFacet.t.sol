// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {CommunityAdminFacet, CommunityParams} from "../src/RegistryCommunity/facets/CommunityAdminFacet.sol";
import {ISafe} from "../src/interfaces/ISafe.sol";

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
}

contract CommunityAdminFacetTest is Test {
    CommunityAdminFacetHarness internal facet;
    address internal owner = makeAddr("owner");
    address internal council = makeAddr("council");
    address internal other = makeAddr("other");

    function setUp() public {
        facet = new CommunityAdminFacetHarness();
        facet.initOwner(owner);
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
}

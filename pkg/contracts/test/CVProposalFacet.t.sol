// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";

import {CreateProposal, ProposalType, ProposalStatus, ArbitrableConfig} from "../src/CVStrategy/CVStrategy.sol";
import {CVProposalFacet} from "../src/CVStrategy/facets/CVProposalFacet.sol";
import {CVStrategyBaseFacet} from "../src/CVStrategy/CVStrategyBaseFacet.sol";
import {IArbitrator} from "../src/interfaces/IArbitrator.sol";

import {
    CVProposalFacetHarness,
    MockAlloWithPool,
    MockRegistryCommunity,
    MockCollateralVault
} from "./helpers/CVStrategyHelpers.sol";

contract CVProposalFacetTest is Test {
    CVProposalFacetHarness internal facet;
    MockAlloWithPool internal allo;
    MockRegistryCommunity internal registryCommunity;
    MockCollateralVault internal collateralVault;

    address internal member = makeAddr("member");
    address internal beneficiary = makeAddr("beneficiary");
    address internal poolToken = makeAddr("poolToken");
    address internal otherToken = makeAddr("otherToken");

    function setUp() public {
        facet = new CVProposalFacetHarness();
        allo = new MockAlloWithPool();
        registryCommunity = new MockRegistryCommunity();
        collateralVault = new MockCollateralVault();

        facet.setAllo(address(allo));
        facet.setPoolId(1);
        facet.setRegistryCommunity(address(registryCommunity));
        facet.setCollateralVault(address(collateralVault));
        facet.setProposalType(ProposalType.Funding);

        allo.setPoolToken(1, poolToken);
        registryCommunity.setMember(member, true);
        registryCommunity.setStrategyEnabled(true);

        ArbitrableConfig memory config =
            ArbitrableConfig(IArbitrator(address(0xBEEF)), payable(address(0xCAFE)), 1 ether, 0, 0, 0);
        facet.setArbitrableConfig(1, config);
    }

    function _buildProposal() internal pure returns (bytes memory) {
        CreateProposal memory proposal =
            CreateProposal(1, address(0x1234), 10, address(0x9999), Metadata({protocol: 1, pointer: "p"}));
        return abi.encode(proposal);
    }

    function test_registerRecipient_success() public {
        CreateProposal memory proposal =
            CreateProposal(1, beneficiary, 10, poolToken, Metadata({protocol: 1, pointer: "p"}));
        bytes memory data = abi.encode(proposal);

        vm.deal(address(allo), 2 ether);
        vm.prank(address(allo));
        facet.registerRecipient{value: 1 ether}(data, member);

        assertEq(collateralVault.lastProposalId(), 1);
        assertEq(collateralVault.lastAccount(), member);
        assertEq(collateralVault.lastAmount(), 1 ether);
    }

    function test_registerRecipient_revertWhenNotMember() public {
        registryCommunity.setMember(member, false);
        vm.prank(address(allo));
        vm.expectRevert(
            abi.encodeWithSelector(CVStrategyBaseFacet.OnlyMember.selector, member, address(registryCommunity))
        );
        facet.registerRecipient(_buildProposal(), member);
    }

    function test_registerRecipient_revertWhenStrategyDisabled() public {
        registryCommunity.setStrategyEnabled(false);
        vm.prank(address(allo));
        vm.expectRevert();
        facet.registerRecipient(_buildProposal(), member);
    }

    function test_registerRecipient_unexpectedToken() public {
        CreateProposal memory proposal =
            CreateProposal(1, beneficiary, 10, otherToken, Metadata({protocol: 1, pointer: "p"}));
        bytes memory data = abi.encode(proposal);
        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(CVProposalFacet.UnexpectedRequestToken.selector, otherToken, poolToken));
        facet.registerRecipient(data, member);
    }

    function test_registerRecipient_arbitratorNotSet() public {
        ArbitrableConfig memory config = ArbitrableConfig(IArbitrator(address(0)), payable(address(0)), 1, 0, 0, 0);
        facet.setArbitrableConfig(2, config);
        CreateProposal memory proposal =
            CreateProposal(1, beneficiary, 10, poolToken, Metadata({protocol: 1, pointer: "p"}));
        bytes memory data = abi.encode(proposal);
        vm.prank(address(allo));
        vm.expectRevert(CVProposalFacet.ArbitratorNotSet.selector);
        facet.registerRecipient(data, member);
    }

    function test_registerRecipient_insufficientCollateral() public {
        CreateProposal memory proposal =
            CreateProposal(1, beneficiary, 10, poolToken, Metadata({protocol: 1, pointer: "p"}));
        bytes memory data = abi.encode(proposal);
        vm.prank(address(allo));
        vm.expectRevert(abi.encodeWithSelector(CVProposalFacet.InsufficientCollateral.selector, 0, 1 ether));
        facet.registerRecipient(data, member);
    }

    function test_cancelProposal_success() public {
        facet.seedProposal(1, member, beneficiary, poolToken, 10, ProposalStatus.Active, block.timestamp, 0);
        vm.prank(member);
        facet.cancelProposal(1);
        assertEq(collateralVault.lastProposalId(), 1);
        assertEq(collateralVault.lastAccount(), member);
        assertEq(collateralVault.lastAmount(), 1 ether);
        assertEq(uint8(facet.getProposalStatus(1)), uint8(ProposalStatus.Cancelled));
    }

    function test_cancelProposal_revertWhenNotActive() public {
        facet.seedProposal(1, member, beneficiary, poolToken, 10, ProposalStatus.Executed, block.timestamp, 0);
        vm.prank(member);
        vm.expectRevert(
            abi.encodeWithSelector(CVProposalFacet.ProposalNotActive.selector, 1, uint8(ProposalStatus.Executed))
        );
        facet.cancelProposal(1);
    }

    function test_cancelProposal_revertWhenNotSubmitter() public {
        facet.seedProposal(1, member, beneficiary, poolToken, 10, ProposalStatus.Active, block.timestamp, 0);
        vm.prank(address(0xB0B));
        vm.expectRevert(abi.encodeWithSelector(CVStrategyBaseFacet.OnlySubmitter.selector, 1, member, address(0xB0B)));
        facet.cancelProposal(1);
    }

    function test_editProposal_revertWhenNotActive() public {
        facet.seedProposal(1, member, beneficiary, poolToken, 10, ProposalStatus.Cancelled, block.timestamp, 0);
        vm.prank(member);
        vm.expectRevert(
            abi.encodeWithSelector(CVProposalFacet.ProposalNotActive.selector, 1, uint8(ProposalStatus.Cancelled))
        );
        facet.editProposal(1, Metadata({protocol: 1, pointer: "new"}), beneficiary, 10);
    }

    function test_editProposal_revertWhenNotSubmitter() public {
        facet.seedProposal(1, member, beneficiary, poolToken, 10, ProposalStatus.Active, block.timestamp, 0);
        vm.prank(address(0xB0B));
        vm.expectRevert(abi.encodeWithSelector(CVStrategyBaseFacet.OnlySubmitter.selector, 1, member, address(0xB0B)));
        facet.editProposal(1, Metadata({protocol: 1, pointer: "new"}), beneficiary, 10);
    }

    function test_editProposal_revertWhenConvictionActive() public {
        facet.seedProposal(1, member, beneficiary, poolToken, 10, ProposalStatus.Active, block.timestamp, 1);
        vm.prank(member);
        vm.expectRevert(
            abi.encodeWithSelector(CVProposalFacet.CannotEditRequestedAmountWithActiveSupport.selector, 1, 10, 11)
        );
        facet.editProposal(1, Metadata({protocol: 1, pointer: "meta"}), beneficiary, 11);
    }

    function test_editProposal_revertBeneficiaryTimeout() public {
        vm.warp(5000);
        facet.seedProposal(1, member, beneficiary, poolToken, 10, ProposalStatus.Active, block.timestamp - 4000, 0);
        vm.prank(member);
        vm.expectRevert(
            abi.encodeWithSelector(
                CVProposalFacet.BeneficiaryEditTimeout.selector, 1, beneficiary, address(0xB0B), block.timestamp - 4000
            )
        );
        facet.editProposal(1, Metadata({protocol: 1, pointer: "meta"}), address(0xB0B), 10);
    }

    function test_editProposal_revertMetadataTimeout() public {
        vm.warp(5000);
        facet.seedProposal(1, member, beneficiary, poolToken, 10, ProposalStatus.Active, block.timestamp - 4000, 0);
        vm.prank(member);
        vm.expectRevert(
            abi.encodeWithSelector(
                CVProposalFacet.MetadataEditTimeout.selector, 1, "meta", "newmeta", block.timestamp - 4000
            )
        );
        facet.editProposal(1, Metadata({protocol: 1, pointer: "newmeta"}), beneficiary, 10);
    }

    function test_editProposal_successWithinWindow() public {
        facet.seedProposal(1, member, beneficiary, poolToken, 10, ProposalStatus.Active, block.timestamp, 0);
        vm.prank(member);
        facet.editProposal(1, Metadata({protocol: 1, pointer: "newmeta"}), address(0xB0B), 11);
        assertEq(facet.getProposalRequestedAmount(1), 11);
        assertEq(facet.getProposalBeneficiary(1), address(0xB0B));
        assertEq(facet.getProposalMetadataPointer(1), "newmeta");
    }
}

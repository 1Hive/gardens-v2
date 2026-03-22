// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./BaseMultiChain.s.sol";
import {CVAdminFacet} from "../src/CVStrategy/facets/CVAdminFacet.sol";
import {CVAllocationFacet} from "../src/CVStrategy/facets/CVAllocationFacet.sol";
import {CVDisputeFacet} from "../src/CVStrategy/facets/CVDisputeFacet.sol";
import {CVPauseFacet} from "../src/CVStrategy/facets/CVPauseFacet.sol";
import {CVPowerFacet} from "../src/CVStrategy/facets/CVPowerFacet.sol";
import {CVProposalFacet} from "../src/CVStrategy/facets/CVProposalFacet.sol";
import {CVSyncPowerFacet} from "../src/CVStrategy/facets/CVSyncPowerFacet.sol";
import {CVStreamingFacet} from "../src/CVStrategy/facets/CVStreamingFacet.sol";
import {DiamondLoupeFacet} from "../src/diamonds/facets/DiamondLoupeFacet.sol";
import {CommunityAdminFacet} from "../src/RegistryCommunity/facets/CommunityAdminFacet.sol";
import {CommunityMemberFacet} from "../src/RegistryCommunity/facets/CommunityMemberFacet.sol";
import {CommunityPauseFacet} from "../src/RegistryCommunity/facets/CommunityPauseFacet.sol";
import {CommunityPoolFacet} from "../src/RegistryCommunity/facets/CommunityPoolFacet.sol";
import {CommunityPowerFacet} from "../src/RegistryCommunity/facets/CommunityPowerFacet.sol";
import {CommunityStrategyFacet} from "../src/RegistryCommunity/facets/CommunityStrategyFacet.sol";

contract RefreshFacetSnapshots is BaseMultiChain {
    enum FacetKind {
        DiamondLoupe,
        CVAdmin,
        CVAllocation,
        CVDispute,
        CVPause,
        CVPower,
        CVProposal,
        CVSyncPower,
        CVStreaming,
        CommunityAdmin,
        CommunityMember,
        CommunityPause,
        CommunityPool,
        CommunityPower,
        CommunityStrategy
    }

    function runCurrentNetwork(string memory) public override {
        _refreshFacet(
            ".FACETS.DIAMOND_LOUPE",
            "src/diamonds/facets/DiamondLoupeFacet.sol:DiamondLoupeFacet",
            FacetKind.DiamondLoupe
        );

        _refreshFacet(".FACETS.CV_ADMIN", "src/CVStrategy/facets/CVAdminFacet.sol:CVAdminFacet", FacetKind.CVAdmin);
        _refreshFacet(
            ".FACETS.CV_ALLOCATION",
            "src/CVStrategy/facets/CVAllocationFacet.sol:CVAllocationFacet",
            FacetKind.CVAllocation
        );
        _refreshFacet(
            ".FACETS.CV_DISPUTE", "src/CVStrategy/facets/CVDisputeFacet.sol:CVDisputeFacet", FacetKind.CVDispute
        );
        _refreshFacet(".FACETS.CV_PAUSE", "src/CVStrategy/facets/CVPauseFacet.sol:CVPauseFacet", FacetKind.CVPause);
        _refreshFacet(".FACETS.CV_POWER", "src/CVStrategy/facets/CVPowerFacet.sol:CVPowerFacet", FacetKind.CVPower);
        _refreshFacet(
            ".FACETS.CV_PROPOSAL", "src/CVStrategy/facets/CVProposalFacet.sol:CVProposalFacet", FacetKind.CVProposal
        );
        _refreshFacet(
            ".FACETS.CV_SYNC_POWER",
            "src/CVStrategy/facets/CVSyncPowerFacet.sol:CVSyncPowerFacet",
            FacetKind.CVSyncPower
        );
        _refreshFacet(
            ".FACETS.CV_STREAMING",
            "src/CVStrategy/facets/CVStreamingFacet.sol:CVStreamingFacet",
            FacetKind.CVStreaming
        );

        _refreshFacet(
            ".FACETS.COMMUNITY_ADMIN",
            "src/RegistryCommunity/facets/CommunityAdminFacet.sol:CommunityAdminFacet",
            FacetKind.CommunityAdmin
        );
        _refreshFacet(
            ".FACETS.COMMUNITY_MEMBER",
            "src/RegistryCommunity/facets/CommunityMemberFacet.sol:CommunityMemberFacet",
            FacetKind.CommunityMember
        );
        _refreshFacet(
            ".FACETS.COMMUNITY_PAUSE",
            "src/RegistryCommunity/facets/CommunityPauseFacet.sol:CommunityPauseFacet",
            FacetKind.CommunityPause
        );
        _refreshFacet(
            ".FACETS.COMMUNITY_POOL",
            "src/RegistryCommunity/facets/CommunityPoolFacet.sol:CommunityPoolFacet",
            FacetKind.CommunityPool
        );
        _refreshFacet(
            ".FACETS.COMMUNITY_POWER",
            "src/RegistryCommunity/facets/CommunityPowerFacet.sol:CommunityPowerFacet",
            FacetKind.CommunityPower
        );
        _refreshFacet(
            ".FACETS.COMMUNITY_STRATEGY",
            "src/RegistryCommunity/facets/CommunityStrategyFacet.sol:CommunityStrategyFacet",
            FacetKind.CommunityStrategy
        );
    }

    function _refreshFacet(string memory key, string memory artifactId, FacetKind kind) internal {
        address cached = _readAddressOrZero(key);
        bytes32 expectedCodeHash = _runtimeCodeHash(artifactId);
        bool needsRedeploy =
            cached == address(0) || cached.code.length == 0 || cached.codehash != expectedCodeHash;

        if (!needsRedeploy) return;

        address deployed = _deployFacet(kind);
        _writeNetworkAddress(key, deployed);
    }

    function _deployFacet(FacetKind kind) internal returns (address) {
        if (kind == FacetKind.DiamondLoupe) return address(new DiamondLoupeFacet());
        if (kind == FacetKind.CVAdmin) return address(new CVAdminFacet());
        if (kind == FacetKind.CVAllocation) return address(new CVAllocationFacet());
        if (kind == FacetKind.CVDispute) return address(new CVDisputeFacet());
        if (kind == FacetKind.CVPause) return address(new CVPauseFacet());
        if (kind == FacetKind.CVPower) return address(new CVPowerFacet());
        if (kind == FacetKind.CVProposal) return address(new CVProposalFacet());
        if (kind == FacetKind.CVSyncPower) return address(new CVSyncPowerFacet());
        if (kind == FacetKind.CVStreaming) return address(new CVStreamingFacet());
        if (kind == FacetKind.CommunityAdmin) return address(new CommunityAdminFacet());
        if (kind == FacetKind.CommunityMember) return address(new CommunityMemberFacet());
        if (kind == FacetKind.CommunityPause) return address(new CommunityPauseFacet());
        if (kind == FacetKind.CommunityPool) return address(new CommunityPoolFacet());
        if (kind == FacetKind.CommunityPower) return address(new CommunityPowerFacet());
        if (kind == FacetKind.CommunityStrategy) return address(new CommunityStrategyFacet());
        revert("unknown facet kind");
    }

    function _runtimeCodeHash(string memory artifactId) internal returns (bytes32) {
        bytes memory deployedCode = vm.getDeployedCode(artifactId);
        if (deployedCode.length == 0) {
            revert("missing deployed bytecode for artifact");
        }
        return keccak256(deployedCode);
    }

}

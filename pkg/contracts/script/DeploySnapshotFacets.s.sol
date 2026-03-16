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
import {CommunityAdminFacet} from "../src/RegistryCommunity/facets/CommunityAdminFacet.sol";
import {CommunityMemberFacet} from "../src/RegistryCommunity/facets/CommunityMemberFacet.sol";
import {CommunityPauseFacet} from "../src/RegistryCommunity/facets/CommunityPauseFacet.sol";
import {CommunityPoolFacet} from "../src/RegistryCommunity/facets/CommunityPoolFacet.sol";
import {CommunityPowerFacet} from "../src/RegistryCommunity/facets/CommunityPowerFacet.sol";
import {CommunityStrategyFacet} from "../src/RegistryCommunity/facets/CommunityStrategyFacet.sol";
import {DiamondLoupeFacet} from "../src/diamonds/facets/DiamondLoupeFacet.sol";

contract DeploySnapshotFacets is BaseMultiChain {
    enum FacetTarget {
        All,
        Strategy,
        Community
    }

    FacetTarget public target = FacetTarget.All;

    function runStrategy(string memory network) public {
        target = FacetTarget.Strategy;
        run(network);
    }

    function runCommunity(string memory network) public {
        target = FacetTarget.Community;
        run(network);
    }

    function run(string memory network, string memory targetName) public {
        target = _parseTarget(targetName);
        run(network);
    }

    function runCurrentNetwork(string memory) public override {
        bool doStrategy = target == FacetTarget.All || target == FacetTarget.Strategy;
        bool doCommunity = target == FacetTarget.All || target == FacetTarget.Community;

        _deployAndSnapshotLoupe();

        if (doStrategy) {
            _deployAndSnapshotStrategyFacets();
        }

        if (doCommunity) {
            _deployAndSnapshotCommunityFacets();
        }
    }

    function _deployAndSnapshotLoupe() internal {
        DiamondLoupeFacet loupe = new DiamondLoupeFacet();
        _writeNetworkAddress(".FACETS.DIAMOND_LOUPE", address(loupe));
    }

    function _deployAndSnapshotStrategyFacets() internal {
        CVAdminFacet cvAdmin = new CVAdminFacet();
        CVAllocationFacet cvAllocation = new CVAllocationFacet();
        CVDisputeFacet cvDispute = new CVDisputeFacet();
        CVPauseFacet cvPause = new CVPauseFacet();
        CVPowerFacet cvPower = new CVPowerFacet();
        CVProposalFacet cvProposal = new CVProposalFacet();
        CVSyncPowerFacet cvSyncPower = new CVSyncPowerFacet();
        CVStreamingFacet cvStreaming = new CVStreamingFacet();

        _writeNetworkAddress(".FACETS.CV_ADMIN", address(cvAdmin));
        _writeNetworkAddress(".FACETS.CV_ALLOCATION", address(cvAllocation));
        _writeNetworkAddress(".FACETS.CV_DISPUTE", address(cvDispute));
        _writeNetworkAddress(".FACETS.CV_PAUSE", address(cvPause));
        _writeNetworkAddress(".FACETS.CV_POWER", address(cvPower));
        _writeNetworkAddress(".FACETS.CV_PROPOSAL", address(cvProposal));
        _writeNetworkAddress(".FACETS.CV_SYNC_POWER", address(cvSyncPower));
        _writeNetworkAddress(".FACETS.CV_STREAMING", address(cvStreaming));

    }

    function _deployAndSnapshotCommunityFacets() internal {
        CommunityAdminFacet communityAdmin = new CommunityAdminFacet();
        CommunityMemberFacet communityMember = new CommunityMemberFacet();
        CommunityPauseFacet communityPause = new CommunityPauseFacet();
        CommunityPoolFacet communityPool = new CommunityPoolFacet();
        CommunityPowerFacet communityPower = new CommunityPowerFacet();
        CommunityStrategyFacet communityStrategy = new CommunityStrategyFacet();

        _writeNetworkAddress(".FACETS.COMMUNITY_ADMIN", address(communityAdmin));
        _writeNetworkAddress(".FACETS.COMMUNITY_MEMBER", address(communityMember));
        _writeNetworkAddress(".FACETS.COMMUNITY_PAUSE", address(communityPause));
        _writeNetworkAddress(".FACETS.COMMUNITY_POOL", address(communityPool));
        _writeNetworkAddress(".FACETS.COMMUNITY_POWER", address(communityPower));
        _writeNetworkAddress(".FACETS.COMMUNITY_STRATEGY", address(communityStrategy));

    }

    function _parseTarget(string memory targetName) internal pure returns (FacetTarget) {
        bytes32 targetHash = keccak256(bytes(targetName));
        if (targetHash == keccak256(bytes("all"))) return FacetTarget.All;
        if (targetHash == keccak256(bytes("strategy"))) return FacetTarget.Strategy;
        if (targetHash == keccak256(bytes("community"))) return FacetTarget.Community;
        revert("invalid target, use all|strategy|community");
    }

    function _writeNetworkAddress(string memory key, address value) internal {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/pkg/contracts/config/networks.json");
        string memory tmpPath = string.concat(root, "/pkg/contracts/config/.networks.tmp.json");
        string memory command = string.concat(
            "jq '(.networks[] | select(.name==\"",
            CURRENT_NETWORK,
            "\") | ",
            key,
            ") = \"",
            _addressToString(value),
            "\"' ",
            path,
            " > ",
            tmpPath,
            " && mv ",
            tmpPath,
            " ",
            path
        );

        string[] memory inputs = new string[](3);
        inputs[0] = "bash";
        inputs[1] = "-c";
        inputs[2] = command;
        vm.ffi(inputs);
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
}

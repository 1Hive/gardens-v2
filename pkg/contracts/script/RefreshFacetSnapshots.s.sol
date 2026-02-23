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

    function _readAddressOrZero(string memory key) internal returns (address) {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/pkg/contracts/config/networks.json");
        string memory command = string.concat(
            "jq -r '(.networks[] | select(.name==\"", CURRENT_NETWORK, "\") | ", key, " // empty)' ", path
        );

        string[] memory inputs = new string[](3);
        inputs[0] = "bash";
        inputs[1] = "-c";
        inputs[2] = command;
        bytes memory result = vm.ffi(inputs);

        if (result.length == 20) {
            return address(bytes20(result));
        }

        string memory value = _trim(string(result));
        if (bytes(value).length == 0 || keccak256(bytes(value)) == keccak256(bytes("null"))) {
            return address(0);
        }
        return _parseAddress(value);
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

    function _trim(string memory input) internal pure returns (string memory) {
        bytes memory inputBytes = bytes(input);
        uint256 start = 0;
        uint256 end = inputBytes.length;
        while (start < end && _isWhitespace(inputBytes[start])) start++;
        while (end > start && _isWhitespace(inputBytes[end - 1])) end--;

        bytes memory trimmed = new bytes(end - start);
        for (uint256 i = 0; i < trimmed.length; i++) {
            trimmed[i] = inputBytes[start + i];
        }
        return string(trimmed);
    }

    function _isWhitespace(bytes1 char) internal pure returns (bool) {
        return char == 0x20 || char == 0x0a || char == 0x0d || char == 0x09;
    }

    function _parseAddress(string memory value) internal pure returns (address) {
        bytes memory data = bytes(value);
        if (data.length != 42 || data[0] != "0" || data[1] != "x") {
            return address(0);
        }
        uint160 result = 0;
        for (uint256 i = 2; i < 42; i++) {
            uint8 nibble = _fromHexChar(data[i]);
            if (nibble > 15) return address(0);
            result = (result << 4) | uint160(nibble);
        }
        return address(result);
    }

    function _fromHexChar(bytes1 char) internal pure returns (uint8) {
        uint8 value = uint8(char);
        if (value >= 48 && value <= 57) return value - 48;
        if (value >= 65 && value <= 70) return value - 55;
        if (value >= 97 && value <= 102) return value - 87;
        return 255;
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

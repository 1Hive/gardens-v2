// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {CVStreamingFacet} from "../src/CVStrategy/facets/CVStreamingFacet.sol";
import {Proposal, ProposalType} from "../src/CVStrategy/ICVStrategy.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";

interface IStreamingOpenProposalRecovery {
    function recoverOpenStreamingProposals(uint256[] calldata proposalIds, address[] calldata escrows) external;
}

contract CVStreamingRecoveryFacet is CVStreamingFacet {
    error RecoveryInputLengthMismatch();
    error RecoveryEscrowZero(uint256 proposalId);
    error RecoveryNotStreamingStrategy();
    error RecoveryProposalMissing(uint256 proposalId);

    event OpenStreamingProposalRecovered(uint256 indexed proposalId, address indexed escrow);

    function recoverOpenStreamingProposals(uint256[] calldata proposalIds, address[] calldata escrows)
        external
        onlyOwner
    {
        if (proposalIds.length != escrows.length) {
            revert RecoveryInputLengthMismatch();
        }
        if (proposalType != ProposalType.Streaming) {
            revert RecoveryNotStreamingStrategy();
        }

        for (uint256 i = 0; i < proposalIds.length; i++) {
            uint256 proposalId = proposalIds[i];
            address escrow = escrows[i];
            if (escrow == address(0)) {
                revert RecoveryEscrowZero(proposalId);
            }

            Proposal storage proposal = proposals[proposalId];
            if (proposal.proposalId == 0) {
                revert RecoveryProposalMissing(proposalId);
            }

            setStreamingEscrow(proposalId, escrow);
            if (!_isTerminalProposalStatus(proposal.proposalStatus)) {
                _addOpenStreamingProposal(proposalId);
            }
            emit OpenStreamingProposalRecovered(proposalId, escrow);
        }

        openStreamingProposalsInitialized = true;
    }
}

contract RecoverStreamingProposalEscrowsScript is BaseMultiChain {
    using stdJson for string;

    uint256 internal constant STRATEGY_STREAMING_FACET_CUT_INDEX = 8;

    function runCurrentNetwork(string memory networkJson) public override {
        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        address[] memory strategies = _streamingStrategies();

        CVStreamingRecoveryFacet recoveryFacet = new CVStreamingRecoveryFacet();
        _applyRecoveryFacetAndRecover(address(recoveryFacet));

        CVStreamingFacet finalStreamingFacet = new CVStreamingFacet();
        for (uint256 i = 0; i < strategies.length; i++) {
            _applyFinalStreamingFacet(strategies[i], address(finalStreamingFacet));
        }

        RegistryFactory(payable(registryFactoryProxy)).upsertStrategyFacetCut(
            STRATEGY_STREAMING_FACET_CUT_INDEX,
            address(finalStreamingFacet),
            IDiamond.FacetCutAction.Auto,
            _streamingSelectors()
        );
        _writeNetworkAddress(".FACETS.CV_STREAMING", address(finalStreamingFacet));

        _rebalanceRecoveredStrategies();
    }

    function _streamingStrategies() internal view returns (address[] memory strategies) {
        bytes32 networkHash = keccak256(bytes(CURRENT_NETWORK));
        if (networkHash == keccak256(bytes("arbitrum"))) {
            strategies = new address[](1);
            strategies[0] = address(bytes20(hex"6f29c8e529df6ce316299e9df90bf3b11a65458b"));
        } else if (networkHash == keccak256(bytes("optimism"))) {
            strategies = new address[](3);
            strategies[0] = address(bytes20(hex"09de77c01f8906340b27ff2d70c464b4ccc24701"));
            strategies[1] = address(bytes20(hex"2b1915a2e0293b3a434df58b921d8f7e320da077"));
            strategies[2] = address(bytes20(hex"fc3fd2d3f7d1cfe713cdb10d44b657e185c1838f"));
        } else if (networkHash == keccak256(bytes("base"))) {
            strategies = new address[](3);
            strategies[0] = address(bytes20(hex"4ab0b4e5fd4631f78e4ec62716f3faafa4db18ec"));
            strategies[1] = address(bytes20(hex"90511fa9632c9fab34188e726ff6fc9881514be8"));
            strategies[2] = address(bytes20(hex"9180c4e7b2daf158ddf6221fd3be940737cdd268"));
        } else if (networkHash == keccak256(bytes("celo"))) {
            strategies = new address[](4);
            strategies[0] = address(bytes20(hex"5999073f8ec583a60513940b477de4c07805ab58"));
            strategies[1] = address(bytes20(hex"84ca383b4c254806b30d2d49fd75b4b5adf7b8ae"));
            strategies[2] = address(bytes20(hex"bd9f40cc8faef45bdc1768304ed8d60468d2bec7"));
            strategies[3] = address(bytes20(hex"c60252c03ea4ad1c7b1662401539646063649b2e"));
        } else {
            strategies = new address[](0);
        }
    }

    function _applyRecoveryFacetAndRecover(address recoveryFacet) internal {
        bytes32 networkHash = keccak256(bytes(CURRENT_NETWORK));
        if (networkHash == keccak256(bytes("arbitrum"))) {
            _recoverArbitrum(recoveryFacet);
        } else if (networkHash == keccak256(bytes("optimism"))) {
            _recoverOptimism(recoveryFacet);
        } else if (networkHash == keccak256(bytes("base"))) {
            _recoverBase(recoveryFacet);
        } else if (networkHash == keccak256(bytes("celo"))) {
            _recoverCelo(recoveryFacet);
        }
    }

    function _rebalanceRecoveredStrategies() internal {
        bytes32 networkHash = keccak256(bytes(CURRENT_NETWORK));
        if (networkHash == keccak256(bytes("arbitrum"))) {
            _tryRebalance(address(bytes20(hex"6f29c8e529df6ce316299e9df90bf3b11a65458b")));
        } else if (networkHash == keccak256(bytes("optimism"))) {
            _tryRebalance(address(bytes20(hex"2b1915a2e0293b3a434df58b921d8f7e320da077")));
        } else if (networkHash == keccak256(bytes("base"))) {
            _tryRebalance(address(bytes20(hex"9180c4e7b2daf158ddf6221fd3be940737cdd268")));
        } else if (networkHash == keccak256(bytes("celo"))) {
            _tryRebalance(address(bytes20(hex"5999073f8ec583a60513940b477de4c07805ab58")));
            _tryRebalance(address(bytes20(hex"84ca383b4c254806b30d2d49fd75b4b5adf7b8ae")));
            _tryRebalance(address(bytes20(hex"bd9f40cc8faef45bdc1768304ed8d60468d2bec7")));
        }
    }

    function _recoverArbitrum(address recoveryFacet) internal {
        uint256[] memory ids = new uint256[](1);
        address[] memory escrows = new address[](1);
        ids[0] = 1;
        escrows[0] = address(bytes20(hex"482a77f998c8821714a9ded77805ca552f61efef"));
        _recover(address(bytes20(hex"6f29c8e529df6ce316299e9df90bf3b11a65458b")), recoveryFacet, ids, escrows);
    }

    function _recoverOptimism(address recoveryFacet) internal {
        uint256[] memory ids = new uint256[](4);
        address[] memory escrows = new address[](4);
        ids[0] = 1;
        escrows[0] = address(bytes20(hex"9fa78daae2b1ef3909a647ae883e1dc5981baf64"));
        ids[1] = 2;
        escrows[1] = address(bytes20(hex"bd19e88a5534216ab9da242bd201575a1008f385"));
        ids[2] = 3;
        escrows[2] = address(bytes20(hex"e27a99b53d96dcd1280ac60337a44dbe13ab2138"));
        ids[3] = 4;
        escrows[3] = address(bytes20(hex"70f21a2dfbbad29b90daa20861e5318e0e7a40ff"));
        _recover(address(bytes20(hex"2b1915a2e0293b3a434df58b921d8f7e320da077")), recoveryFacet, ids, escrows);
    }

    function _recoverBase(address recoveryFacet) internal {
        uint256[] memory ids = new uint256[](2);
        address[] memory escrows = new address[](2);
        ids[0] = 1;
        escrows[0] = address(bytes20(hex"8688103495d889bd2af36d90b61453bb5e6e5f1d"));
        ids[1] = 2;
        escrows[1] = address(bytes20(hex"6ec67251e961703f000a5b6cd123e3e8256c650c"));
        _recover(address(bytes20(hex"9180c4e7b2daf158ddf6221fd3be940737cdd268")), recoveryFacet, ids, escrows);
    }

    function _recoverCelo(address recoveryFacet) internal {
        _recoverCeloOlam(recoveryFacet);
        _recoverCeloEcosystem(recoveryFacet);
        _recoverCeloCommunityModeration(recoveryFacet);
    }

    function _recoverCeloOlam(address recoveryFacet) internal {
        uint256[] memory ids = new uint256[](3);
        address[] memory escrows = new address[](3);
        ids[0] = 1;
        escrows[0] = address(bytes20(hex"6db30eaaa2245d17f92b9218f057690fe41dc821"));
        ids[1] = 2;
        escrows[1] = address(bytes20(hex"65c73bfcaf515089938c042feae18538635b97a3"));
        ids[2] = 3;
        escrows[2] = address(bytes20(hex"403bbb3823aea853e53c32a3702d775e981de8ad"));
        _recover(address(bytes20(hex"5999073f8ec583a60513940b477de4c07805ab58")), recoveryFacet, ids, escrows);
    }

    function _recoverCeloEcosystem(address recoveryFacet) internal {
        uint256[] memory ids = new uint256[](9);
        address[] memory escrows = new address[](9);
        ids[0] = 1;
        escrows[0] = address(bytes20(hex"1262490185e17c953bdfbb55b0e0aacd5857fe31"));
        ids[1] = 2;
        escrows[1] = address(bytes20(hex"fbc240b61fa7e15e22a2e7d26d3de599d3ae8570"));
        ids[2] = 3;
        escrows[2] = address(bytes20(hex"90788483c63fec9398527c16fa4c1a85dc6325f2"));
        ids[3] = 4;
        escrows[3] = address(bytes20(hex"b315bb3a09a35499bc0af486cbe60786ca2a8ad5"));
        ids[4] = 5;
        escrows[4] = address(bytes20(hex"032af14586adfe35771466143aa15aeb7108bd84"));
        ids[5] = 6;
        escrows[5] = address(bytes20(hex"1dcd81ff63d68812831d72efcaaa979e5bb3a724"));
        ids[6] = 7;
        escrows[6] = address(bytes20(hex"4daaf2834fbfb1dee5044523f9194e51719b4055"));
        ids[7] = 8;
        escrows[7] = address(bytes20(hex"02123ccf28a32ddbfb8264302428792d9f8591a3"));
        ids[8] = 9;
        escrows[8] = address(bytes20(hex"5f39df532d9c5d3cccf80b58cf7238dfb8a45bf0"));
        _recover(address(bytes20(hex"84ca383b4c254806b30d2d49fd75b4b5adf7b8ae")), recoveryFacet, ids, escrows);
    }

    function _recoverCeloCommunityModeration(address recoveryFacet) internal {
        uint256[] memory ids = new uint256[](5);
        address[] memory escrows = new address[](5);
        ids[0] = 1;
        escrows[0] = address(bytes20(hex"a03a86808b9fc69742c2154ddf8766f9ed4934f3"));
        ids[1] = 2;
        escrows[1] = address(bytes20(hex"047bea9559d3192b94e73703b61e61cd8d98304d"));
        ids[2] = 3;
        escrows[2] = address(bytes20(hex"8c5df294011726347a12a12f8a8ee4282051ec1a"));
        ids[3] = 4;
        escrows[3] = address(bytes20(hex"d9bd9449d3281d68a0127d25ef0f2f1a0990d1f4"));
        ids[4] = 5;
        escrows[4] = address(bytes20(hex"914a108fa91dc1ecbe5267ede29a7bbf314a4241"));
        _recover(address(bytes20(hex"bd9f40cc8faef45bdc1768304ed8d60468d2bec7")), recoveryFacet, ids, escrows);
    }

    function _recover(
        address strategy,
        address recoveryFacet,
        uint256[] memory ids,
        address[] memory escrows
    ) internal {
        bytes4[] memory selectors = _streamingSelectorsWithRecovery();
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: recoveryFacet,
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: selectors
        });
        IDiamondCut(strategy).diamondCut(cuts, address(0), "");
        IStreamingOpenProposalRecovery(strategy).recoverOpenStreamingProposals(ids, escrows);
    }

    function _applyFinalStreamingFacet(address strategy, address finalStreamingFacet) internal {
        bytes4 recoverySelector = IStreamingOpenProposalRecovery.recoverOpenStreamingProposals.selector;
        bool hasRecoverySelector = IDiamondLoupe(strategy).facetAddress(recoverySelector) != address(0);

        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](hasRecoverySelector ? 2 : 1);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: finalStreamingFacet,
            action: IDiamond.FacetCutAction.Auto,
            functionSelectors: _streamingSelectors()
        });
        if (hasRecoverySelector) {
            bytes4[] memory recoverySelectors = new bytes4[](1);
            recoverySelectors[0] = recoverySelector;
            cuts[1] = IDiamond.FacetCut({
                facetAddress: address(0),
                action: IDiamond.FacetCutAction.Remove,
                functionSelectors: recoverySelectors
            });
        }
        IDiamondCut(strategy).diamondCut(cuts, address(0), "");
    }

    function _tryRebalance(address strategy) internal {
        try CVStreamingFacet(strategy).rebalance() {} catch {}
    }

    function _streamingSelectorsWithRecovery() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](6);
        bytes4[] memory streamingSelectors = _streamingSelectors();
        for (uint256 i = 0; i < streamingSelectors.length; i++) {
            selectors[i] = streamingSelectors[i];
        }
        selectors[5] = IStreamingOpenProposalRecovery.recoverOpenStreamingProposals.selector;
    }

    function _streamingSelectors() internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](5);
        selectors[0] = CVStreamingFacet.rebalance.selector;
        selectors[1] = CVStreamingFacet.stopEscrowStream.selector;
        selectors[2] = CVStreamingFacet.setAuthorizedRebalanceCaller.selector;
        selectors[3] = CVStreamingFacet.isAuthorizedRebalanceCaller.selector;
        selectors[4] = CVStreamingFacet.wrapIfNeeded.selector;
    }
}

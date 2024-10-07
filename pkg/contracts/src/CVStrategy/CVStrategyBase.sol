// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "./CVStrategyStorage.sol";
import "./ICVStrategyBase.sol";

contract CVStrategyBase is ICVStrategyBase {
    using CVStrategyStorage for CVStrategyStorage.Layout;

    // Getter functions for all fields
    function getCollateralVaultTemplate() public view returns (address) {
        return CVStrategyStorage.layout().collateralVaultTemplate;
    }

    function getSurpressStateMutabilityWarning() public view returns (uint256) {
        return CVStrategyStorage.layout().surpressStateMutabilityWarning;
    }

    function getCloneNonce() public view returns (uint256) {
        return CVStrategyStorage.layout().cloneNonce;
    }

    function getDisputeCount() public view returns (uint64) {
        return CVStrategyStorage.layout().disputeCount;
    }

    function getProposalCounter() public view returns (uint256) {
        return CVStrategyStorage.layout().proposalCounter;
    }

    function getCurrentArbitrableConfigVersion() public view returns (uint256) {
        return CVStrategyStorage.layout().currentArbitrableConfigVersion;
    }

    function getTotalStaked() public view returns (uint256) {
        return CVStrategyStorage.layout().totalStaked;
    }

    function getTotalPointsActivated() public view returns (uint256) {
        return CVStrategyStorage.layout().totalPointsActivated;
    }

    function getCvParams() public view returns (CVParams memory) {
        return CVStrategyStorage.layout().cvParams;
    }

    function getProposalType() public view returns (ProposalType) {
        return CVStrategyStorage.layout().proposalType;
    }

    function getPointSystem() public view returns (PointSystem) {
        return CVStrategyStorage.layout().pointSystem;
    }

    function getPointConfig() public view returns (PointSystemConfig memory) {
        return CVStrategyStorage.layout().pointConfig;
    }

    function getRegistryCommunity() public view returns (address) {
        return CVStrategyStorage.layout().registryCommunity;
    }

    function getCollateralVault() public view returns (ICollateralVault) {
        return CVStrategyStorage.layout().collateralVault;
    }

    function getSybilScorer() public view returns (ISybilScorer) {
        return CVStrategyStorage.layout().sybilScorer;
    }

    function getProposalById(uint256 _proposalId) internal view returns (Proposal storage) {
        return CVStrategyStorage.layout().proposals[_proposalId];
    }

    function getTotalVoterStakePct(address _voter) public view returns (uint256) {
        return CVStrategyStorage.layout().totalVoterStakePct[_voter];
    }

    function getVoterStakedProposals(address _voter) public view returns (uint256[] memory) {
        return CVStrategyStorage.layout().voterStakedProposals[_voter];
    }

    function getProposalIdByDisputeId(uint256 _disputeId) public view returns (uint256) {
        return CVStrategyStorage.layout().disputeIdToProposalId[_disputeId];
    }

    function getArbitrableConfigById(uint256 _configId) public view returns (ArbitrableConfig memory) {
        return CVStrategyStorage.layout().arbitrableConfigs[_configId];
    }
}

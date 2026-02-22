// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyBaseFacet} from "../CVStrategyBaseFacet.sol";
import {IArbitrator} from "../../interfaces/IArbitrator.sol";
import {IVotingPowerRegistry} from "../../interfaces/IVotingPowerRegistry.sol";
import {IRegistryFactory} from "../../IRegistryFactory.sol";
import {Proposal, ArbitrableConfig, CVParams, ProposalType} from "../ICVStrategy.sol";
import {LibDiamond} from "../../diamonds/libraries/LibDiamond.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

/**
 * @title CVAdminFacet
 * @notice Facet containing admin functions for CVStrategy
 * @dev This facet is called via delegatecall from CVStrategy
 *      CRITICAL: Inherits storage layout from CVStrategyBaseFacet
 */
contract CVAdminFacet is CVStrategyBaseFacet {
    using SuperTokenV1Library for ISuperToken;

    /*|--------------------------------------------|*/
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/
    error SuperfluidGDAConnectFailed(address gda, address superToken, address caller); // 0x9bd2355f
    error SuperfluidGDADisconnectFailed(address gda, address superToken, address caller); // 0x3746bbff
    error VotingPowerRegistryNotAllowed(address target);
    error RebalanceCallFailed();

    /*|--------------------------------------------|*/
    /*|              EVENTS                        |*/
    /*|--------------------------------------------|*/
    event CVParamsUpdated(CVParams cvParams);
    event ArbitrableConfigUpdated(
        uint256 currentArbitrableConfigVersion,
        IArbitrator arbitrator,
        address tribunalSafe,
        uint256 submitterCollateralAmount,
        uint256 challengerCollateralAmount,
        uint256 defaultRuling,
        uint256 defaultRulingTimeout
    );
    event AllowlistMembersRemoved(uint256 poolId, address[] members);
    event AllowlistMembersAdded(uint256 poolId, address[] members);
    event SuperfluidTokenUpdated(address superfluidToken);
    event SuperfluidStreamingRateUpdated(uint256 streamingRatePerSecond);
    event SuperfluidGDAConnected(address indexed gda, address indexed by);
    event SuperfluidGDADisconnected(address indexed gda, address indexed by);
    event PointsDeactivated(address member);
    event VotingPowerRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);

    /*|--------------------------------------------|*/
    /*|              FUNCTIONS                     |*/
    /*|--------------------------------------------|*/

    // Sig: 0xd5b7cc54
    function setPoolParams(
        ArbitrableConfig memory _arbitrableConfig,
        CVParams memory _cvParams,
        uint256 _sybilScoreThreshold,
        address[] memory _membersToAdd,
        address[] memory _membersToRemove,
        address _superfluidToken
    ) external {
        _setPoolParamsCore(
            _arbitrableConfig,
            _cvParams,
            _sybilScoreThreshold,
            _membersToAdd,
            _membersToRemove,
            _superfluidToken,
            streamingRatePerSecond
        );
    }

    // Sig: 0x2bbe0cae
    function setPoolParams(
        ArbitrableConfig memory _arbitrableConfig,
        CVParams memory _cvParams,
        uint256 _sybilScoreThreshold,
        address[] memory _membersToAdd,
        address[] memory _membersToRemove,
        address _superfluidToken,
        uint256 _streamingRatePerSecond
    ) external {
        _setPoolParamsCore(
            _arbitrableConfig,
            _cvParams,
            _sybilScoreThreshold,
            _membersToAdd,
            _membersToRemove,
            _superfluidToken,
            _streamingRatePerSecond
        );
    }

    function _setPoolParamsCore(
        ArbitrableConfig memory _arbitrableConfig,
        CVParams memory _cvParams,
        uint256 _sybilScoreThreshold,
        address[] memory _membersToAdd,
        address[] memory _membersToRemove,
        address _superfluidToken,
        uint256 _streamingRatePerSecond
    ) internal {
        onlyCouncilSafe();

        uint256 previousStreamingRatePerSecond = streamingRatePerSecond;
        superfluidToken = ISuperToken(_superfluidToken);
        streamingRatePerSecond = _streamingRatePerSecond;
        emit SuperfluidTokenUpdated(_superfluidToken);
        emit SuperfluidStreamingRateUpdated(_streamingRatePerSecond);

        _setPoolParams(_arbitrableConfig, _cvParams, _membersToAdd, _membersToRemove);

        if (address(sybilScorer) != address(0) && _sybilScoreThreshold > 0) {
            sybilScorer.modifyThreshold(address(this), _sybilScoreThreshold);
        }

        if (proposalType == ProposalType.Streaming && previousStreamingRatePerSecond != _streamingRatePerSecond) {
            (bool success,) = address(this).call(abi.encodeWithSignature("rebalance()"));
            if (!success) {
                revert RebalanceCallFailed();
            }
        }
    }

    // Sig: 0x924e6704
    function connectSuperfluidGDA(address gda) external {
        onlyCouncilSafeOrMember();
        ISuperToken supertoken =
            address(superfluidToken) != address(0) ? superfluidToken : ISuperToken(allo.getPool(poolId).token);
        bool success = supertoken.connectPool(ISuperfluidPool(gda));
        if (!success) {
            revert SuperfluidGDAConnectFailed(gda, address(supertoken), msg.sender);
        }
        emit SuperfluidGDAConnected(gda, msg.sender);
    }

    // Sig: 0xc69271ec
    function disconnectSuperfluidGDA(address gda) external {
        onlyCouncilSafeOrMember();
        ISuperToken supertoken =
            address(superfluidToken) != address(0) ? superfluidToken : ISuperToken(allo.getPool(poolId).token);
        bool success = supertoken.disconnectPool(ISuperfluidPool(gda));
        if (!success) {
            revert SuperfluidGDADisconnectFailed(gda, address(supertoken), msg.sender);
        }
        emit SuperfluidGDADisconnected(gda, msg.sender);
    }

    /*|--------------------------------------------|*/
    /*|      VOTING POWER REGISTRY MANAGEMENT     |*/
    /*|--------------------------------------------|*/

    /// @notice Update the voting power registry for this pool
    /// @dev Only callable by council safe.
    ///      Registry must be registered on RegistryFactory
    function setVotingPowerRegistry(address _registry) public {
        onlyCouncilSafe();

        if (_registry != address(0) && _registry != address(registryCommunity)) {
            if (!IRegistryFactory(registryCommunity.registryFactory()).isContractRegistered(_registry)) {
                revert VotingPowerRegistryNotAllowed(_registry);
            }
        }

        address oldRegistry = address(votingPowerRegistry);
        votingPowerRegistry = _registry == address(0)
            ? IVotingPowerRegistry(address(registryCommunity))
            : IVotingPowerRegistry(_registry);
        emit VotingPowerRegistryUpdated(oldRegistry, address(votingPowerRegistry));
    }

    /*|--------------------------------------------|*/
    /*|              INTERNAL HELPERS              |*/
    /*|--------------------------------------------|*/

    function _setPoolParams(
        ArbitrableConfig memory _arbitrableConfig,
        CVParams memory _cvParams,
        address[] memory membersToAdd,
        address[] memory membersToRemove
    ) internal {
        if (membersToAdd.length > 0) {
            _addToAllowList(membersToAdd);
        }
        if (membersToRemove.length > 0) {
            _removeFromAllowList(membersToRemove);
        }

        if (
            _arbitrableConfig.tribunalSafe != address(0) && address(_arbitrableConfig.arbitrator) != address(0)
                && (_arbitrableConfig.tribunalSafe != arbitrableConfigs[currentArbitrableConfigVersion].tribunalSafe
                    || _arbitrableConfig.arbitrator != arbitrableConfigs[currentArbitrableConfigVersion].arbitrator
                    || _arbitrableConfig.submitterCollateralAmount
                        != arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount
                    || _arbitrableConfig.challengerCollateralAmount
                        != arbitrableConfigs[currentArbitrableConfigVersion].challengerCollateralAmount
                    || _arbitrableConfig.defaultRuling
                        != arbitrableConfigs[currentArbitrableConfigVersion].defaultRuling
                    || _arbitrableConfig.defaultRulingTimeout
                        != arbitrableConfigs[currentArbitrableConfigVersion].defaultRulingTimeout)
        ) {
            if (
                arbitrableConfigs[currentArbitrableConfigVersion].tribunalSafe != _arbitrableConfig.tribunalSafe
                    || arbitrableConfigs[currentArbitrableConfigVersion].arbitrator != _arbitrableConfig.arbitrator
            ) {
                _arbitrableConfig.arbitrator.registerSafe(_arbitrableConfig.tribunalSafe);
            }

            currentArbitrableConfigVersion++;
            arbitrableConfigs[currentArbitrableConfigVersion] = _arbitrableConfig;

            emit ArbitrableConfigUpdated(
                currentArbitrableConfigVersion,
                _arbitrableConfig.arbitrator,
                _arbitrableConfig.tribunalSafe,
                _arbitrableConfig.submitterCollateralAmount,
                _arbitrableConfig.challengerCollateralAmount,
                _arbitrableConfig.defaultRuling,
                _arbitrableConfig.defaultRulingTimeout
            );
        }

        if (!(_cvParams.decay == 0 && _cvParams.weight == 0 && _cvParams.maxRatio == 0
                    && _cvParams.minThresholdPoints == 0)) {
            cvParams = _cvParams;
            emit CVParamsUpdated(_cvParams);
        }
    }

    function _addToAllowList(address[] memory members) internal {
        bytes32 allowlistRole = keccak256(abi.encodePacked("ALLOWLIST", poolId));

        // we expect the UI to add address(0) back to the allowlist in case of removing all members
        if (registryCommunity.hasRole(allowlistRole, address(0))) {
            registryCommunity.revokeRole(allowlistRole, address(0));
        }
        for (uint256 i = 0; i < members.length; i++) {
            if (!registryCommunity.hasRole(allowlistRole, members[i])) {
                registryCommunity.grantRole(allowlistRole, members[i]);
            }
        }

        emit AllowlistMembersAdded(poolId, members);
    }

    function _removeFromAllowList(address[] memory members) internal {
        for (uint256 i = 0; i < members.length; i++) {
            if (registryCommunity.hasRole(keccak256(abi.encodePacked("ALLOWLIST", poolId)), members[i])) {
                registryCommunity.revokeRole(keccak256(abi.encodePacked("ALLOWLIST", poolId)), members[i]);
            }

            if (members[i] != address(0)) {
                _deactivatePoints(members[i]);
            }
        }

        emit AllowlistMembersRemoved(poolId, members);
    }

    function _deactivatePoints(address _member) internal {
        totalPointsActivated -= votingPowerRegistry.getMemberPowerInStrategy(_member, address(this));
        registryCommunity.deactivateMemberInStrategy(_member, address(this));
        // remove support from all proposals
        _withdraw(_member);
        emit PointsDeactivated(_member);
    }

    function _withdraw(address _member) internal {
        // remove all proposals from the member
        for (uint256 i = 0; i < voterStakedProposals[_member].length; i++) {
            uint256 proposalId = voterStakedProposals[_member][i];
            Proposal storage proposal = proposals[proposalId];
            if (proposal.proposalId > 0 && proposal.submitter != address(0)) {
                uint256 stakedPoints = proposal.voterStakedPoints[_member];
                proposal.voterStakedPoints[_member] = 0;
                proposal.stakedAmount -= stakedPoints;
                totalStaked -= stakedPoints;
            }
        }
        totalVoterStakePct[_member] = 0;
    }
}

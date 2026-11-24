// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CVStrategyBaseFacet} from "../CVStrategyBaseFacet.sol";
import {IArbitrator} from "../../interfaces/IArbitrator.sol";
import {Proposal, ProposalStatus, ArbitrableConfig} from "../ICVStrategy.sol";
import {CVStreamingStorage, CVStreamingBase} from "../CVStreamingStorage.sol";
import {StreamingEscrow} from "../StreamingEscrow.sol";
import {ConvictionsUtils} from "../ConvictionsUtils.sol";
import {IRegistryFactory} from "../../IRegistryFactory.sol";
import {ISafe} from "../../interfaces/ISafe.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {
    ISuperfluid, ISuperfluidToken, ISuperfluidGovernance, SuperfluidGovernanceConfigs
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

interface IStreamingEscrowSync {
    function syncOutflow() external;
    function depositAmount() external view returns (uint256);
    function drainToStrategy() external;
    function outflowDeposit() external view returns (uint256);
    function disputed() external view returns (bool);
}

/**
 * @title CVStreamingFacet
 * @notice Facet containing streaming-related functions for CVStrategy
 * @dev This facet is called via delegatecall from CVStrategy
 *      CRITICAL: Inherits storage layout from CVStrategyBaseFacet
 */
contract CVStreamingFacet is CVStrategyBaseFacet, CVStreamingBase {
    using SuperTokenV1Library for ISuperToken;
    struct SolvencyConfig {
        uint256 liquidationPeriod;
        uint256 minimumDeposit;
    }

    struct EscrowReserve {
        address escrow;
        uint128 units;
        uint256 capital;
        bool disputed;
    }

    /*|--------------------------------------------|*/
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/
    error StreamingRateOverflow(uint256 streamingRatePerSecond);
    error SuperTokenTransferFailed(address to, uint256 amount);
    error UpdateMemberUnitsFailed(address member, uint128 units);
    error ApproveFailed(address token, address spender, uint256 amount);
    error StreamingEscrowNotFound(address escrow);
    error UnauthorizedRebalanceCaller(address caller);

    event EscrowStreamStopped(address indexed escrow, address indexed stoppedBy);
    event EscrowSyncFailed(address indexed escrow, bytes reason);

    /*|--------------------------------------------|*/
    /*|              FUNCTIONS                     |*/
    /*|--------------------------------------------|*/

    /**
     * @notice Rebalance the outgoing streams based on current active proposals and their conviction levels
     * @dev This function should be called periodically to ensure that the outgoing streams reflect the current
     *      state of active proposals and their conviction levels. (rate limiting to be implemented in future)
     * Sig: 0x7d7c2a1c
     */
    function rebalance() external {
        if (!_isAuthorizedRebalanceCaller(msg.sender)) {
            revert UnauthorizedRebalanceCaller(msg.sender);
        }

        // Rate limiting
        if (rebalanceCooldown() != 0 && block.timestamp < lastRebalanceAt() + rebalanceCooldown()) {
            revert RebalanceCooldownActive(lastRebalanceAt() + rebalanceCooldown() - block.timestamp);
        }

        bool strategyEnabled = _isStrategyEnabled();
        if (!strategyEnabled) {
            bool didWorkWhenDisabled = _rebalanceWhenDisabled();
            if (didWorkWhenDisabled) {
                setLastRebalanceAt(block.timestamp);
            }
            return;
        }

        wrapIfNeeded();

        uint256 poolAmount = getPoolAmount();
        bool didMeaningfulWork = false;
        bool hadEscrowSyncError = false;
        bool syncedAnyEscrow = false;

        uint256 totalEligibleConviction = _totalEligibleConviction(poolAmount);

        // Start/update/stop stream based on pool conviction share.
        uint256 maxConviction = ConvictionsUtils.getMaxConviction(_getPoolThresholdPoints(), cvParams.decay);
        bool shouldStartStream = _shouldStartStream(totalEligibleConviction, maxConviction);
        uint256 requestedFlowRate = 0;
        if (shouldStartStream) {
            uint256 clampedConviction =
                totalEligibleConviction > maxConviction ? maxConviction : totalEligibleConviction;
            requestedFlowRate = (_streamingRatePerSecondInSuperTokenUnits() * clampedConviction) / maxConviction;
        }

        uint128 streamingUnitBudget = _streamingUnitBudget(requestedFlowRate);
        _updateProposalUnits(poolAmount, shouldStartStream, totalEligibleConviction, streamingUnitBudget);

        // Reserve the GDA deposit, one liquidation period of runway, and the
        // deposits needed by every active beneficiary outflow. A fresh escrow
        // must be funded before the GDA update invokes its SuperApp callback.
        uint256 solventFlowRate = _highestSolventRate(requestedFlowRate);
        if (solventFlowRate != requestedFlowRate) {
            _updateProposalUnits(
                poolAmount, solventFlowRate != 0, totalEligibleConviction, _streamingUnitBudget(solventFlowRate)
            );
        }

        int96 currentFlowRate = superfluidToken.getGDAFlowRate(address(this), superfluidGDA);
        // A decrease releases the old GDA deposit before funding escrow deltas.
        if (currentFlowRate > _toInt96StreamingRate(solventFlowRate)) {
            // The second call below supplies the final rate used for accounting.
            // slither-disable-next-line unused-return
            superfluidToken.distributeFlow(superfluidGDA, _toInt96StreamingRate(solventFlowRate));
        }
        _topUpEscrowsForRate(solventFlowRate);
        int96 actualFlowRate = superfluidToken.distributeFlow(superfluidGDA, _toInt96StreamingRate(solventFlowRate));
        if (currentFlowRate != actualFlowRate) {
            didMeaningfulWork = true;
            emit StreamRateUpdated(address(superfluidGDA), actualFlowRate > 0 ? uint256(uint96(actualFlowRate)) : 0);
        }

        uint256[] storage openProposalIds = openStreamingProposalIds;
        // Keep escrow deposits and outflows in sync with the latest GDA member flow rates.
        for (uint256 i = 0; i < openProposalIds.length; i++) {
            address escrow = streamingEscrow(openProposalIds[i]);
            if (escrow == address(0) || CVStreamingStorage.layout().stoppedEscrows[escrow]) {
                continue;
            }

            if (_topUpEscrowDepositIfNeeded(escrow)) {
                didMeaningfulWork = true;
            }
            try IStreamingEscrowSync(escrow).syncOutflow() {
                syncedAnyEscrow = true;
            } catch (bytes memory reason) {
                hadEscrowSyncError = true;
                emit EscrowSyncFailed(escrow, reason);
            }
        }

        if (syncedAnyEscrow) {
            didMeaningfulWork = true;
        }
        if (didMeaningfulWork && !hadEscrowSyncError) {
            setLastRebalanceAt(block.timestamp);
        }
    }

    function _totalEligibleConviction(uint256 poolAmount) internal returns (uint256 totalEligibleConviction) {
        uint256[] storage openProposalIds = openStreamingProposalIds;
        // First pass: identify eligible conviction and clear non-active proposal units.
        for (uint256 i = 0; i < openProposalIds.length; i++) {
            uint256 proposalId = openProposalIds[i];
            Proposal storage proposal = proposals[proposalId];

            address escrow = streamingEscrow(proposalId);
            if (escrow == address(0)) {
                continue; // Skip if no escrow (shouldn't happen for streaming proposals)
            }
            if (CVStreamingStorage.layout().stoppedEscrows[escrow]) {
                continue;
            }

            // Ensure non-active proposals never keep receiving pool share.
            if (proposal.proposalStatus != ProposalStatus.Active && proposal.proposalStatus != ProposalStatus.Disputed)
            {
                if (!superfluidGDA.updateMemberUnits(escrow, 0)) {
                    revert UpdateMemberUnitsFailed(escrow, 0);
                }
                emit StreamMemberUnitUpdated(escrow, 0);
                continue;
            }

            uint256 convictionValue = calculateProposalConviction(proposalId);
            if (_isProposalAboveThreshold(proposal, convictionValue, poolAmount)) {
                totalEligibleConviction += convictionValue;
            }
        }
    }

    function _updateProposalUnits(
        uint256 poolAmount,
        bool shouldStartStream,
        uint256 totalEligibleConviction,
        uint128 streamingUnitBudget
    ) internal {
        uint256[] storage openProposalIds = openStreamingProposalIds;
        // Second pass: update units after the requested flow is known. When a stream is requested,
        // cap total units to the requested flow rate so GDA integer division cannot round it to zero.
        for (uint256 i = 0; i < openProposalIds.length; i++) {
            uint256 proposalId = openProposalIds[i];
            Proposal storage proposal = proposals[proposalId];

            address escrow = streamingEscrow(proposalId);
            if (escrow == address(0) || CVStreamingStorage.layout().stoppedEscrows[escrow]) {
                continue;
            }

            if (proposal.proposalStatus != ProposalStatus.Active && proposal.proposalStatus != ProposalStatus.Disputed)
            {
                continue;
            }

            uint256 convictionValue = calculateProposalConviction(proposalId);
            uint128 units = 0;
            if (_isProposalAboveThreshold(proposal, convictionValue, poolAmount)) {
                units = shouldStartStream
                    ? _scaledUnitsForStreaming(convictionValue, totalEligibleConviction, streamingUnitBudget)
                    : _legacyScaledUnits(convictionValue);
            }

            if (!superfluidGDA.updateMemberUnits(escrow, units)) {
                revert UpdateMemberUnitsFailed(escrow, units);
            }

            // Once an active proposal becomes ineligible, return the pool-funded
            // escrow reserve before the subsequent sync can classify it as
            // beneficiary-payable excess at a zero GDA flow rate.
            // slither-disable-next-line incorrect-equality
            if (units == 0 && proposal.proposalStatus == ProposalStatus.Active) {
                IStreamingEscrowSync(escrow).drainToStrategy();
            }

            emit StreamMemberUnitUpdated(escrow, int96(int128(units)));
        }
    }

    /// @notice Emergency stop stream for a specific escrow
    /// @dev This sets GDA member units to zero, stops the escrow outflow, and returns residual funds to the strategy.
    function stopEscrowStream(address escrow) external onlyOwner {
        if (escrow == address(0)) {
            revert StreamingEscrowNotFound(escrow);
        }

        if (!superfluidGDA.updateMemberUnits(escrow, 0)) {
            revert UpdateMemberUnitsFailed(escrow, 0);
        }
        CVStreamingStorage.layout().stoppedEscrows[escrow] = true;
        emit StreamMemberUnitUpdated(escrow, 0);

        StreamingEscrow(escrow).drainToStrategy();
        emit EscrowStreamStopped(escrow, msg.sender);
    }

    function setAuthorizedRebalanceCaller(address _caller, bool _authorized) external {
        onlyCouncilSafe();
        CVStreamingStorage.layout().authorizedRebalanceCallers[_caller] = _authorized;
        emit RebalanceCallerAuthorizationUpdated(_caller, _authorized);
    }

    function isAuthorizedRebalanceCaller(address _caller) external view returns (bool) {
        return _isAuthorizedRebalanceCaller(_caller);
    }

    /// @notice Returns the active-points denominator protected by the pool-level decay checkpoint.
    function getPoolThresholdPoints() external view returns (uint256) {
        return _getPoolThresholdPoints();
    }

    /**
     * @notice Wrap unwrapped pool tokens into supertokens if needed
     * @dev Checks the balance of the underlying pool token and wraps it to supertoken
     */
    function wrapIfNeeded() public virtual {
        if (address(superfluidToken) == address(0)) {
            return;
        }

        // Get the underlying pool token address
        address poolToken = allo.getPool(poolId).token;
        if (poolToken == NATIVE_TOKEN) {
            return; // Cannot wrap native token directly
        }
        if (poolToken == address(superfluidToken)) {
            return; // Pure SuperToken pool: balance already lives in the streaming asset
        }

        // Get underlying token from supertoken
        address underlyingToken = superfluidToken.getUnderlyingToken();
        if (underlyingToken != poolToken) {
            return; // Mismatch between pool token and supertoken underlying
        }

        // Check balance of unwrapped tokens
        uint256 unwrappedBalance = IERC20(poolToken).balanceOf(address(this));
        // Exact equality is intentional for this zero-value guard.
        // slither-disable-next-line incorrect-equality
        if (unwrappedBalance == 0) {
            return;
        }

        uint256 upgradeAmount = _toSuperTokenAmount(unwrappedBalance, poolToken, superfluidToken);
        // Exact equality is intentional for this zero-value guard.
        // slither-disable-next-line incorrect-equality
        if (upgradeAmount == 0) {
            return;
        }

        // Approve supertoken to spend the underlying tokens
        if (!IERC20(poolToken).approve(address(superfluidToken), unwrappedBalance)) {
            revert ApproveFailed(poolToken, address(superfluidToken), unwrappedBalance);
        }

        // Wrap tokens to supertokens. SuperToken upgrade amounts are denominated in the SuperToken's decimals.
        superfluidToken.upgrade(upgradeAmount);
    }

    /**
     * @notice Check if streaming should start based on supertoken balance
     * @dev Returns true if there are supertokens available to stream
     * @return bool True if streaming should start
     */
    function _shouldStartStream(uint256 totalEligibleConviction, uint256 maxConviction)
        internal
        view
        virtual
        returns (bool)
    {
        if (address(superfluidToken) == address(0)) {
            return false;
        }

        // Check if there's a supertoken balance available for streaming
        uint256 superTokenBalance = superfluidToken.balanceOf(address(this));
        // Exact equality is intentional for this zero-value guard.
        // slither-disable-next-line incorrect-equality
        if (superTokenBalance == 0) {
            return false;
        }

        // Exact equality is intentional for this zero-value guard.
        // slither-disable-next-line incorrect-equality
        if (streamingRatePerSecond == 0 || maxConviction == 0 || totalEligibleConviction == 0) {
            return false;
        }

        return true;
    }

    function _isProposalAboveThreshold(Proposal storage proposal, uint256 convictionValue, uint256 poolAmount)
        internal
        view
        returns (bool)
    {
        if (totalPointsActivated == 0) {
            return false;
        }
        uint256 threshold = ConvictionsUtils.calculateThreshold(
            0, // Streaming proposals use zero requestedAmount; calculateThreshold should still run its normal math for that input.
            poolAmount,
            _getThresholdPoints(proposal),
            cvParams.decay,
            cvParams.weight,
            cvParams.maxRatio,
            cvParams.minThresholdPoints
        );

        return convictionValue > threshold;
    }

    function _toInt96StreamingRate(uint256 flowRate) internal pure returns (int96) {
        if (flowRate > uint256(uint96(type(int96).max))) {
            revert StreamingRateOverflow(flowRate);
        }
        return int96(uint96(flowRate));
    }

    function _streamingUnitBudget(uint256 requestedFlowRate) internal pure returns (uint128) {
        if (requestedFlowRate > type(uint128).max) {
            return type(uint128).max;
        }
        return uint128(requestedFlowRate);
    }

    function _scaledUnitsForStreaming(uint256 convictionValue, uint256 totalEligibleConviction, uint128 unitBudget)
        internal
        pure
        returns (uint128)
    {
        // Exact equality is intentional for this zero-value guard.
        // slither-disable-next-line incorrect-equality
        if (unitBudget == 0 || convictionValue == 0 || totalEligibleConviction == 0) {
            return 0;
        }

        uint256 units = Math.mulDiv(convictionValue, unitBudget, totalEligibleConviction);
        // Exact equality is intentional for this zero-value guard.
        // slither-disable-next-line incorrect-equality
        if (units == 0) {
            units = 1;
        }
        return units > type(uint128).max ? type(uint128).max : uint128(units);
    }

    function _legacyScaledUnits(uint256 convictionValue) internal pure returns (uint128) {
        uint256 scaledConviction = convictionValue / ConvictionsUtils.D;
        return scaledConviction > type(uint128).max ? type(uint128).max : uint128(scaledConviction);
    }

    function _topUpEscrowDepositIfNeeded(address escrow) internal returns (bool) {
        // The default zero value is intentional before conditional assignment.
        // slither-disable-next-line uninitialized-local
        uint256 requiredDeposit;
        try IStreamingEscrowSync(escrow).depositAmount() returns (uint256 amount) {
            requiredDeposit = amount;
        } catch {
            return false;
        }

        if (requiredDeposit == 0) {
            return false;
        }

        // Keep a 50 bps buffer above Superfluid's required deposit; 10_000 bps is 100%.
        uint256 targetDeposit = requiredDeposit + Math.ceilDiv(requiredDeposit * 50, 10_000);

        uint256 escrowBalance = superfluidToken.balanceOf(escrow);
        try IStreamingEscrowSync(escrow).outflowDeposit() returns (uint256 lockedDeposit) {
            escrowBalance += lockedDeposit;
        } catch {}
        if (escrowBalance >= targetDeposit) {
            return false;
        }

        uint256 missingDeposit = targetDeposit - escrowBalance;
        uint256 strategyBalance = superfluidToken.balanceOf(address(this));
        // Exact equality is intentional for this zero-value guard.
        // slither-disable-next-line incorrect-equality
        if (strategyBalance == 0) {
            return false;
        }

        uint256 topUp = missingDeposit > strategyBalance ? strategyBalance : missingDeposit;
        if (topUp != 0) {
            if (!superfluidToken.transfer(escrow, topUp)) {
                revert SuperTokenTransferFailed(escrow, topUp);
            }
            return true;
        }
        return false;
    }

    function _solvencyConfig() internal view returns (SolvencyConfig memory config) {
        ISuperfluid host = ISuperfluid(superfluidToken.getHost());
        ISuperfluidGovernance governance = ISuperfluidGovernance(host.getGovernance());
        uint256 pppConfig = governance.getConfigAsUint256(
            host, ISuperfluidToken(address(superfluidToken)), SuperfluidGovernanceConfigs.CFAV1_PPP_CONFIG_KEY
        );
        // Only the selected return value is needed at this call site.
        // slither-disable-next-line unused-return
        (config.liquidationPeriod,) = SuperfluidGovernanceConfigs.decodePPPConfig(pppConfig);
        config.minimumDeposit = governance.getConfigAsUint256(
            host, ISuperfluidToken(address(superfluidToken)), SuperfluidGovernanceConfigs.SUPERTOKEN_MINIMUM_DEPOSIT_KEY
        );
    }

    function _depositForRate(uint256 flowRate, SolvencyConfig memory config) internal pure returns (uint256) {
        // Exact equality is intentional for this zero-value guard.
        // slither-disable-next-line incorrect-equality
        if (flowRate == 0) return 0;
        uint256 rawDeposit = flowRate * config.liquidationPeriod;
        if (rawDeposit > uint256(uint96(type(int96).max))) return type(uint256).max;
        // CFA clips deposits upward to 2^32; GDA uses the unrounded amount.
        // The CFA amount therefore safely bounds the deposit on either leg.
        uint256 clippedDeposit = Math.ceilDiv(rawDeposit, uint256(1) << 32) << 32;
        return clippedDeposit > config.minimumDeposit ? clippedDeposit : config.minimumDeposit;
    }

    function _bufferedDeposit(uint256 deposit) internal pure returns (uint256) {
        return deposit + Math.ceilDiv(deposit * 50, 10_000);
    }

    function _memberRateAt(uint256 flowRate, address escrow) internal view returns (uint256) {
        uint128 units = superfluidGDA.getUnits(escrow);
        uint128 totalUnits = superfluidGDA.getTotalUnits();
        // Exact equality is intentional for this zero-value guard.
        // slither-disable-next-line incorrect-equality
        if (flowRate == 0 || units == 0 || totalUnits == 0) return 0;
        return Math.ceilDiv(flowRate * uint256(units), uint256(totalUnits));
    }

    function _escrowCapital(address escrow) internal view returns (uint256 capital) {
        capital = superfluidToken.balanceOf(escrow);
        try IStreamingEscrowSync(escrow).outflowDeposit() returns (uint256 lockedDeposit) {
            capital += lockedDeposit;
        } catch {}
    }

    function _isDisputedEscrow(address escrow) internal view returns (bool) {
        try IStreamingEscrowSync(escrow).disputed() returns (bool isDisputed) {
            return isDisputed;
        } catch {
            return false;
        }
    }

    function _reserveSnapshot() internal view returns (EscrowReserve[] memory reserves) {
        uint256[] storage openProposalIds = openStreamingProposalIds;
        reserves = new EscrowReserve[](openProposalIds.length);
        for (uint256 i = 0; i < openProposalIds.length; i++) {
            address escrow = streamingEscrow(openProposalIds[i]);
            if (escrow == address(0) || CVStreamingStorage.layout().stoppedEscrows[escrow]) continue;
            reserves[i] = EscrowReserve({
                escrow: escrow,
                units: superfluidGDA.getUnits(escrow),
                capital: _escrowCapital(escrow),
                disputed: _isDisputedEscrow(escrow)
            });
        }
    }

    function _requiredCapitalAtRate(
        uint256 flowRate,
        SolvencyConfig memory config,
        EscrowReserve[] memory reserves,
        uint256 totalUnits
    ) internal pure returns (uint256 requiredCapital) {
        uint256 gdaDeposit = _depositForRate(flowRate, config);
        // The maximum value is an explicit overflow sentinel.
        // slither-disable-next-line incorrect-equality
        if (gdaDeposit == type(uint256).max) return type(uint256).max;
        // An additional GDA deposit is kept liquid as a one-liquidation-period
        // runway. Rebalance must still run before that runway is consumed.
        requiredCapital = _bufferedDeposit(gdaDeposit) + gdaDeposit;
        for (uint256 i = 0; i < reserves.length; i++) {
            EscrowReserve memory reserve = reserves[i];
            if (reserve.escrow == address(0) || reserve.disputed || reserve.units == 0 || totalUnits == 0) continue;
            uint256 memberRate = Math.ceilDiv(flowRate * uint256(reserve.units), totalUnits);
            // Exact equality is intentional for this zero-value guard.
            // slither-disable-next-line incorrect-equality
            if (memberRate == 0) continue;
            uint256 memberDeposit = _depositForRate(memberRate, config);
            // The maximum value is an explicit overflow sentinel.
            // slither-disable-next-line incorrect-equality
            if (memberDeposit == type(uint256).max) return type(uint256).max;
            uint256 target = _bufferedDeposit(memberDeposit);
            if (target > reserve.capital) requiredCapital += target - reserve.capital;
        }
    }

    function _highestSolventRate(uint256 requestedFlowRate) internal view returns (uint256) {
        // Exact equality is intentional for this zero-value guard.
        // slither-disable-next-line incorrect-equality
        if (requestedFlowRate == 0) return 0;
        // Only the selected return value is needed at this call site.
        // slither-disable-next-line unused-return
        (,, uint256 oldGdaDeposit) = superfluidToken.getGDAFlowInfo(address(this), superfluidGDA);
        uint256 capital = superfluidToken.balanceOf(address(this)) + oldGdaDeposit;
        SolvencyConfig memory config = _solvencyConfig();
        EscrowReserve[] memory reserves = _reserveSnapshot();
        uint256 totalUnits = superfluidGDA.getTotalUnits();
        if (_requiredCapitalAtRate(requestedFlowRate, config, reserves, totalUnits) <= capital) return requestedFlowRate;

        uint256 low = 0;
        uint256 high = requestedFlowRate;
        while (low + 1 < high) {
            uint256 mid = low + (high - low) / 2;
            if (_requiredCapitalAtRate(mid, config, reserves, totalUnits) <= capital) low = mid;
            else high = mid;
        }
        return low;
    }

    function _topUpEscrowsForRate(uint256 flowRate) internal {
        SolvencyConfig memory config = _solvencyConfig();
        uint256[] storage openProposalIds = openStreamingProposalIds;
        for (uint256 i = 0; i < openProposalIds.length; i++) {
            address escrow = streamingEscrow(openProposalIds[i]);
            if (escrow == address(0) || CVStreamingStorage.layout().stoppedEscrows[escrow] || _isDisputedEscrow(escrow)) {
                continue;
            }
            uint256 memberRate = _memberRateAt(flowRate, escrow);
            // Exact equality is intentional for this zero-value guard.
            // slither-disable-next-line incorrect-equality
            if (memberRate == 0) continue;
            uint256 target = _bufferedDeposit(_depositForRate(memberRate, config));
            uint256 capital = _escrowCapital(escrow);
            if (target > capital && !superfluidToken.transfer(escrow, target - capital)) {
                revert SuperTokenTransferFailed(escrow, target - capital);
            }
        }
    }

    function _rebalanceWhenDisabled() internal returns (bool) {
        if (address(superfluidToken) == address(0) || address(superfluidGDA) == address(0)) {
            return false;
        }

        int96 currentFlowRate = superfluidToken.getGDAFlowRate(address(this), superfluidGDA);
        int96 actualFlowRate = superfluidToken.distributeFlow(superfluidGDA, 0);
        if (currentFlowRate != actualFlowRate) {
            emit StreamRateUpdated(address(superfluidGDA), 0);
            return true;
        }
        return false;
    }

    function _isAuthorizedRebalanceCaller(address caller) internal view returns (bool) {
        if (address(registryCommunity) == address(0)) {
            // Defensive default: never allow open rebalance access before full initialization.
            return false;
        }
        address ownerAddress = effectiveOwner();
        address councilSafeAddress = _tryCouncilSafe();
        if (
            caller == address(this) || (ownerAddress != address(0) && caller == ownerAddress)
                || (councilSafeAddress != address(0) && caller == councilSafeAddress)
        ) {
            return true;
        }
        if (councilSafeAddress != address(0) && _isCouncilSafeOwner(councilSafeAddress, caller)) {
            return true;
        }
        if (_isFactoryRebalanceCaller(caller)) {
            return true;
        }
        return CVStreamingStorage.layout().authorizedRebalanceCallers[caller];
    }

    function _isFactoryRebalanceCaller(address caller) internal view returns (bool) {
        address registryFactoryAddress = registryCommunity.registryFactory();
        if (registryFactoryAddress == address(0)) {
            return false;
        }
        return IRegistryFactory(registryFactoryAddress).isAuthorizedWallet(caller);
    }

    function _isCouncilSafeOwner(address councilSafeAddress, address caller) internal view returns (bool) {
        if (councilSafeAddress.code.length == 0) {
            return false;
        }
        try ISafe(councilSafeAddress).getOwners() returns (address[] memory owners) {
            for (uint256 i = 0; i < owners.length; i++) {
                if (owners[i] == caller) return true;
            }
        } catch {}
        return false;
    }

    function _tryCouncilSafe() internal view returns (address councilSafeAddress) {
        (bool ok, bytes memory data) = address(registryCommunity).staticcall(abi.encodeWithSignature("councilSafe()"));
        if (!ok || data.length < 32) {
            return councilSafeAddress;
        }
        councilSafeAddress = abi.decode(data, (address));
    }
}

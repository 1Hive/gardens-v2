# Security PoC Regression Coverage

This index maps every bounty-eligible root cause in `advisory-history.md` to a
regression test that exercises its reported security boundary. Most tests live
beside their contract fixtures or in
`pkg/contracts/test/no-coverage/SecurityPoC.t.sol`. Run
`forge test --no-match-path 'pkg/contracts/test/fork/*'` from the repository
root for the contract suite and `pnpm --filter web test:unit` for the web suite.
Fork checks require chain RPC variables. A duplicate advisory shares the
original finding's test; it does not
need a second test for the same root cause.

| Advisory | Regression test |
| --- | --- |
| GHSA-f2mf-mf7h-6jqv (GDN-01, GDN-02, GDN-05) | `SecurityPoC.t.sol::test_GDN01_FirstSupportBlocksRequestedAmountEdit`, `test_GDN02_DeactivatePointsPreservesConvictionFromOldTotalStake`, `test_GDN05_CancelledProposalsDoNotExhaustCreation` |
| GHSA-94f2-r637-wcpv (same GDN-02 root cause) | `SecurityPoC.t.sol::test_GDN02_DeactivatePointsPreservesConvictionFromOldTotalStake` |
| GHSA-jwvq-5xmf-f377 | `GHSA_c5r9_RealSuperfluid.t.sol::test_realSuperfluid_eoaBeneficiaryReturnsEscrowBufferToStrategy` |
| GHSA-3xpr-2mm7-77j7 | `CVDisputeFacet.t.sol::test_rule_ruling_one_streaming_resumes_without_draining_beneficiary` |
| GHSA-jxgc-cgfq-436j | `StreamingEscrow.t.sol::test_syncOutflow_does_not_drain_excess_when_disputed` |
| GHSA-c5r9-8r97-7g7h | `GHSA_c5r9_RealSuperfluid.t.sol::test_realSuperfluid_reentrantBeneficiaryCannotStealEscrowBuffer` |
| GHSA-wq6c-6p68-3m25 | `CVAllocationFacet.t.sol::test_distribute_reverts_for_streaming_and_leaves_escrow_state_unchanged` |
| GHSA-22hv-jcwr-j733 (threshold, arbitrator timeout) | `SecurityPoC.t.sol::test_H4_SelfPowerDecreaseMustNotMakeProposalExecutable`, `SafeArbitrator.t.sol::test_cancelDispute_onlyArbitratedCanCancelAndReceiveFee` |
| GHSA-942w-gjvj-mrrf | `SecurityPoC.t.sol::test_GHSA942_AmountEditAfterSupportWithdrawalClearsResidualConviction` |
| GHSA-qpr5-mcg9-v98x | `SecurityPoC.t.sol::test_GHSAQPR5_TemporarySpikeDecaysAtConvictionRate` |
| GHSA-cj2m-c9x5-54m3 (accepted Passport relay finding only) | `apps/web/app/api/passport-oracle/write-score/[chain]/route.test.ts::returns success without using the keeper when the score is unchanged` |
| GHSA-w7jj-264w-wggp (incoming stream interruption) | `CVAdminFacet.t.sol::test_disconnectSuperfluidGDA_revertsForActionEligibleMember`, `test_disconnectSuperfluidGDA_allowsRegistryFactoryAuthorizedWallet` |
| GHSA-p4gf-5qrj-mhh4 (H-1, H-2, H-3) | `SecurityPoC.t.sol::test_H1_BeneficiaryMustNotUpdateBeforeFirstOutflowCall`, `test_H2_ReentrancyAttackMustFail`, `test_M3b_StreamingRebalanceMustFitBlockGasLimitAfter1000HistoricalProposals` |
| GHSA-p4gf-5qrj-mhh4 (M-1 through M-4) | `SecurityPoC.t.sol::test_M1_Ruling2MustUseProposalConfigVersion`, `test_M2b_IncreasePowerQuadratic_NoOverflow`, `test_M3_UnregisterMustStayBoundedAtScale`, `test_M4b_UnregisterMustStayGasBoundedAsVotesGrow`; `PowerAndConvictionUtils.t.sol::test_convictionsUtils_mul_revert_guards` |
| GHSA-p4gf-5qrj-mhh4 (M-5 through M-7) | `CVStreamingFacet.t.sol::test_rebalance_sync_error_does_not_advance_timestamp`, `SecurityPoC.t.sol::test_H3_AttackerCannotSquatCooldownWindow`, `test_M7_ETHRejectorMustNotLockDisputeResolution` |
| GHSA-7ghx-xpr3-qwjr | `CVStreamingFacet.t.sol::test_rebalance_keeps_deactivatedProposalBelowWeightedThresholdAcrossTouchpoints` |
| GHSA-84cr-jj79-57mw (accepted Passport finding only) | `SecurityPoC.t.sol::test_GHSA_84CR_InactiveEnabledStrategyStillEnforcesPassportThreshold` |
| GHSA-c6c6-v53h-g3j3 | `SecurityPoC.t.sol::test_GHSA_C6C6_DelegateCannotMintAnotherCredential` |
| GHSA-q3cm-96j4-575w | `CVDisputeFacet.t.sol::test_rule_reverts_for_stale_dispute_id` |
| GHSA-m9r7-6g75-3vp3 | `CVPowerFacet.t.sol::test_activatePoints_increases_total_points` and `CVProposalFacet.t.sol::test_registerRecipient_usesSameWeightedBasisRegardlessOfCreationOrder` |
| GHSA-6gvv-9mv6-xgxr | `SquidBridgeAdapterV2.t.sol::test_bridgeETH_revertsWhenSourceSwapRedirectsOutput` and `test_bridgeETH_revertsWhenDestinationSwapRedirectsOutput` |
| GHSA-82jw-487g-xrc8 | `CVAdminFacet.t.sol::test_setPoolParams_streaming_migrates_balance_when_switching_super_token` |
| GHSA-r67j-38r3-2qmc | `SquidBridgeAdapterV2.t.sol::test_bridgeETH_revertsWhenSourceSwapMinimumIsEconomicallyUnbound` |
| GHSA-2g3r-xj24-3mv3 | `SquidBridgeAdapterV2.t.sol::test_bridgeETH_revertsWhenProviderQuoteIsBelowIndependentDestinationFloor` and `SquidGardensRevenueReceiver.t.sol::test_recoverUntrackedToken_cannotConsumeEscrowLiability` |
| GHSA-qwx5-82f5-cqmc | `SecurityPoC.t.sol::test_GHSA_QWX5_ExpiredPassportScoreCannotAuthorizeActions` |
| GHSA-852m-82x3-c449 | `CVAllocationFacet.t.sol::test_distribute_reverts_when_strategy_disabled` |
| GHSA-7g4h-25m4-frjv | `SecurityPoC.t.sol::test_GHSA7G4H_OneMemberCannotOccupyEveryActiveProposalSlot` |
| GHSA-9h36-fgcx-44j4 | `PassportScorer.t.sol::testFormerCouncilLosesAccessAfterRotation` |
| GHSA-jh8v-6j72-7vcx | `PowerAndConvictionUtils.t.sol::test_convictionsUtils_calculateThreshold_nearMaxRatioDoesNotDivideByZero` |
| GHSA-54mj-q96p-g6j9 | `CVAllocationFacet.t.sol::test_distribute_reverts_when_last_support_leaves_but_conviction_remains` |

Private reports accepted after this ledger snapshot have focused regressions in
their affected contract test suites. Add their advisory IDs here only after
coordinated disclosure permits the details to become public.

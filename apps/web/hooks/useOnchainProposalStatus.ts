"use client";

import { useEffect, useMemo, useState } from "react";
import { Address } from "viem";
import { useContractRead, useContractReads } from "wagmi";
import { cvStrategyABI } from "@/src/generated";

type ProposalTupleWithStatus = readonly unknown[] & {
  result?: unknown;
  proposalStatus?: number | bigint;
};

const PROPOSAL_STATUS_TUPLE_INDEX = 5;
const PROPOSAL_STATUS_POLL_INTERVAL_MS = 60_000;
// ICVStrategy.sol ProposalStatus enum: Cancelled=3, Executed=4, Rejected=6.
const TERMINAL_PROPOSAL_STATUSES = new Set([3, 4, 6]);

export const isTerminalProposalStatus = (status?: string | number | null) =>
  status != null && TERMINAL_PROPOSAL_STATUSES.has(Number(status));

export const getProposalStatusFromTuple = (
  proposal: unknown,
): number | undefined => {
  if (proposal == null) return undefined;

  const proposalTuple = proposal as ProposalTupleWithStatus;
  if (proposalTuple.result != null) {
    return getProposalStatusFromTuple(proposalTuple.result);
  }

  const status =
    proposalTuple.proposalStatus ?? proposalTuple[PROPOSAL_STATUS_TUPLE_INDEX];

  if (typeof status === "number") return status;
  if (typeof status === "bigint") return Number(status);

  return undefined;
};

export function useOnchainProposalStatus({
  strategyAddress,
  proposalNumber,
  chainId,
  fallbackStatus,
  enabled = true,
  watch = true,
}: {
  strategyAddress?: Address;
  proposalNumber?: bigint;
  chainId?: number;
  fallbackStatus?: string | number | null;
  enabled?: boolean;
  watch?: boolean;
}) {
  const shouldRead = enabled && !!strategyAddress && proposalNumber != null;
  const { data, isLoading, isFetched, refetch } = useContractRead({
    address: strategyAddress,
    abi: cvStrategyABI,
    functionName: "getProposal",
    args: proposalNumber != null ? [proposalNumber] : undefined,
    chainId,
    enabled: shouldRead,
    watch: false,
  });
  const onchainStatus = getProposalStatusFromTuple(data);
  const shouldPoll =
    shouldRead &&
    watch &&
    !isTerminalProposalStatus(fallbackStatus) &&
    !isTerminalProposalStatus(onchainStatus);

  useEffect(() => {
    if (!shouldPoll) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refetch();
    }, PROPOSAL_STATUS_POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [refetch, shouldPoll]);

  const status = useMemo(() => {
    if (onchainStatus != null) return onchainStatus;
    if (fallbackStatus == null || fallbackStatus === "") return undefined;

    return Number(fallbackStatus);
  }, [fallbackStatus, onchainStatus]);

  return {
    status,
    onchainStatus,
    isLoading,
    isFetched,
    refetch,
  };
}

export function useOnchainProposalStatuses<
  TProposal extends {
    id: string;
    proposalNumber: string | number;
    proposalStatus?: string | number | null;
  },
>({
  strategyAddress,
  proposals,
  chainId,
  enabled = true,
}: {
  strategyAddress?: Address;
  proposals: readonly TProposal[];
  chainId?: number;
  enabled?: boolean;
}) {
  const [terminalOnchainStatuses, setTerminalOnchainStatuses] = useState<
    Record<string, number>
  >({});
  const liveProposals = useMemo(
    () =>
      proposals.filter(
        (proposal) =>
          !isTerminalProposalStatus(proposal.proposalStatus) &&
          terminalOnchainStatuses[
            `${chainId}:${strategyAddress}:${proposal.id}`
          ] == null,
      ),
    [chainId, proposals, strategyAddress, terminalOnchainStatuses],
  );
  const contracts = useMemo(
    () =>
      liveProposals.map((proposal) => ({
        address: strategyAddress,
        abi: cvStrategyABI,
        functionName: "getProposal",
        args: [BigInt(proposal.proposalNumber)],
        chainId,
      })),
    [chainId, liveProposals, strategyAddress],
  );

  const shouldRead = enabled && !!strategyAddress && liveProposals.length > 0;
  const { data, refetch } = useContractReads({
    contracts,
    enabled: shouldRead,
    watch: false,
  });

  useEffect(() => {
    if (!data || data.length !== liveProposals.length) return;
    const newlyTerminal = liveProposals.flatMap((proposal, index) => {
      const status = getProposalStatusFromTuple(data[index]);
      return status != null && isTerminalProposalStatus(status) ?
          [[`${chainId}:${strategyAddress}:${proposal.id}`, status] as const]
        : [];
    });
    if (newlyTerminal.length === 0) return;
    setTerminalOnchainStatuses((current) => {
      if (newlyTerminal.every(([key, status]) => current[key] === status)) {
        return current;
      }
      return { ...current, ...Object.fromEntries(newlyTerminal) };
    });
  }, [chainId, data, liveProposals, strategyAddress]);

  useEffect(() => {
    if (!shouldRead) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refetch();
    }, PROPOSAL_STATUS_POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [refetch, shouldRead]);

  return useMemo(() => {
    const liveStatuses = new Map(
      liveProposals.map((proposal, index) => [
        proposal.id,
        getProposalStatusFromTuple(data?.[index]),
      ]),
    );
    return proposals.reduce<Record<string, number | undefined>>(
      (acc, proposal) => {
        acc[proposal.id] =
          terminalOnchainStatuses[
            `${chainId}:${strategyAddress}:${proposal.id}`
          ] ??
          liveStatuses.get(proposal.id) ??
          (proposal.proposalStatus == null ?
            undefined
          : Number(proposal.proposalStatus));
        return acc;
      },
      {},
    );
  }, [
    chainId,
    data,
    liveProposals,
    proposals,
    strategyAddress,
    terminalOnchainStatuses,
  ]);
}

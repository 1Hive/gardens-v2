"use client";

import { useMemo } from "react";
import { Address } from "viem";
import { useContractRead, useContractReads } from "wagmi";
import { cvStrategyABI } from "@/src/generated";

type ProposalTupleWithStatus = readonly unknown[] & {
  result?: unknown;
  proposalStatus?: number | bigint;
};

const PROPOSAL_STATUS_TUPLE_INDEX = 5;
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
  const { data, isLoading, isFetched, refetch } = useContractRead({
    address: strategyAddress,
    abi: cvStrategyABI,
    functionName: "getProposal",
    args: proposalNumber != null ? [proposalNumber] : undefined,
    chainId,
    enabled: enabled && !!strategyAddress && proposalNumber != null,
    watch: watch && !isTerminalProposalStatus(fallbackStatus),
  });

  const onchainStatus = getProposalStatusFromTuple(data);

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
  const liveProposals = useMemo(
    () =>
      proposals.filter(
        (proposal) => !isTerminalProposalStatus(proposal.proposalStatus),
      ),
    [proposals],
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

  const { data } = useContractReads({
    contracts,
    enabled: enabled && !!strategyAddress && liveProposals.length > 0,
    watch: true,
  });

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
          liveStatuses.get(proposal.id) ??
          (proposal.proposalStatus == null ?
            undefined
          : Number(proposal.proposalStatus));
        return acc;
      },
      {},
    );
  }, [data, liveProposals, proposals]);
}

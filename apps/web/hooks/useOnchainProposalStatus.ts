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
    watch,
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
  const contracts = useMemo(
    () =>
      proposals.map((proposal) => ({
        address: strategyAddress,
        abi: cvStrategyABI,
        functionName: "getProposal",
        args: [BigInt(proposal.proposalNumber)],
        chainId,
      })),
    [chainId, proposals, strategyAddress],
  );

  const { data } = useContractReads({
    contracts,
    enabled: enabled && !!strategyAddress && proposals.length > 0,
    watch: true,
  });

  return useMemo(() => {
    return proposals.reduce<Record<string, number | undefined>>(
      (acc, proposal, index) => {
        acc[proposal.id] =
          getProposalStatusFromTuple(data?.[index]) ??
          (proposal.proposalStatus == null ?
            undefined
          : Number(proposal.proposalStatus));
        return acc;
      },
      {},
    );
  }, [data, proposals]);
}

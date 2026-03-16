import { useEffect, useRef, useState } from "react";
import { gql } from "urql";
import { readContracts, useAccount } from "wagmi";
import { useSuperfluidSugraphClient as useSuperfluidSugraphClient } from "./useSuperfluidSubgraphClient";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { superfluidPoolAbi } from "@/src/customAbis";
import { ChainId } from "@/types";

export const STREAM_TO_TARGET_QUERY = gql`
  query streamToTarget($receiver: String!, $token: String!, $from: String) {
    senderStreams: streams(
      where: { sender: $from, token: $token, currentFlowRate_gt: "0" }
    ) {
      receiver {
        id
      }
      currentFlowRate
      sender {
        id
      }
    }

    receiverStreams: streams(where: { receiver: $receiver, token: $token }) {
      receiver {
        id
      }
      currentFlowRate
      streamedUntilUpdatedAt
      updatedAtTimestamp
      sender {
        id
      }
    }

    poolMembers(where: { account: $receiver, pool_: { token: $token } }) {
      updatedAtTimestamp
      totalAmountReceivedUntilUpdatedAt
      pool {
        id
      }
    }

    pool(id: $receiver) {
      id
      totalAmountDistributedUntilUpdatedAt
    }
  }
`;

type ReceiverStreamSnapshot = {
  currentFlowRate: bigint;
  streamedUntilUpdatedAt: bigint;
  updatedAtTimestamp: bigint;
};

type PoolMemberSnapshot = {
  currentFlowRate: bigint;
  totalAmountReceivedUntilUpdatedAt: bigint;
  updatedAtTimestamp: bigint;
};

export function useSuperfluidStream({
  receiver,
  superToken,
  chainId,
  containerId,
}: {
  receiver: string;
  superToken: string;
  chainId?: ChainId;
  containerId: string | number;
}) {
  const { subscribe, unsubscribe } = usePubSubContext();
  const latestResultSignatureRef = useRef<string>("");
  const hasLoggedMemberFlowReadErrorRef = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const client = useSuperfluidSugraphClient({ chainId });
  const { address: connectedWalletAddress } = useAccount();

  const [currentFlowRateBn, setCurrentFlowRateBn] = useState<bigint | null>(
    null,
  );
  const [currentUserFlowRateBn, setCurrentUserFlowRateBn] = useState<
    bigint | null
  >(null);

  const [currentUserOtherFlowRateBn, setCurrentUserOtherFlowRateBn] = useState<
    bigint | null
  >(null);
  const [totalAmountDistributedBn, setTotalAmountDistributedBn] = useState<
    bigint | null
  >(null);
  const [liveTotalStreamedBn, setLiveTotalStreamedBn] = useState<bigint | null>(
    null,
  );
  const [hasFetched, setHasFetched] = useState(false);
  const [receiverStreamsSnapshot, setReceiverStreamsSnapshot] = useState<
    ReceiverStreamSnapshot[]
  >([]);
  const [poolMembersSnapshot, setPoolMembersSnapshot] = useState<
    PoolMemberSnapshot[]
  >([]);

  const buildResultSignature = (
    flowRate: bigint,
    totalDistributed: bigint | null,
    streams: ReceiverStreamSnapshot[],
    poolMembers: PoolMemberSnapshot[],
  ) => {
    const streamsSig = streams
      .map(
        (stream) =>
          `${stream.currentFlowRate.toString()}:${stream.streamedUntilUpdatedAt.toString()}:${stream.updatedAtTimestamp.toString()}`,
      )
      .join("|");
    const poolMembersSig = poolMembers
      .map(
        (member) =>
          `${member.currentFlowRate.toString()}:${member.totalAmountReceivedUntilUpdatedAt.toString()}:${member.updatedAtTimestamp.toString()}`,
      )
      .join("|");
    return `${flowRate.toString()}|${totalDistributed?.toString() ?? "null"}|${streamsSig}|${poolMembersSig}`;
  };

  const computeLiveTotalStreamed = (streams: ReceiverStreamSnapshot[]) => {
    const nowInMs = BigInt(Date.now());
    const streamsTotal = streams.reduce((acc, stream) => {
      const updatedAtMs = stream.updatedAtTimestamp * 1000n;
      const elapsedMs = nowInMs > updatedAtMs ? nowInMs - updatedAtMs : 0n;
      return (
        acc +
        stream.streamedUntilUpdatedAt +
        (stream.currentFlowRate * elapsedMs) / 1000n
      );
    }, 0n);
    const membersTotal = poolMembersSnapshot.reduce((acc, member) => {
      const updatedAtMs = member.updatedAtTimestamp * 1000n;
      const elapsedMs = nowInMs > updatedAtMs ? nowInMs - updatedAtMs : 0n;
      return (
        acc +
        member.totalAmountReceivedUntilUpdatedAt +
        (member.currentFlowRate * elapsedMs) / 1000n
      );
    }, 0n);
    if (!streams.length && !poolMembersSnapshot.length) return null;
    return streamsTotal + membersTotal;
  };

  const fetch = async (): Promise<string | null> => {
    if (!receiver || !superToken || !client) return null;
    const result = await client
      .query(STREAM_TO_TARGET_QUERY, {
        receiver: receiver.toLowerCase(),
        token: superToken?.toLowerCase(),
        from: connectedWalletAddress?.toLowerCase(),
      })
      .toPromise()
      .catch((error) => {
        console.error("Error fetching superfluid stream:", error);
        return null;
      });
    setHasFetched(true);
    if (!result?.data) {
      return null;
    }

    const receiverStreamsSnapshotData: ReceiverStreamSnapshot[] =
      result.data.receiverStreams.map(
        (flow: {
          currentFlowRate: bigint;
          streamedUntilUpdatedAt: bigint;
          updatedAtTimestamp: bigint;
        }) => ({
          currentFlowRate: BigInt(flow.currentFlowRate),
          streamedUntilUpdatedAt: BigInt(flow.streamedUntilUpdatedAt ?? "0"),
          updatedAtTimestamp: BigInt(flow.updatedAtTimestamp ?? "0"),
        }),
      );

    let toPoolFlowRate: bigint = result.data.receiverStreams.reduce(
      (
        acc: bigint,
        flow: {
          currentFlowRate: bigint;
          sender: { id: string };
          receiver: { id: string };
        },
      ) => acc + BigInt(flow.currentFlowRate),
      0n,
    );

    let poolMemberSnapshotsData: PoolMemberSnapshot[] = [];
    if (result.data.poolMembers.length > 0) {
      let memberFlows: Array<{ result?: unknown; error?: unknown }> = [];
      try {
        memberFlows = (await readContracts({
          allowFailure: true,
          contracts: result.data.poolMembers.map((member: any) => ({
            address: member.pool.id,
            abi: superfluidPoolAbi,
            functionName: "getMemberFlowRate",
            args: [receiver],
          })),
        })) as Array<{ result?: unknown; error?: unknown }>;
      } catch (error) {
        if (!hasLoggedMemberFlowReadErrorRef.current) {
          console.warn(
            "useSuperfluidStream: unable to read pool member flow rates; falling back to stream snapshots only",
            error,
          );
          hasLoggedMemberFlowReadErrorRef.current = true;
        }
        memberFlows = result.data.poolMembers.map(() => ({ result: 0n }));
      }

      toPoolFlowRate = memberFlows.reduce((acc: bigint, flow) => {
        if (flow?.error) {
          if (!hasLoggedMemberFlowReadErrorRef.current) {
            console.warn(
              "useSuperfluidStream: failed to read some member flow rates; using zero for those entries",
              flow.error,
            );
            hasLoggedMemberFlowReadErrorRef.current = true;
          }
          return acc;
        }
        return acc + BigInt(((flow?.result as any) ?? 0).toString());
      }, toPoolFlowRate);

      poolMemberSnapshotsData = result.data.poolMembers.map(
        (
          member: {
            updatedAtTimestamp: bigint;
            totalAmountReceivedUntilUpdatedAt: bigint;
          },
          index: number,
        ) => {
          const flow = memberFlows[index];
          const flowRate =
            flow?.error ? 0n : BigInt((flow?.result as any)?.toString() ?? "0");
          return {
            currentFlowRate: flowRate,
            totalAmountReceivedUntilUpdatedAt: BigInt(
              member.totalAmountReceivedUntilUpdatedAt ?? "0",
            ),
            updatedAtTimestamp: BigInt(member.updatedAtTimestamp ?? "0"),
          };
        },
      );
    }

    const totalAmountDistributed =
      result.data.pool?.totalAmountDistributedUntilUpdatedAt != null ?
        BigInt(result.data.pool.totalAmountDistributedUntilUpdatedAt)
      : null;

    setCurrentFlowRateBn(toPoolFlowRate);
    setReceiverStreamsSnapshot(receiverStreamsSnapshotData);
    setPoolMembersSnapshot(poolMemberSnapshotsData);
    setLiveTotalStreamedBn(
      computeLiveTotalStreamed(receiverStreamsSnapshotData),
    );
    setTotalAmountDistributedBn(totalAmountDistributed);

    const signature = buildResultSignature(
      toPoolFlowRate,
      totalAmountDistributed,
      receiverStreamsSnapshotData,
      poolMemberSnapshotsData,
    );
    latestResultSignatureRef.current = signature;

    if (connectedWalletAddress) {
      let toOtherRecipientFlowRate: bigint = result.data.senderStreams.reduce(
        (
          acc: bigint,
          flow: {
            currentFlowRate: bigint;
            sender: { id: string };
            receiver: { id: string };
          },
        ) =>
          receiver.toLowerCase() === flow.receiver.id.toLowerCase() ?
            acc
          : acc + BigInt(flow.currentFlowRate), // Do not include flows for this recipient
        0n,
      );
      setCurrentUserOtherFlowRateBn(toOtherRecipientFlowRate);

      const currentUserStreamingToPoolRate =
        BigInt(
          result.data.receiverStreams.find(
            (flow: { sender: { id: string } }) =>
              flow.sender.id.toLowerCase() ===
              connectedWalletAddress.toLowerCase(),
          )?.currentFlowRate ?? "0",
        ) || null;

      setCurrentUserFlowRateBn(currentUserStreamingToPoolRate);
    }

    return signature;
  };

  useEffect(() => {
    const clearPollers = () => {
      if (pollTimeoutRef.current != null) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
      if (pollIntervalRef.current != null) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };

    const subId = subscribe(
      {
        topic: "stream",
        containerId,
        chainId,
      },
      () => {
        clearPollers();
        const initialSignature = latestResultSignatureRef.current;
        let attempts = 0;
        const maxAttempts = 10;

        const pollUntilChanged = async () => {
          attempts += 1;
          const nextSignature = await fetch();
          if (
            nextSignature == null ||
            nextSignature !== initialSignature ||
            attempts >= maxAttempts
          ) {
            clearPollers();
          }
        };

        pollTimeoutRef.current = setTimeout(() => {
          pollUntilChanged();
          pollIntervalRef.current = setInterval(pollUntilChanged, 2000);
        }, 1000);
      },
    );

    return () => {
      clearPollers();
      if (subId) {
        unsubscribe(subId);
      }
    };
  }, [containerId, chainId, subscribe, unsubscribe]);

  useEffect(() => {
    if (!client) return;
    setHasFetched(false);
    fetch();
  }, [client, superToken, receiver, connectedWalletAddress]);

  useEffect(() => {
    if (!receiverStreamsSnapshot.length && !poolMembersSnapshot.length) {
      setLiveTotalStreamedBn(null);
      return;
    }
    const update = () =>
      setLiveTotalStreamedBn(computeLiveTotalStreamed(receiverStreamsSnapshot));
    update();
    const interval = setInterval(update, 100);
    return () => {
      clearInterval(interval);
    };
  }, [receiverStreamsSnapshot, poolMembersSnapshot]);

  return {
    currentUserOtherFlowRateBn,
    currentFlowRateBn,
    totalAmountDistributedBn,
    setCurrentFlowRateBn,
    refetch: fetch,
    currentUserFlowRateBn,
    setCurrentUserFlowRateBn,
    liveTotalStreamedBn,
    hasFetched,
  };
}

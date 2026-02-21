import { useEffect, useState } from "react";
import { gql } from "urql";
import { readContracts, useAccount } from "wagmi";
import { useSuperfluidSugraphClient as useSuperfluidSugraphClient } from "./useSuperfluidSubgraphClient";
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

export function useSuperfluidStream({
  receiver,
  superToken,
  chainId,
}: {
  receiver: string;
  superToken: string;
  chainId?: ChainId;
}) {
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
  const [liveTotalStreamedBn, setLiveTotalStreamedBn] = useState<
    bigint | null
  >(null);
  const [receiverStreamsSnapshot, setReceiverStreamsSnapshot] = useState<
    ReceiverStreamSnapshot[]
  >([]);

  const computeLiveTotalStreamed = (streams: ReceiverStreamSnapshot[]) => {
    if (!streams.length) return null;
    const nowInSec = BigInt(Math.floor(Date.now() / 1000));
    return streams.reduce((acc, stream) => {
      const elapsed =
        nowInSec > stream.updatedAtTimestamp ?
          nowInSec - stream.updatedAtTimestamp
        : 0n;
      return (
        acc +
        stream.streamedUntilUpdatedAt +
        stream.currentFlowRate * elapsed
      );
    }, 0n);
  };

  const fetch = async () => {
    if (!receiver || !superToken || !client) return;
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
    if (result?.data) {
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

      if (result.data.poolMembers.length > 0) {
        const memberFlows = await readContracts({
          contracts: result.data.poolMembers.map((member: any) => ({
            address: member.pool.id,
            abi: superfluidPoolAbi,
            functionName: "getMemberFlowRate",
            args: [receiver],
          })),
        });

        toPoolFlowRate = memberFlows.reduce((acc: bigint, flow) => {
          if (flow.error) {
            console.error("Error fetching member flow rate:", flow.error);
            return acc;
          }
          return acc + BigInt((flow.result as any).toString());
        }, toPoolFlowRate);
      }

      setCurrentFlowRateBn(toPoolFlowRate);
      setReceiverStreamsSnapshot(receiverStreamsSnapshotData);
      setLiveTotalStreamedBn(
        computeLiveTotalStreamed(receiverStreamsSnapshotData),
      );
      setTotalAmountDistributedBn(
        result.data.pool?.totalAmountDistributedUntilUpdatedAt != null ?
          BigInt(result.data.pool.totalAmountDistributedUntilUpdatedAt)
        : null,
      );

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
    }
  };

  useEffect(() => {
    if (!client) return;
    fetch();
  }, [client, superToken, receiver, connectedWalletAddress]);

  useEffect(() => {
    if (!receiverStreamsSnapshot.length) {
      setLiveTotalStreamedBn(null);
      return;
    }
    const update = () =>
      setLiveTotalStreamedBn(computeLiveTotalStreamed(receiverStreamsSnapshot));
    update();
    const interval = setInterval(update, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [receiverStreamsSnapshot]);

  return {
    currentUserOtherFlowRateBn,
    currentFlowRateBn,
    totalAmountDistributedBn,
    setCurrentFlowRateBn,
    refetch: fetch,
    currentUserFlowRateBn,
    setCurrentUserFlowRateBn,
    liveTotalStreamedBn,
  };
}

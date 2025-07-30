import { useEffect, useState } from "react";
import { gql } from "urql";
import { readContracts, useAccount } from "wagmi";
import { useSuperfluidSugraphClient as useSuperfluidSugraphClient } from "./useSuperfluidSubgraphClient";
import { superfluidPoolAbi } from "@/src/customAbis";
import { ChainId } from "@/types";

export const STREAM_TO_TARGET_QUERY = gql`
  query streamToTarget($receiver: String!, $token: String!) {
    streams(
      where: { receiver: $receiver, token: $token, currentFlowRate_gt: "0" }
    ) {
      currentFlowRate
      sender {
        id
      }
    }
    poolMembers(where: { account: $receiver, pool_: { token: $token } }) {
      pool {
        id
      }
    }
  }
`;

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
  const { address } = useAccount();

  const [currentFlowRateBn, setCurrentFlowRateBn] = useState<bigint | null>(
    null,
  );
  const [currentUserFlowRateBn, setCurrentUserFlowRateBn] = useState<
    bigint | null
  >(null);

  const fetch = async () => {
    if (!receiver || !superToken || !client) return;
    const result = await client
      .query(STREAM_TO_TARGET_QUERY, {
        receiver: receiver.toLowerCase(),
        token: superToken?.toLowerCase(),
      })
      .toPromise()
      .catch((error) => {
        console.error("Error fetching superfluid stream:", error);
        return null;
      });
    if (result) {
      let totalFlowRate: bigint = result.data.streams.reduce(
        (acc: bigint, flow: { currentFlowRate: bigint }) =>
          acc + BigInt(flow.currentFlowRate),
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

        totalFlowRate = memberFlows.reduce((acc: bigint, flow) => {
          if (flow.error) {
            console.error("Error fetching member flow rate:", flow.error);
            return acc;
          }
          return acc + BigInt((flow.result as any).toString());
        }, totalFlowRate);
      }

      setCurrentFlowRateBn(totalFlowRate);

      setCurrentUserFlowRateBn(
        address ?
          BigInt(
            result.data.streams.find(
              (flow: { sender: { id: string } }) =>
                flow.sender.id.toLowerCase() === address.toLowerCase(),
            )?.currentFlowRate ?? "0",
          ) || null
        : null,
      );
    }
  };

  useEffect(() => {
    if (!client) return;
    fetch();
  }, [client, superToken]);

  return {
    currentFlowRateBn,
    setCurrentFlowRateBn,
    refetch: fetch,
    currentUserFlowRateBn,
    setCurrentUserFlowRateBn,
  };
}

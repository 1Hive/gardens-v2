import { useEffect, useState } from "react";
import { gql } from "urql";
import { useAccount } from "wagmi";
import { useSuperfluidSugraphClient as useSuperfluidSugraphClient } from "./useSuperfluidSubgraphClient";
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
    if (!receiver || !superToken) return;
    const result = await client?.query(STREAM_TO_TARGET_QUERY, {
      receiver: receiver.toLowerCase(),
      token: superToken?.toLowerCase(),
    });
    if (!result || result?.error)
      console.error(
        "Something wrong while fetching superfluid stream",
        result?.error,
      );
    else {
      const totalFlowRate = result.data.streams.reduce(
        (acc: bigint, flow: { currentFlowRate: bigint }) =>
          acc + BigInt(flow.currentFlowRate),
        0n,
      );
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
  }, [client]);

  return {
    currentFlowRateBn,
    setCurrentFlowRateBn,
    refetch: fetch,
    currentUserFlowRateBn,
    setCurrentUserFlowRateBn,
  };
}

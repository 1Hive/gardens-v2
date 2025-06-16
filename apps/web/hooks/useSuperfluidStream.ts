import { useEffect, useState } from "react";
import { gql } from "urql";
import { ChainId } from "@/types";
import { useSuperfluidSugraphClient as useSuperfluidSugraphClient } from "./useSuperfluidSubgraphClient";
import { useAccount } from "wagmi";

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

  const [currentFlowRate, setCurrentFlowRate] = useState<bigint | null>(null);
  const [currentUserFlowRate, setCurrentUserFlowRate] = useState<number | null>(
    null,
  );
  const fetch = async () => {
    const result = await client?.query(STREAM_TO_TARGET_QUERY, {
      receiver: receiver.toLowerCase(),
      token: superToken.toLowerCase(),
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
      setCurrentFlowRate(totalFlowRate);

      setCurrentUserFlowRate(
        address ?
          Number(
            result.data.streams.find(
              (flow: { sender: { id: string } }) =>
                flow.sender.id.toLowerCase() === address.toLowerCase(),
            )?.currentFlowRate,
          ) || null
        : null,
      );
    }
  };

  useEffect(() => {
    if (!client || !receiver || !superToken) return;
    fetch();
  }, [client]);

  return {
    currentFlowRate,
    setCurrentFlowRate,
    refetch: fetch,
    currentUserFlowRate,
    setCurrentUserFlowRate,
  };
}

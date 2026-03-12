import { gql } from "urql";
import { getGlobalPauseStateDocument } from "#/subgraph/.graphclient";
import { useChainIdFromPath } from "./useChainIdFromPath";
import { useSubgraphQuery } from "./useSubgraphQuery";

type GlobalPauseControllerState = {
  id: string;
  pausedUntil: string | null;
  pausedSelectors: string[];
  createdAt: string;
  updatedAt: string;
};

type GetGlobalPauseStateQuery = {
  globalPauseControllers: GlobalPauseControllerState[];
};

export function useIsPaused() {
  const chainId = useChainIdFromPath();
  const hasRouteChainId = chainId != null;

  const { data, fetching } = useSubgraphQuery<GetGlobalPauseStateQuery>({
    chainId: chainId,
    query: getGlobalPauseStateDocument,
    enabled: hasRouteChainId,
  });

  const pausedUntilRaw = data?.globalPauseControllers?.[0]?.pausedUntil;
  const pausedUntil = pausedUntilRaw != null ? Number(pausedUntilRaw) : null;
  const nowSec = Math.floor(Date.now() / 1000);
  const isPaused =
    hasRouteChainId &&
    pausedUntil != null &&
    Number.isFinite(pausedUntil) &&
    pausedUntil > nowSec;

  return {
    isPaused,
    pausedUntil: pausedUntil,
    loading: fetching,
  };
}

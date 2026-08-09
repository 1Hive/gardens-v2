import { Address } from "viem";

import type { PoolTypes } from "@/types";

export type PoolType = (typeof PoolTypes)[string];

export type PoolHeaderToken = {
  address: Address;
  symbol: string;
  decimals: number;
};

type ResolvePoolHeaderTokensArgs = {
  poolType: PoolType | undefined;
  /** Community token that determines voting power (`registryCommunity.garden`). */
  governanceToken: PoolHeaderToken;
  /** Asset held / spent / streamed by the strategy. Undefined for signaling pools. */
  poolToken?: PoolHeaderToken;
};

type PoolHeaderTokens = {
  /** Token that denominates voting weight. Always the governance token. */
  votingToken: PoolHeaderToken;
  /** Token whose identity is shown in the pool configuration. */
  configToken: PoolHeaderToken | undefined;
};

/**
 * Picks the tokens the pool header should display.
 *
 * Signaling pools have no funding token, so their configuration describes the
 * governance token instead. Voting weight is always denominated in the
 * governance token, since `pointConfig.maxAmount` is stored using its decimals.
 */
export function resolvePoolHeaderTokens({
  poolType,
  governanceToken,
  poolToken,
}: ResolvePoolHeaderTokensArgs): PoolHeaderTokens {
  return {
    votingToken: governanceToken,
    configToken: poolType === "signaling" ? governanceToken : poolToken,
  };
}

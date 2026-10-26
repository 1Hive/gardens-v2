import { randomBytes } from "node:crypto";
import { Address } from "viem";
import {
  consumeMarkeeChallenge,
  saveMarkeeChallenge,
} from "./markeeChallengeStore";

const NAMESPACE = "claim-quote";
const TTL_SECONDS = 300;

type QuoteTerms = {
  claimAmount: bigint;
  estimatedFeeAmount: bigint;
  estimatedNetworkFeeAmount: bigint;
  expectedAmountOut: bigint;
  markeeChainId: number;
  recipient: Address;
};
type Snapshot = QuoteTerms & {
  chainId: number;
  community: Address;
  expiresAt: number;
  maxFeeAmount: bigint;
};

export class ClaimQuoteUnavailableError extends Error {
  constructor() {
    super(
      "This claim quote expired or was already used. Refresh the quote and try again.",
    );
  }
}

// Store consent terms, NOT executable bridge calldata. Execution always requests
// a fresh route and enforces these signed limits against current on-chain state.
export async function saveClaimQuoteSnapshot(
  chainId: number,
  community: Address,
  quote: QuoteTerms,
) {
  const quoteId = randomBytes(32).toString("hex");
  const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  // A displayed ceiling, not permission to charge this amount automatically.
  const maxFeeAmount = (quote.estimatedFeeAmount * 105n + 99n) / 100n;
  await saveMarkeeChallenge({
    namespace: NAMESPACE,
    nonce: quoteId,
    ttlSeconds: TTL_SECONDS,
    value: {
      ...quote,
      chainId,
      community,
      expiresAt,
      maxFeeAmount,
    } satisfies Snapshot,
  });
  return { quoteId, expiresAt, maxFeeAmount };
}

export async function consumeClaimQuoteSnapshot(
  quoteId: string,
  chainId: number,
  community: Address,
  councilSafe: Address,
  markeeChainId: number,
) {
  const snapshot = await consumeMarkeeChallenge<Snapshot>({
    namespace: NAMESPACE,
    nonce: quoteId,
  });
  if (
    !snapshot ||
    snapshot.expiresAt <= Math.floor(Date.now() / 1000) ||
    snapshot.chainId !== chainId ||
    snapshot.markeeChainId !== markeeChainId ||
    snapshot.community.toLowerCase() !== community.toLowerCase() ||
    snapshot.recipient.toLowerCase() !== councilSafe.toLowerCase()
  ) {
    throw new ClaimQuoteUnavailableError();
  }
  return snapshot;
}

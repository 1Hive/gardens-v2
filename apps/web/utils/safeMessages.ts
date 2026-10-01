import { Address, Hex, hashTypedData, isHex } from "viem";
import { chainConfigMap } from "@/configs/chains";

const SAFE_API_BASE_URL = "https://api.safe.global/tx-service";
const SAFE_API_REQUEST_TIMEOUT_MS = 8_000;

// Testnets have no `safePrefix` in the chain config.
const TESTNET_SAFE_PREFIXES: Record<number, string> = {
  11155111: "sep",
};

export const getSafePrefix = (chainId: number) =>
  chainConfigMap[chainId]?.safePrefix ?? TESTNET_SAFE_PREFIXES[chainId];

/**
 * The hash Safe{Wallet} and the Safe Transaction Service use to track an
 * off-chain message (Safe >= 1.3.0 `getMessageHash`).
 */
export const getSafeMessageHash = ({
  chainId,
  messageHash,
  safe,
}: {
  chainId: number;
  messageHash: Hex;
  safe: Address;
}) =>
  hashTypedData({
    domain: { chainId, verifyingContract: safe },
    message: { message: messageHash },
    primaryType: "SafeMessage",
    types: { SafeMessage: [{ name: "message", type: "bytes" }] },
  });

export type SafeMessageStatus = {
  confirmations: number;
  preparedSignature: Hex | null;
};

/**
 * Reads owner confirmations for a Safe off-chain message. Returns null when the
 * message has not been proposed to the Safe Transaction Service yet.
 */
export const fetchSafeMessageStatus = async (
  chainId: number,
  safeMessageHash: Hex,
): Promise<SafeMessageStatus | null> => {
  const prefix = getSafePrefix(chainId);
  if (prefix == null) {
    throw new Error(`Safe Transaction Service is not available on ${chainId}`);
  }

  const apiKey = process.env.SAFE_API_KEY?.trim();
  const response = await fetch(
    `${SAFE_API_BASE_URL}/${prefix}/api/v1/messages/${safeMessageHash}/`,
    {
      cache: "no-store",
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      signal: AbortSignal.timeout(SAFE_API_REQUEST_TIMEOUT_MS),
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Safe Transaction Service returned HTTP ${response.status}`);
  }

  const body = (await response.json()) as {
    confirmations?: unknown;
    preparedSignature?: unknown;
  };

  return {
    confirmations:
      Array.isArray(body.confirmations) ? body.confirmations.length : 0,
    preparedSignature:
      typeof body.preparedSignature === "string" && isHex(body.preparedSignature) ?
        body.preparedSignature
      : null,
  };
};

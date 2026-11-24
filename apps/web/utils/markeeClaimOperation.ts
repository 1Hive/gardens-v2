import type { Address, Hex } from "viem";

export type ClaimOperationResult = {
  authorized?: boolean;
  bridgeName?: string | null;
  bridgeProtocol?: "across" | "lifi" | "none" | "squid";
  bridged?: boolean;
  estimatedRouteDurationSeconds?: number;
  markeeChainId?: number;
  transactionHash?: Hex;
  transactionUrl?: string;
};
export type ClaimOperation = {
  id: string;
  status: "working" | "submitted" | "complete" | "failed";
  result?: ClaimOperationResult;
  error?: string;
};
export type PendingClaimOperation = {
  version: 1;
  origin: "https://www.markee.xyz/api/sdk/v1";
  id: string;
};

const key = (chainId: number, community: Address) =>
  `gardens:markee:claim-operation:v1:${chainId}:${community.toLowerCase()}`;

export function readPendingClaimOperation(
  chainId: number,
  community: Address,
): PendingClaimOperation | null {
  const raw = window.localStorage.getItem(key(chainId, community));
  if (!raw) return null;
  const value = JSON.parse(raw) as PendingClaimOperation;
  if (
    value.version !== 1 ||
    value.origin !== "https://www.markee.xyz/api/sdk/v1" ||
    !/^[a-f0-9]{64}$/u.test(value.id)
  )
    throw new Error(
      "Unsupported pending claim. Check its status before authorizing again.",
    );
  return value;
}

export function clearPendingClaimOperation(
  chainId: number,
  community: Address,
) {
  window.localStorage.removeItem(key(chainId, community));
}

export async function claimOperationId(nonce: string, signature: Hex) {
  const bytes = new TextEncoder().encode(
    `community/claim:${nonce}:${signature}`,
  );
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function parseClaimOperation(
  value: unknown,
  id: string,
): ClaimOperation {
  const operation = value as ClaimOperation | null;
  if (
    !operation ||
    operation.id !== id ||
    !["working", "submitted", "complete", "failed"].includes(operation.status)
  )
    throw new Error(
      "Invalid claim status. Check again before authorizing another claim.",
    );
  if (
    operation.result?.transactionHash !== undefined &&
    !/^0x[a-f0-9]{64}$/iu.test(operation.result.transactionHash)
  )
    throw new Error("Invalid claim transaction hash.");
  if (operation.status === "complete" && !operation.result?.transactionHash)
    throw new Error(
      "Claim confirmation omitted its transaction hash. Check again.",
    );
  return operation;
}

export async function checkClaimOperation(
  pending: PendingClaimOperation,
): Promise<ClaimOperation> {
  const response = await fetch(
    `/api/markee/claim/authorize?operationId=${pending.id}`,
    { cache: "no-store" },
  );
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      body.error ||
        "Claim status is unavailable. Check again before authorizing another claim.",
    );
  return parseClaimOperation(body, pending.id);
}

export async function submitClaimOperation(
  chainId: number,
  community: Address,
  nonce: string,
  signature: Hex,
): Promise<ClaimOperation> {
  if (readPendingClaimOperation(chainId, community))
    throw new Error(
      "A claim is already pending. Check it before authorizing another.",
    );
  const pending: PendingClaimOperation = {
    version: 1,
    origin: "https://www.markee.xyz/api/sdk/v1",
    id: await claimOperationId(nonce, signature),
  };
  // Persist before submission so a timed-out POST is recoverable by status.
  window.localStorage.setItem(key(chainId, community), JSON.stringify(pending));
  const response = await fetch("/api/markee/claim/authorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "verify", nonce, signature }),
  });
  const body = await response.json();
  if (!response.ok) {
    if (response.status >= 400 && response.status < 500)
      clearPendingClaimOperation(chainId, community);
    throw new Error(
      body.error ||
        "Claim status is uncertain. Check before authorizing again.",
    );
  }
  return parseClaimOperation(body, pending.id);
}

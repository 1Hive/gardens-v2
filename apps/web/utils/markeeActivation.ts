import type { Address, Hex } from "viem";

export type ActivationResult = {
  authorized?: boolean;
  transactionHash?: Hex;
  router?: Address;
  markeeChainId?: number;
};
export type ActivationOperation = {
  id: string;
  status: "working" | "submitted" | "complete" | "failed";
  result?: ActivationResult;
  error?: string;
};
export type PendingActivation = {
  version: 1;
  origin: "https://www.markee.xyz/api/sdk/v1";
  id: string;
  apiUrl: "/api/markee/authorize";
};
const key = (chainId: number, community: Address) =>
  `gardens:markee:activation:v1:${chainId}:${community.toLowerCase()}`;
const idPattern = /^[a-f0-9]{64}$/u;
export function readPendingActivation(
  chainId: number,
  community: Address,
): PendingActivation | null {
  const raw = window.localStorage.getItem(key(chainId, community));
  if (!raw) return null;
  const value = JSON.parse(raw) as PendingActivation;
  if (
    value.version !== 1 ||
    value.origin !== "https://www.markee.xyz/api/sdk/v1" ||
    !idPattern.test(value.id) ||
    value.apiUrl !== "/api/markee/authorize"
  )
    throw new Error(
      "Unsupported pending Markee activation. Check community status before continuing.",
    );
  return value;
}
export function clearPendingActivation(chainId: number, community: Address) {
  window.localStorage.removeItem(key(chainId, community));
}
export function parseActivationOperation(
  value: unknown,
  id: string,
): ActivationOperation {
  const op = value as ActivationOperation | null;
  if (
    !op ||
    op.id !== id ||
    !["working", "submitted", "complete", "failed"].includes(op.status)
  )
    throw new Error(
      "Invalid activation status. Check again before authorizing another activation.",
    );
  if (
    op.result?.transactionHash !== undefined &&
    !/^0x[a-f0-9]{64}$/iu.test(op.result.transactionHash)
  )
    throw new Error("Invalid activation transaction hash.");
  if (op.status === "complete" && !op.result?.transactionHash)
    throw new Error(
      "Activation confirmation omitted its transaction hash. Check again.",
    );
  return op;
}
export async function activationOperationId(nonce: string, signature: Hex) {
  const bytes = new TextEncoder().encode(
    `community/activate:${nonce}:${signature}`,
  );
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export async function checkActivation(
  pending: PendingActivation,
): Promise<ActivationOperation> {
  const response = await fetch(`${pending.apiUrl}?operationId=${pending.id}`, {
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      body.error ||
        "Activation status is unavailable. Check again before authorizing another activation.",
    );
  return parseActivationOperation(body, pending.id);
}
export async function submitActivation(
  chainId: number,
  community: Address,
  nonce: string,
  signature: Hex,
): Promise<ActivationOperation> {
  if (readPendingActivation(chainId, community))
    throw new Error(
      "An activation is already pending. Check it before authorizing another.",
    );
  const pending: PendingActivation = {
    version: 1,
    origin: "https://www.markee.xyz/api/sdk/v1",
    id: await activationOperationId(nonce, signature),
    apiUrl: "/api/markee/authorize",
  };
  // Persist before submission. If storage fails, do not submit an unrecoverable action.
  window.localStorage.setItem(key(chainId, community), JSON.stringify(pending));
  const response = await fetch(pending.apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "verify", nonce, signature }),
  });
  const body = await response.json();
  if (!response.ok) {
    // An explicit rejection before execution is safe to retry with a new challenge.
    // A gateway/server failure may hide an already-submitted transaction: retain it.
    if (response.status >= 400 && response.status < 500)
      clearPendingActivation(chainId, community);
    throw new Error(
      body.error ||
        "Activation status is uncertain. Check before authorizing again.",
    );
  }
  return parseActivationOperation(body.operation, pending.id);
}

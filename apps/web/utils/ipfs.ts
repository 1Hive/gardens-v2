/**
 * Returns true when `value` is a plausible IPFS CID string.
 * The pattern is intentionally broad to cover both CIDv0 (base58btc, ~46 chars)
 * and CIDv1 (base32/base64url, 59+ chars) without being overly restrictive.
 * It rejects any value containing path separators, whitespace, or other
 * characters that could enable path-traversal / SSRF when building URLs.
 */
export const isValidCid = (value: string): boolean => {
  const cid = value.trim();
  // Broad alphanumeric allowlist that covers CIDv0 (base58btc) and CIDv1 (base32/base64url).
  return /^[A-Za-z0-9]{46,120}$/.test(cid);
};

/**
 * Builds a safe IPFS gateway URL for the given CID.
 * Uses `new URL()` + `encodeURIComponent` to avoid path-shaping issues.
 */
export const buildIpfsUrl = (gateway: string, cid: string): string => {
  return new URL(`/ipfs/${encodeURIComponent(cid)}`, gateway).toString();
};

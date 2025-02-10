export const HTTP_CODES = {
  SUCCESS: 200,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_ALLOWED: 405,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

export const isSafeAvatarUrl = (avatarUrl?: string | null) => {
  if (!avatarUrl) return false;
  // **Extra Security: Validate the URL before setting**
  if (
    [
      "metadata.ens.domains", // Official ENS metadata service (best choice)
      "ipfs.io", // Public IPFS gateway
      "arweave.net", // Arweave storage (some ENS avatars are hosted here)
      "nftstorage.link", // NFT.Storage, used for IPFS images
      "gateway.pinata.cloud", // Pinata IPFS Gateway (often used for ENS avatars)
      "cloudflare-ipfs.com", // Cloudflare's IPFS gateway (faster alternative)
      "euc.li", // ENS avatar gateway
    ].some((x) => avatarUrl.startsWith(`https://${x}`))
  ) {
    return true;
  } else {
    console.warn("Blocked unsafe ENS avatar:", avatarUrl);
    return false;
  }
};

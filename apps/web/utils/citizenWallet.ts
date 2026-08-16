import { Address, encodeFunctionData, getAddress, parseAbi } from "viem";

export const CITIZEN_WALLET_CHAIN_ID = 100;
export const CITIZEN_WALLET_ALIAS = "bread";
export const BREAD_TOKEN_ADDRESS = getAddress(
  "0xa555d5344f6fb6c65da19e403cb4c1ec4a1a5ee3",
);
export const CITIZEN_COVENANT_BYPASS = "0x0";

const erc20ApproveAbi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
]);
const registryCommunityMemberAbi = parseAbi([
  "function stakeAndRegisterMember(string covenantSig)",
]);

export type CitizenRegistrationAction =
  | "already-registered"
  | "insufficient-balance"
  | "approve"
  | "register";

export type CitizenConnectionParams = {
  sigAuthAccount: string;
  sigAuthExpiry: string;
  sigAuthSignature: string;
  sigAuthRedirect: string;
};

export function isBreadCitizenRegistration(args: {
  chainId: number | undefined;
  tokenAddress: string | undefined;
}) {
  if (args.chainId !== CITIZEN_WALLET_CHAIN_ID || !args.tokenAddress) {
    return false;
  }

  try {
    return getAddress(args.tokenAddress) === BREAD_TOKEN_ADDRESS;
  } catch {
    return false;
  }
}

export function buildCitizenRegistrationPath(
  communityAddress: string,
  chainId = CITIZEN_WALLET_CHAIN_ID,
) {
  return `/gardens/${chainId}/${getAddress(communityAddress)}/citizen`;
}

export function buildCitizenConnectedUrl(
  baseUrl: string,
  connectionParams: CitizenConnectionParams,
) {
  const base = new URL(baseUrl);
  const url = new URL(base.pathname, base.origin);
  Object.entries(connectionParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url;
}

export function isAllowedCitizenRedirect(redirectUrl: string) {
  try {
    const url = new URL(redirectUrl);
    return (
      url.protocol === "https:" &&
      url.hostname === "app.citizenwallet.xyz" &&
      (url.port === "" || url.port === "443")
    );
  } catch {
    return false;
  }
}

export function encodeCitizenApproval(args: {
  communityAddress: Address;
  amount: bigint;
}) {
  return encodeFunctionData({
    abi: erc20ApproveAbi,
    functionName: "approve",
    args: [args.communityAddress, args.amount],
  });
}

export function encodeCitizenRegistration() {
  return encodeFunctionData({
    abi: registryCommunityMemberAbi,
    functionName: "stakeAndRegisterMember",
    args: [CITIZEN_COVENANT_BYPASS],
  });
}

export function getCitizenRegistrationAction(args: {
  isMember: boolean;
  balance: bigint;
  allowance: bigint;
  registrationCost: bigint;
}): CitizenRegistrationAction {
  if (args.isMember) return "already-registered";
  if (args.balance < args.registrationCost) return "insufficient-balance";
  if (args.allowance < args.registrationCost) return "approve";
  return "register";
}

export function buildCitizenCalldataUrl(args: {
  redirectUrl: string;
  target: Address;
  calldata: `0x${string}`;
  successUrl: string;
}) {
  if (!isAllowedCitizenRedirect(args.redirectUrl)) {
    throw new Error("Untrusted Citizen Wallet redirect URL.");
  }

  const url = new URL(args.redirectUrl);
  url.pathname = "/";
  url.hash = "";
  url.search = "";
  url.searchParams.set("alias", CITIZEN_WALLET_ALIAS);
  url.searchParams.set("address", args.target);
  url.searchParams.set("value", "0");
  url.searchParams.set("calldata", args.calldata);
  url.searchParams.set("success", args.successUrl);
  return url.toString();
}

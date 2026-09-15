import "server-only";

import {
  CommunityConfig,
  generateConnectionMessage,
  getAccountAddress,
  verifyConnectedUrl,
} from "@citizenwallet/sdk";
import { Address, getAddress, Hex, recoverMessageAddress } from "viem";
import breadCommunityJson from "../configs/citizenWalletBread.json";
import {
  CitizenConnectionParams,
  isAllowedCitizenRedirect,
} from "./citizenWallet";
import { getEnvPublicClient } from "./publicClient";

export type CitizenSearchParams = Record<string, string | string[] | undefined>;

export type VerifiedCitizenConnection = {
  account: Address;
  redirectUrl: string;
};

const breadCommunity = new CommunityConfig(breadCommunityJson as never);
const breadAccountFactories = Object.values(breadCommunityJson.accounts).map(
  ({ account_factory_address }) => account_factory_address,
);

function getSingleParam(
  params: CitizenSearchParams,
  key: string,
): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export function hasCitizenConnectionParams(params: CitizenSearchParams) {
  return [
    "sigAuthAccount",
    "sigAuthExpiry",
    "sigAuthSignature",
    "sigAuthRedirect",
  ].every((key) => Boolean(getSingleParam(params, key)));
}

export function getCitizenConnectionParams(
  params: CitizenSearchParams,
): CitizenConnectionParams | null {
  const connectionParams = {
    sigAuthAccount: getSingleParam(params, "sigAuthAccount"),
    sigAuthExpiry: getSingleParam(params, "sigAuthExpiry"),
    sigAuthSignature: getSingleParam(params, "sigAuthSignature"),
    sigAuthRedirect: getSingleParam(params, "sigAuthRedirect"),
  };

  if (Object.values(connectionParams).some((value) => !value)) return null;
  return connectionParams as CitizenConnectionParams;
}

export async function verifyCitizenConnection(
  params: CitizenSearchParams,
): Promise<VerifiedCitizenConnection | null> {
  const connectionParams = getCitizenConnectionParams(params);
  if (!connectionParams) return null;
  const {
    sigAuthRedirect: redirectUrl,
    sigAuthExpiry: expiry,
    sigAuthSignature: signature,
  } = connectionParams;
  if (!redirectUrl || !isAllowedCitizenRedirect(redirectUrl)) {
    return null;
  }

  const urlParams = new URLSearchParams();
  for (const key of [
    "sigAuthAccount",
    "sigAuthExpiry",
    "sigAuthSignature",
    "sigAuthRedirect",
  ]) {
    const value = getSingleParam(params, key);
    if (value) urlParams.set(key, value);
  }

  try {
    const account = await verifyConnectedUrl(breadCommunity, {
      params: urlParams,
    });
    if (!account || !expiry || !signature) return null;

    const normalizedAccount = getAddress(account);
    const connectionMessage = generateConnectionMessage(
      normalizedAccount,
      expiry,
      redirectUrl,
    ) as Hex;
    const owner = await recoverMessageAddress({
      message: { raw: connectionMessage },
      signature: signature as Hex,
    });

    // The Citizen SDK also accepts directly signed EOAs. Gardens scopes the
    // covenant bypass to Citizen smart accounts, so an EOA-only envelope is
    // not sufficient even when its signature is otherwise valid.
    if (getAddress(owner) === normalizedAccount) return null;

    const bytecode = await getEnvPublicClient(100).getBytecode({
      address: normalizedAccount,
    });
    if (!bytecode || bytecode === "0x") {
      const predictedAccounts = await Promise.all(
        breadAccountFactories.map((accountFactoryAddress) =>
          getAccountAddress(breadCommunity, owner, 0n, {
            accountFactoryAddress,
          }),
        ),
      );
      const matchesCitizenFactory = predictedAccounts.some(
        (predicted) =>
          predicted != null && getAddress(predicted) === normalizedAccount,
      );
      if (!matchesCitizenFactory) return null;
    }

    return {
      account: normalizedAccount,
      redirectUrl,
    };
  } catch {
    return null;
  }
}

import { Address, Hex, isHex, stringToHex } from "viem";

type Eip1193Provider = {
  request: (args: {
    method: string;
    params?: readonly unknown[];
  }) => Promise<unknown>;
  selectedProvider?: unknown;
};

type WalletConnector = {
  getProvider: () => Promise<unknown>;
};

const hasRequestMethod = (provider: unknown): provider is Eip1193Provider =>
  typeof (provider as Eip1193Provider | undefined)?.request === "function";

export const resolveSigningProvider = (provider: unknown): Eip1193Provider => {
  const selectedProvider = (provider as Eip1193Provider | undefined)
    ?.selectedProvider;

  // Multi-wallet injectors (notably Brave with wallet extensions installed)
  // may expose an aggregate provider. Use the provider selected during connect
  // so the signature cannot be routed to a different injected wallet.
  if (hasRequestMethod(selectedProvider)) {
    return selectedProvider;
  }

  if (hasRequestMethod(provider)) {
    return provider;
  }

  throw new Error(
    "The connected wallet does not expose a valid request() method. Disconnect and reconnect the wallet, then try again.",
  );
};

export const signMessageWithProvider = async ({
  connector,
  account,
  message,
}: {
  connector: WalletConnector;
  account: Address;
  message: string;
}): Promise<Hex> => {
  const provider = resolveSigningProvider(await connector.getProvider());
  const signature = await provider.request({
    method: "personal_sign",
    params: [stringToHex(message), account],
  });

  if (typeof signature !== "string" || !isHex(signature)) {
    throw new Error("The wallet returned an invalid message signature.");
  }

  return signature;
};

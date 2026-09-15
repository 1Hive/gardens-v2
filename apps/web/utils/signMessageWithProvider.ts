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

type ErrorLike = {
  cause?: unknown;
  code?: unknown;
  message?: unknown;
  name?: unknown;
};

const USER_REJECTION_MESSAGES = [
  "user rejected",
  "user denied",
  "rejected by user",
  "request rejected",
];

const isErrorLike = (error: unknown): error is ErrorLike =>
  typeof error === "object" && error !== null;

export const isUserRejectedWalletRequest = (error: unknown): boolean => {
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (isErrorLike(current) && !seen.has(current)) {
    seen.add(current);

    if (
      current.code === 4001 ||
      current.code === "4001" ||
      current.code === "ACTION_REJECTED" ||
      current.name === "UserRejectedRequestError"
    ) {
      return true;
    }

    const normalizedMessage =
      typeof current.message === "string" ? current.message.toLowerCase() : "";
    if (
      USER_REJECTION_MESSAGES.some((message) =>
        normalizedMessage.includes(message),
      )
    ) {
      return true;
    }

    current = current.cause;
  }

  return false;
};

export const getCovenantSignatureErrorAction = (
  error: unknown,
): "block" | "skip" => (isUserRejectedWalletRequest(error) ? "block" : "skip");

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

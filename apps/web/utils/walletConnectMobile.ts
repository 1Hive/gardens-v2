const WALLETCONNECT_DEEPLINK_CHOICE_STORAGE_KEY =
  "WALLETCONNECT_DEEPLINK_CHOICE";
const WALLETCONNECT_STORAGE_PREFIXES = [
  "walletconnect",
  "WALLETCONNECT_",
  "wc@2:",
];
const WAGMI_CONNECTION_STORAGE_KEYS = [
  "connectKit.lastConnectorId",
  "wagmi.cache",
  "wagmi.connected",
  "wagmi.store",
  "wagmi.wallet",
];

export const WALLETCONNECT_CONNECTOR_IDS = new Set([
  "walletConnect",
  "walletConnectLegacy",
]);

export type WalletConnectDeepLinkChoice = {
  href: string;
  label: string;
};

const removeMatchingStorageEntries = (
  storage: Storage,
  shouldRemove: (key: string) => boolean,
) => {
  const keys = Array.from({ length: storage.length }, (_, index) =>
    storage.key(index),
  ).filter((key): key is string => key != null);
  const removedKeys = keys.filter(shouldRemove);

  removedKeys.forEach((key) => storage.removeItem(key));

  return removedKeys;
};

export const clearWalletConnectSessionStorage = () => {
  if (typeof window === "undefined") {
    return { localStorageKeys: [], sessionStorageKeys: [] };
  }

  const shouldRemove = (key: string) =>
    key === WALLETCONNECT_DEEPLINK_CHOICE_STORAGE_KEY ||
    WAGMI_CONNECTION_STORAGE_KEYS.includes(key) ||
    WALLETCONNECT_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));

  try {
    return {
      localStorageKeys: removeMatchingStorageEntries(
        window.localStorage,
        shouldRemove,
      ),
      sessionStorageKeys: removeMatchingStorageEntries(
        window.sessionStorage,
        shouldRemove,
      ),
    };
  } catch (error) {
    console.info("[walletconnect-debug] failed to clear session storage", {
      error,
    });
    return { localStorageKeys: [], sessionStorageKeys: [] };
  }
};

export const isMobileBrowser = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(pointer: coarse)").matches ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|Opera Mini/u.test(
      window.navigator.userAgent,
    )
  );
};

export const getWalletConnectDeepLinkChoice = ():
  | WalletConnectDeepLinkChoice
  | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const storedChoice = window.localStorage.getItem(
      WALLETCONNECT_DEEPLINK_CHOICE_STORAGE_KEY,
    );
    if (!storedChoice) {
      return undefined;
    }

    const choice = JSON.parse(storedChoice) as {
      href?: unknown;
      name?: unknown;
    };
    const href = typeof choice.href === "string" ? choice.href : undefined;
    if (!href) {
      return undefined;
    }

    return {
      href,
      label: typeof choice.name === "string" ? choice.name : "wallet",
    };
  } catch {
    return undefined;
  }
};

const WALLETCONNECT_DEEPLINK_CHOICE_STORAGE_KEY =
  "WALLETCONNECT_DEEPLINK_CHOICE";

export const WALLETCONNECT_CONNECTOR_IDS = new Set([
  "walletConnect",
  "walletConnectLegacy",
]);

export type WalletConnectDeepLinkChoice = {
  href: string;
  label: string;
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

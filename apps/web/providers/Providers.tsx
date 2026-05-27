"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AddrethConfig } from "addreth";
import { ConnectKitProvider, getDefaultConnectors, useModal } from "connectkit";
import { Bounce, ToastContainer } from "react-toastify";
import { Address, createWalletClient, custom, isAddress } from "viem";
import { base } from "viem/chains";
import {
  Chain,
  ConnectorAlreadyConnectedError,
  configureChains,
  createConfig,
  mainnet,
  useAccount,
  useNetwork,
  WagmiConfig,
} from "wagmi";
import { connect, disconnect } from "wagmi/actions";
import { MockConnector } from "wagmi/connectors/mock";
import { WalletConnectConnector } from "wagmi/connectors/walletConnect";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { publicProvider } from "wagmi/providers/public";
import ThemeProvider from "./ThemeProvider";
import { TransactionNotificationProvider } from "./TransactionNotificationProvider";
import { UrqlProvider } from "./UrqlProvider";
import { CHAINS, getConfigByChain } from "@/configs/chains";
import { QUERY_PARAMS } from "@/constants/query-params";
import {
  QueryParamsProvider,
  useCollectQueryParams,
} from "@/contexts/collectQueryParams.context";
import { PubSubProvider } from "@/contexts/pubsub.context";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useTheme } from "@/providers/ThemeProvider";
import { logOnce } from "@/utils/log";
import {
  getWalletConnectDeepLinkChoice,
  isMobileBrowser,
  WalletConnectDeepLinkChoice,
} from "@/utils/walletConnectMobile";

const dedupeChains = (chainList: Chain[]) =>
  chainList.filter(
    (candidate, index, arr) =>
      arr.findIndex((item) => item.id === candidate.id) === index,
  );

const getConfiguredChains = () => dedupeChains([...CHAINS, base, mainnet]);

const APP_NAME = "Gardens V2";
const APP_DESCRIPTION = "Gardens governance and funding";
const APP_URL =
  typeof window === "undefined" ?
    "https://app.gardens.fund"
  : window.location.origin;
const APP_ICON = `${APP_URL}/favicon.ico`;
const APP_METADATA = {
  name: APP_NAME,
  description: APP_DESCRIPTION,
  url: APP_URL,
  icons: [APP_ICON],
};
const WALLET_STORAGE_MIGRATION_KEY =
  "gardens.wallet-storage-migration.connectkit.v1";
const STALE_WALLET_STORAGE_EXACT_KEYS = new Set([
  "wagmi.cache",
  "wagmi.connected",
  "wagmi.store",
  "WALLETCONNECT_DEEPLINK_CHOICE",
]);
const STALE_WALLET_STORAGE_PREFIXES = [
  "rainbowkit.",
  "rk_",
  "rk-",
  "walletconnect",
  "WALLETCONNECT_",
  "wc@2:",
];

const CONNECT_KIT_THEME = {
  "--ck-font-family": "var(--font-chakra)",
  "--ck-border-radius": "16px",
  "--ck-overlay-background": "var(--ck-gardens-overlay-background)",
  "--ck-modal-box-shadow": "var(--ck-gardens-modal-box-shadow)",
  "--ck-body-color": "var(--ck-gardens-body-color)",
  "--ck-body-color-muted": "var(--ck-gardens-body-color-muted)",
  "--ck-body-color-muted-hover": "var(--ck-gardens-body-color-muted-hover)",
  "--ck-body-background": "var(--ck-gardens-body-background)",
  "--ck-body-background-transparent":
    "var(--ck-gardens-body-background-transparent)",
  "--ck-body-background-secondary":
    "var(--ck-gardens-body-background-secondary)",
  "--ck-body-background-secondary-hover-background":
    "var(--ck-gardens-body-background-secondary-hover-background)",
  "--ck-body-background-secondary-hover-outline":
    "var(--ck-gardens-body-background-secondary-hover-outline)",
  "--ck-body-background-tertiary": "var(--ck-gardens-body-background-tertiary)",
  "--ck-body-action-color": "var(--ck-gardens-body-action-color)",
  "--ck-body-divider": "var(--ck-gardens-body-divider)",
  "--ck-body-color-danger": "#eb4848",
  "--ck-body-color-valid": "var(--ck-gardens-body-color-valid)",
  "--ck-primary-button-color": "var(--ck-gardens-primary-button-color)",
  "--ck-primary-button-background":
    "var(--ck-gardens-primary-button-background)",
  "--ck-primary-button-hover-background":
    "var(--ck-gardens-primary-button-hover-background)",
  "--ck-primary-button-active-background":
    "var(--ck-gardens-primary-button-active-background)",
  "--ck-primary-button-box-shadow":
    "var(--ck-gardens-primary-button-box-shadow)",
  "--ck-primary-button-border-radius": "8px",
  "--ck-secondary-button-color": "var(--ck-gardens-secondary-button-color)",
  "--ck-secondary-button-background":
    "var(--ck-gardens-secondary-button-background)",
  "--ck-secondary-button-hover-background":
    "var(--ck-gardens-secondary-button-hover-background)",
  "--ck-secondary-button-box-shadow":
    "var(--ck-gardens-secondary-button-box-shadow)",
  "--ck-secondary-button-border-radius": "8px",
  "--ck-tertiary-button-background":
    "var(--ck-gardens-tertiary-button-background)",
  "--ck-focus-color": "var(--ck-gardens-focus-color)",
  "--ck-tooltip-background": "var(--ck-gardens-tooltip-background)",
  "--ck-tooltip-background-secondary":
    "var(--ck-gardens-tooltip-background-secondary)",
  "--ck-tooltip-color": "var(--ck-gardens-tooltip-color)",
  "--ck-tooltip-shadow": "var(--ck-gardens-tooltip-shadow)",
  "--ck-dropdown-button-color": "var(--ck-gardens-dropdown-button-color)",
  "--ck-dropdown-button-background":
    "var(--ck-gardens-dropdown-button-background)",
  "--ck-dropdown-button-hover-color":
    "var(--ck-gardens-dropdown-button-hover-color)",
  "--ck-dropdown-button-hover-background":
    "var(--ck-gardens-dropdown-button-hover-background)",
  "--ck-dropdown-button-box-shadow":
    "var(--ck-gardens-dropdown-button-box-shadow)",
  "--ck-qr-dot-color": "var(--ck-gardens-qr-dot-color)",
  "--ck-qr-border-color": "var(--ck-gardens-qr-border-color)",
  "--ck-qr-background": "var(--ck-gardens-qr-background)",
  "--ck-copytoclipboard-stroke": "var(--ck-gardens-copytoclipboard-stroke)",
};

const shouldRemoveStaleWalletStorageKey = (key: string) =>
  STALE_WALLET_STORAGE_EXACT_KEYS.has(key) ||
  STALE_WALLET_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));

const removeStaleWalletStorageEntries = (storage: Storage) => {
  const keys = Array.from({ length: storage.length }, (_, index) =>
    storage.key(index),
  ).filter((key): key is string => key != null);
  const staleKeys = keys.filter(shouldRemoveStaleWalletStorageKey);

  staleKeys.forEach((key) => storage.removeItem(key));

  return staleKeys;
};

const resetStaleWalletStorageForConnectKitMigration = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (window.localStorage.getItem(WALLET_STORAGE_MIGRATION_KEY) === "done") {
      return;
    }

    const localStorageKeys = removeStaleWalletStorageEntries(
      window.localStorage,
    );
    const sessionStorageKeys = removeStaleWalletStorageEntries(
      window.sessionStorage,
    );

    window.localStorage.setItem(WALLET_STORAGE_MIGRATION_KEY, "done");

    if (localStorageKeys.length > 0 || sessionStorageKeys.length > 0) {
      console.info("[wallet-migration] cleared stale wallet storage", {
        localStorageKeys,
        sessionStorageKeys,
      });
    }
  } catch (error) {
    console.info("[wallet-migration] failed to clear stale wallet storage", {
      error,
    });
  }
};

const getWalletConnectProviderSnapshot = async (provider: any) => {
  if (!provider) {
    return null;
  }

  let chainId: unknown;
  let accounts: unknown;

  try {
    chainId = await provider.request?.({ method: "eth_chainId" });
  } catch (error) {
    chainId = {
      error: error instanceof Error ? error.message : String(error),
    };
  }

  try {
    accounts = await provider.request?.({ method: "eth_accounts" });
  } catch (error) {
    accounts = {
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return {
    chainId,
    accounts,
    sessionTopic: provider.session?.topic,
    sessionNamespaces: provider.session?.namespaces,
    sessionRequiredNamespaces: provider.session?.requiredNamespaces,
    sessionOptionalNamespaces: provider.session?.optionalNamespaces,
    providerChainId: provider.chainId,
    providerAccounts: provider.accounts,
  };
};

const createCustomConfig = (
  preferredSimulatedChain: Chain | undefined,
  simulatedWallet?: Address,
) => {
  const { chains, publicClient } = configureChains(getConfiguredChains(), [
    jsonRpcProvider({
      rpc: (chain) => ({
        http:
          getConfigByChain(chain.id)?.rpcUrl?.trim() ??
          chain.rpcUrls.default.http[0],
      }),
    }),
    publicProvider(),
  ]);
  const walletConnectProjectId =
    process.env.NEXT_PUBLIC_WALLET_CONNECT_ID ?? "";
  // Do not pass walletConnectProjectId here: ConnectKit constructs the
  // WalletConnect provider eagerly, so replacing that connector afterwards
  // leaves an extra provider racing the real QR pairing session.
  const defaultConnectors = getDefaultConnectors({
    chains,
    app: {
      ...APP_METADATA,
      icon: APP_ICON,
    },
  });
  const walletConnectConnector =
    walletConnectProjectId ?
      new WalletConnectConnector({
        chains,
        options: {
          projectId: walletConnectProjectId,
          showQrModal: false,
          isNewChainsStale: false,
          metadata: APP_METADATA,
        },
      })
    : null;
  const connectors =
    walletConnectConnector ?
      defaultConnectors.map((connector) =>
        connector.id === "walletConnectLegacy" ?
          walletConnectConnector
        : connector,
      )
    : defaultConnectors;

  let simulatedConnector: MockConnector | undefined;
  if (simulatedWallet) {
    const simulatedChain = preferredSimulatedChain ?? chains[0] ?? mainnet;
    const mockWalletClient = createWalletClient({
      account: simulatedWallet,
      chain: simulatedChain,
      transport: custom({
        async request({ method }) {
          throw new Error(
            `Simulated wallet cannot respond to "${method}" requests.`,
          );
        },
      }),
    });

    simulatedConnector = new MockConnector({
      chains,
      options: {
        walletClient: mockWalletClient,
        chainId: simulatedChain.id,
        flags: {
          isAuthorized: true,
        },
      },
    });
  }

  const resolvedConnectors =
    simulatedConnector ? [simulatedConnector, ...connectors] : connectors;

  return {
    config: createConfig({
      autoConnect: true,
      connectors: resolvedConnectors,
      publicClient,
    }),
    simulatedConnector,
  };
};

type CustomWagmiConfig = ReturnType<typeof createCustomConfig>["config"];

type Props = {
  children: React.ReactNode;
};

const Providers = ({ children }: Props) => {
  return (
    <Suspense fallback={null}>
      <QueryParamsProvider>
        <ProvidersWithQueryParams>{children}</ProvidersWithQueryParams>
      </QueryParamsProvider>
    </Suspense>
  );
};

const ProvidersWithQueryParams = ({ children }: Props) => {
  const [mounted, setMounted] = useState(false);
  const chain = useChainFromPath() as Chain | undefined;
  const queryParams = useCollectQueryParams();

  const simulatedWallet = useMemo(() => {
    const walletFromQuery = queryParams?.[QUERY_PARAMS.simulatedWallet];
    if (!walletFromQuery) {
      return undefined;
    }
    if (!isAddress(walletFromQuery)) {
      logOnce(
        "warn",
        `[Simulated Wallet] Ignoring invalid "${QUERY_PARAMS.simulatedWallet}" query param`,
        walletFromQuery,
      );
      return undefined;
    }
    return walletFromQuery as Address;
  }, [queryParams]);
  const preferredSimulatedChain = simulatedWallet ? chain : undefined;

  const [wagmiConfig, setWagmiConfig] = useState<CustomWagmiConfig | null>(
    null,
  );
  const [simulatedConnector, setSimulatedConnector] =
    useState<MockConnector | null>(null);
  const [activeSimulatedWallet, setActiveSimulatedWallet] =
    useState<Address | null>(null);

  useEffect(() => {
    resetStaleWalletStorageForConnectKitMigration();

    console.info("[walletconnect-debug] creating wagmi config", {
      routeChain: chain ? { id: chain.id, name: chain.name } : undefined,
      preferredSimulatedChain:
        preferredSimulatedChain ?
          {
            id: preferredSimulatedChain.id,
            name: preferredSimulatedChain.name,
          }
        : undefined,
      configuredChains: getConfiguredChains().map((configuredChain) => ({
        id: configuredChain.id,
        name: configuredChain.name,
      })),
    });

    const { config, simulatedConnector: newSimulatedConnector } =
      createCustomConfig(preferredSimulatedChain, simulatedWallet);
    setWagmiConfig(config);
    setSimulatedConnector(newSimulatedConnector ?? null);
    setMounted(true);
  }, [simulatedWallet, preferredSimulatedChain]);

  useEffect(() => {
    if (!wagmiConfig) {
      return;
    }

    if (!simulatedWallet || !simulatedConnector) {
      if (activeSimulatedWallet) {
        disconnect()
          .catch((error) => {
            logOnce("warn", "[Simulated Wallet] Failed to disconnect", error);
          })
          .finally(() => setActiveSimulatedWallet(null));
      }
      return;
    }

    if (activeSimulatedWallet === simulatedWallet) {
      return;
    }

    let cancelled = false;

    connect({ connector: simulatedConnector })
      .then(() => {
        if (!cancelled) {
          setActiveSimulatedWallet(simulatedWallet);
          logOnce("info", `[Simulated Wallet] Connected as ${simulatedWallet}`);
        }
      })
      .catch((error) => {
        if (error instanceof ConnectorAlreadyConnectedError) {
          setActiveSimulatedWallet(simulatedWallet);
          return;
        }
        logOnce("error", "[Simulated Wallet] Failed to connect", error);
      });

    return () => {
      cancelled = true;
    };
  }, [activeSimulatedWallet, simulatedConnector, simulatedWallet, wagmiConfig]);

  if (!mounted || !wagmiConfig) {
    return null;
  }

  return (
    <UrqlProvider>
      <WagmiConfig config={wagmiConfig}>
        <AddrethConfig>
          <ThemeProvider>
            <ThemeAware>
              <PubSubProvider>{children}</PubSubProvider>
            </ThemeAware>
          </ThemeProvider>
        </AddrethConfig>
      </WagmiConfig>
    </UrqlProvider>
  );
};

const ThemeAware = ({ children }: { children: React.ReactNode }) => {
  const { resolvedTheme } = useTheme();

  return (
    <>
      <ConnectKitProvider
        mode="auto"
        theme="auto"
        customTheme={CONNECT_KIT_THEME}
        options={{
          hideNoWalletCTA: false,
          overlayBlur: 6,
          walletConnectCTA: "both",
          walletConnectName: "WalletConnect",
        }}
      >
        <MobileWalletConnectStatus />
        <WalletConnectDebugLogger />
        <TransactionNotificationProvider>
          {children}
        </TransactionNotificationProvider>
      </ConnectKitProvider>
      <ToastContainer
        style={{ zIndex: 1000 }}
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={resolvedTheme === "darkTheme" ? "dark" : "light"}
        transition={Bounce}
      />
    </>
  );
};

const WalletConnectDebugLogger = () => {
  const account = useAccount();
  const { chain } = useNetwork();
  const isWalletConnect =
    account.connector?.id === "walletConnect" ||
    account.connector?.id === "walletConnectLegacy";

  useEffect(() => {
    console.info("[walletconnect-debug] wagmi account/network state", {
      status: account.status,
      isConnected: account.isConnected,
      isConnecting: account.isConnecting,
      isReconnecting: account.isReconnecting,
      connector:
        account.connector ?
          {
            id: account.connector.id,
            name: account.connector.name,
            ready: account.connector.ready,
          }
        : undefined,
      address: account.address,
      chain:
        chain ?
          {
            id: chain.id,
            name: chain.name,
            unsupported: chain.unsupported,
          }
        : undefined,
    });
  }, [
    account.address,
    account.connector,
    account.isConnected,
    account.isConnecting,
    account.isReconnecting,
    account.status,
    chain,
  ]);

  useEffect(() => {
    if (!account.connector || !isWalletConnect) {
      return;
    }

    let cancelled = false;
    const cleanupListeners: Array<() => void> = [];

    account.connector
      .getProvider()
      .then(async (provider) => {
        if (cancelled) {
          return;
        }

        console.info("[walletconnect-debug] provider snapshot", {
          connector: {
            id: account.connector?.id,
            name: account.connector?.name,
          },
          snapshot: await getWalletConnectProviderSnapshot(provider),
        });

        const subscribe = (eventName: string) => {
          const handler = async (...args: unknown[]) => {
            console.info("[walletconnect-debug] provider event", {
              eventName,
              args,
              snapshot: await getWalletConnectProviderSnapshot(provider),
            });
          };

          provider.on?.(eventName, handler);
          cleanupListeners.push(() => {
            provider.removeListener?.(eventName, handler);
            provider.off?.(eventName, handler);
          });
        };

        [
          "connect",
          "disconnect",
          "accountsChanged",
          "chainChanged",
          "session_event",
          "session_update",
          "session_delete",
          "display_uri",
        ].forEach(subscribe);
      })
      .catch((error) => {
        if (!cancelled) {
          console.info("[walletconnect-debug] provider inspection failed", {
            connector: {
              id: account.connector?.id,
              name: account.connector?.name,
            },
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

    return () => {
      cancelled = true;
      cleanupListeners.forEach((cleanup) => cleanup());
    };
  }, [account.connector, isWalletConnect]);

  return null;
};

const MobileWalletConnectStatus = () => {
  const account = useAccount();
  const { open: connectModalOpen, setOpen: setConnectModalOpen } = useModal();
  const [walletChoice, setWalletChoice] =
    useState<WalletConnectDeepLinkChoice | null>(null);
  const [hasReturnedFromWallet, setHasReturnedFromWallet] = useState(false);

  useEffect(() => {
    if (!connectModalOpen || !isMobileBrowser()) {
      if (!account.isConnecting && !account.isReconnecting) {
        setWalletChoice(null);
        setHasReturnedFromWallet(false);
      }
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        const choice = getWalletConnectDeepLinkChoice();
        if (choice) {
          setWalletChoice(choice);
          setHasReturnedFromWallet(false);
        }
        return;
      }

      if (document.visibilityState === "visible") {
        const choice = getWalletConnectDeepLinkChoice();
        if (choice) {
          setWalletChoice(choice);
          setHasReturnedFromWallet(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    account.isConnecting,
    account.isReconnecting,
    connectModalOpen,
    setWalletChoice,
  ]);

  useEffect(() => {
    if (account.isConnected) {
      setWalletChoice(null);
      setHasReturnedFromWallet(false);
      setConnectModalOpen(false);
    }
  }, [account.isConnected, setConnectModalOpen]);

  useEffect(() => {
    if (
      connectModalOpen &&
      isMobileBrowser() &&
      (account.isConnecting || account.isReconnecting)
    ) {
      const choice = getWalletConnectDeepLinkChoice();
      if (choice) {
        setWalletChoice(choice);
      }
    }
  }, [account.isConnecting, account.isReconnecting, connectModalOpen]);

  const handleRetry = useCallback(() => {
    const choice = walletChoice ?? getWalletConnectDeepLinkChoice();
    if (!choice) {
      return;
    }
    setWalletChoice(choice);
    setHasReturnedFromWallet(false);
    window.open(choice.href, "_self");
  }, [walletChoice]);

  const handleChooseAnotherWallet = useCallback(() => {
    setWalletChoice(null);
    setHasReturnedFromWallet(false);
    setConnectModalOpen(true);
  }, [setConnectModalOpen]);

  const showConnectingStatus = Boolean(
    connectModalOpen &&
      walletChoice != null &&
      !account.isConnected &&
      isMobileBrowser() &&
      (hasReturnedFromWallet || account.isConnecting || account.isReconnecting),
  );

  if (!showConnectingStatus || walletChoice == null) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-neutral-content/50 px-4 backdrop-blur-sm dark:bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-wallet-connect-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-neutral-soft bg-neutral p-5 text-neutral-content shadow-2xl dark:border-neutral-soft-dark">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="loading loading-spinner loading-md text-primary" />
          <div className="flex flex-col gap-2">
            <h2
              id="mobile-wallet-connect-title"
              className="text-lg font-semibold"
            >
              Connecting wallet
            </h2>
            <p className="text-sm text-neutral-soft-content">
              Approve the connection in {walletChoice.label}, then return to
              Gardens.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <button
              type="button"
              className="w-full rounded-lg bg-primary-button px-4 py-2 text-sm font-medium text-neutral-inverted-content transition hover:bg-primary-hover-content dark:bg-primary-dark-base dark:hover:bg-primary-dark-hover"
              onClick={handleRetry}
            >
              Retry
            </button>
            <button
              type="button"
              className="w-full rounded-lg border border-neutral-soft px-4 py-2 text-sm font-medium text-neutral-content transition hover:border-primary-content hover:text-primary-content dark:border-white/15 dark:text-neutral-inverted-content"
              onClick={handleChooseAnotherWallet}
            >
              Choose another wallet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Providers;

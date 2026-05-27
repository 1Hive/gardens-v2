"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { AddrethConfig } from "addreth";
import { ConnectKitProvider, getDefaultConnectors } from "connectkit";
import { Bounce, ToastContainer } from "react-toastify";
import { Address, createWalletClient, custom, isAddress } from "viem";
import { base } from "viem/chains";
import {
  Chain,
  ConnectorAlreadyConnectedError,
  configureChains,
  createConfig,
  mainnet,
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
  const defaultConnectors = getDefaultConnectors({
    chains,
    walletConnectProjectId,
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
        connector.id === "walletConnect" ? walletConnectConnector : connector,
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

export default Providers;

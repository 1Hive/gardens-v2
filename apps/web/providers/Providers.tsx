"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import {
  connectorsForWallets,
  darkTheme as rainbowDarkTheme,
  lightTheme,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  frameWallet,
  injectedWallet,
  rabbyWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { AddrethConfig } from "addreth";
import { Bounce, ToastContainer } from "react-toastify";
import {
  Address,
  createWalletClient,
  custom,
  isAddress,
} from "viem";
import { base } from "viem/chains";
import {
  Chain,
  ConnectorAlreadyConnectedError,
  createConfig,
  mainnet,
  PublicClient,
  WagmiConfig,
} from "wagmi";
import { connect, disconnect } from "wagmi/actions";
import { MockConnector } from "wagmi/connectors/mock";
import ThemeProvider from "./ThemeProvider";
import { TransactionNotificationProvider } from "./TransactionNotificationProvider";
import { UrqlProvider } from "./UrqlProvider";
import { CHAINS } from "@/configs/chains";
import { QUERY_PARAMS } from "@/constants/query-params";
import {
  QueryParamsProvider,
  useCollectQueryParams,
} from "@/contexts/collectQueryParams.context";
import { PubSubProvider } from "@/contexts/pubsub.context";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useTheme } from "@/providers/ThemeProvider";
import { getEnvPublicClient } from "@/utils/publicClient";
import { logOnce } from "@/utils/log";

const dedupeChains = (chainList: Chain[]) =>
  chainList.filter(
    (candidate, index, arr) =>
      arr.findIndex((item) => item.id === candidate.id) === index,
  );

export const WALLETCONNECT_RESET_EVENT = "gardens:walletconnect-reset";
export const AUTOCONNECT_RESET_EVENT = "gardens:autoconnect-reset";
export const SKIP_AUTOCONNECT_STORAGE_KEY = "gardens:skip-autoconnect";

const getConfiguredChains = () => dedupeChains([...CHAINS, base, mainnet]);

const createCustomConfig = (
  skipAutoConnect: boolean,
  preferredSimulatedChain: Chain | undefined,
  simulatedWallet?: Address,
) => {
  const usedChains = getConfiguredChains();
  const chains = usedChains;
  const connectorFactory = connectorsForWallets([
    {
      groupName: "Recommended",
      wallets: [
        injectedWallet({ chains }),
        rabbyWallet({ chains }),
        frameWallet({ chains }),
        coinbaseWallet({ appName: "Gardens V2", chains }),
        walletConnectWallet({
          chains,
          projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_ID ?? "",
        }),
      ],
    },
  ]);

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

  const connectors = connectorFactory();
  const resolvedConnectors =
    simulatedConnector ? [simulatedConnector, ...connectors] : connectors;

  return {
    config: createConfig({
      autoConnect: !skipAutoConnect,
      connectors: resolvedConnectors,
      publicClient: ({ chainId }): PublicClient => getEnvPublicClient(chainId),
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

  const [wagmiConfig, setWagmiConfig] = useState<CustomWagmiConfig | null>(null);
  const [simulatedConnector, setSimulatedConnector] =
    useState<MockConnector | null>(null);
  const [activeSimulatedWallet, setActiveSimulatedWallet] =
    useState<Address | null>(null);
  const [walletConnectResetVersion, setWalletConnectResetVersion] = useState(0);
  const [skipAutoConnect, setSkipAutoConnect] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setSkipAutoConnect(
      window.localStorage.getItem(SKIP_AUTOCONNECT_STORAGE_KEY) === "true",
    );
  }, []);

  useEffect(() => {
    const handleWalletConnectReset = () => {
      setWalletConnectResetVersion((value) => value + 1);
    };
    const handleAutoConnectReset = () => {
      setSkipAutoConnect(
        window.localStorage.getItem(SKIP_AUTOCONNECT_STORAGE_KEY) === "true",
      );
    };

    window.addEventListener(WALLETCONNECT_RESET_EVENT, handleWalletConnectReset);
    window.addEventListener(AUTOCONNECT_RESET_EVENT, handleAutoConnectReset);

    return () => {
      window.removeEventListener(
        WALLETCONNECT_RESET_EVENT,
        handleWalletConnectReset,
      );
      window.removeEventListener(
        AUTOCONNECT_RESET_EVENT,
        handleAutoConnectReset,
      );
    };
  }, []);

  useEffect(() => {
    const { config, simulatedConnector: newSimulatedConnector } =
      createCustomConfig(
        skipAutoConnect,
        preferredSimulatedChain,
        simulatedWallet,
      );
    setWagmiConfig(config);
    setSimulatedConnector(newSimulatedConnector ?? null);
    setMounted(true);
  }, [
    simulatedWallet,
    preferredSimulatedChain,
    skipAutoConnect,
    walletConnectResetVersion,
  ]);

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

  const providerResetKey = `wagmi-${walletConnectResetVersion}`;

  return (
    <UrqlProvider>
      <WagmiConfig key={providerResetKey} config={wagmiConfig}>
        <AddrethConfig>
          <ThemeProvider>
            <ThemeAware chains={wagmiConfig.chains ?? []}>
              <PubSubProvider>{children}</PubSubProvider>
            </ThemeAware>
          </ThemeProvider>
        </AddrethConfig>
      </WagmiConfig>
    </UrqlProvider>
  );
};

const ThemeAware = ({
  chains,
  children,
}: {
  chains: Chain[];
  children: React.ReactNode;
}) => {
  const { resolvedTheme } = useTheme();
  const theme = useMemo(
    () =>
      (resolvedTheme === "darkTheme" ? rainbowDarkTheme : lightTheme)({
        accentColor: "var(--color-primary)",
        accentColorForeground: "var(--color-black)",
        borderRadius: "large",
        overlayBlur: "small",
      }),
    [resolvedTheme],
  );

  return (
    <>
      <RainbowKitProvider modalSize="compact" chains={chains} theme={theme}>
        <TransactionNotificationProvider>
          {children}
        </TransactionNotificationProvider>
      </RainbowKitProvider>
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

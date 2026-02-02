"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import "@rainbow-me/rainbowkit/styles.css";
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
import { Address, createWalletClient, custom, isAddress } from "viem";
import {
  Chain,
  configureChains,
  ConnectorAlreadyConnectedError,
  createConfig,
  mainnet,
  WagmiConfig,
} from "wagmi";
import { connect, disconnect } from "wagmi/actions";
import { MockConnector } from "wagmi/connectors/mock";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";
import ThemeProvider from "./ThemeProvider";
import { TransactionNotificationProvider } from "./TransactionNotificationProvider";
import { UrqlProvider } from "./UrqlProvider";
import { chainConfigMap, CHAINS } from "@/configs/chains";
import { isProd } from "@/configs/isProd";
import { QUERY_PARAMS } from "@/constants/query-params";
import {
  QueryParamsProvider,
  useCollectQueryParams,
} from "@/contexts/collectQueryParams.context";
import { PubSubProvider } from "@/contexts/pubsub.context";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useTheme } from "@/providers/ThemeProvider";
import { logOnce } from "@/utils/log";

const createCustomConfig = (
  chain: Chain | undefined,
  simulatedWallet?: Address,
) => {
  let usedChains: Chain[] = [];
  if (chain) {
    usedChains = [chain, mainnet];
  } else {
    const isClient = typeof window !== "undefined";
    const queryAllChains =
      isClient ?
        window.localStorage?.getItem("queryAllChains") === "true"
      : false;

    const usedChainIds = Object.entries(chainConfigMap)
      .filter(([_, chainConfig]) =>
        queryAllChains ? true
        : isProd ? !chainConfig.isTestnet
        : !!chainConfig.isTestnet,
      )
      .map(([chainId]) => Number(chainId));
    usedChains = [
      ...CHAINS.filter((elem) => usedChainIds.includes(elem.id)),
      mainnet,
    ];
  }

  const { publicClient, chains } = configureChains(usedChains, [
    publicProvider(),
    alchemyProvider({
      apiKey: process.env.NEXT_PUBLIC_ALCHEMY_KEY ?? "",
    }),
  ]);
  const baseConnectors = connectorsForWallets([
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
    const simulatedChain = chain ?? chains[0] ?? mainnet;
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

  const resolveConnectors = () => {
    const connectors = baseConnectors();
    return simulatedConnector ?
        [simulatedConnector, ...connectors]
      : connectors;
  };

  return {
    config: createConfig({
      autoConnect: true,
      connectors: resolveConnectors,
      publicClient,
    }),
    simulatedConnector,
  };
};

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

  const [wagmiConfig, setWagmiConfig] = useState<any>(null);
  const [simulatedConnector, setSimulatedConnector] =
    useState<MockConnector | null>(null);
  const [activeSimulatedWallet, setActiveSimulatedWallet] =
    useState<Address | null>(null);

  useEffect(() => {
    const { config, simulatedConnector: newSimulatedConnector } =
      createCustomConfig(chain, simulatedWallet);
    setWagmiConfig(config);
    setSimulatedConnector(newSimulatedConnector ?? null);
    setMounted(true);
  }, [chain, simulatedWallet]);

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

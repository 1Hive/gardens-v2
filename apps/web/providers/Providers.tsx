"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import {
  Chain,
  configureChains,
  createConfig,
  mainnet,
  WagmiConfig,
} from "wagmi";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";
import ThemeProvider from "./ThemeProvider";
import { UrqlProvider } from "./UrqlProvider";
import { chainConfigMap, CHAINS } from "@/configs/chains";
import { isProd } from "@/configs/isProd";
import { QueryParamsProvider } from "@/contexts/collectQueryParams.context";
import { PubSubProvider } from "@/contexts/pubsub.context";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useTheme } from "@/providers/ThemeProvider";

const createCustomConfig = (chain: Chain | undefined) => {
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
  const connectors = connectorsForWallets([
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

  return createConfig({
    autoConnect: true,
    connectors,
    publicClient,
  });
};

type Props = {
  children: React.ReactNode;
};

const Providers = ({ children }: Props) => {
  const [mounted, setMounted] = useState(false);
  const chain = useChainFromPath() as Chain | undefined;

  const [wagmiConfig, setWagmiConfig] = useState<any>(null);
  useEffect(() => {
    setWagmiConfig(createCustomConfig(chain));
    setMounted(true);
  }, [chain]);

  if (!mounted || !wagmiConfig) {
    return null;
  }
  return (
    <UrqlProvider>
      <WagmiConfig config={wagmiConfig}>
        <AddrethConfig>
          <ThemeProvider>
            <ThemeAware chains={wagmiConfig.chains ?? []}>
              <QueryParamsProvider>
                <PubSubProvider>{children}</PubSubProvider>
              </QueryParamsProvider>
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
        {children}
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

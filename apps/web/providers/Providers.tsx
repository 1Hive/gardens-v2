"use client";

import React, { useEffect, useState } from "react";
import "@rainbow-me/rainbowkit/styles.css";
import {
  connectorsForWallets,
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

const createCustomConfig = (chain: Chain | undefined) => {
  let usedChains: Chain[] = [];
  if (chain) {
    usedChains = [chain, mainnet];
  } else {
    const usedChainIds = Object.entries(chainConfigMap)
      .filter(([_, chainConfig]) =>
        isProd ? !chainConfig.isTestnet : !!chainConfig.isTestnet,
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

  const [wagmiConfig, setWagmiConfig] = useState(() =>
    createCustomConfig(chain),
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setWagmiConfig(createCustomConfig(chain));
  }, [chain]);

  if (!mounted || !wagmiConfig) {
    return null;
  }

  return (
    <UrqlProvider>
      <WagmiConfig config={wagmiConfig}>
        <AddrethConfig>
          <RainbowKitProvider
            modalSize="compact"
            chains={wagmiConfig.chains ?? []}
            theme={lightTheme({
              accentColor: "var(--color-primary)",
              accentColorForeground: "var(--color-black)",
              borderRadius: "large",
            })}
          >
            <ThemeProvider>
              <QueryParamsProvider>
                <PubSubProvider>{children}</PubSubProvider>
              </QueryParamsProvider>
            </ThemeProvider>
          </RainbowKitProvider>
        </AddrethConfig>
      </WagmiConfig>
    </UrqlProvider>
  );
};

export default Providers;

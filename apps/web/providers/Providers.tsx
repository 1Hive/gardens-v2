"use client";

import React, { useEffect, useState } from "react";
import "@rainbow-me/rainbowkit/styles.css";
import { AddrethConfig } from "addreth";
import { configureChains, createConfig, mainnet, WagmiConfig } from "wagmi";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";
import { chains } from "@/configs/chainServer";
import { PubSubProvider } from "@/contexts/pubsub.context";
import useChainFromPath from "@/hooks/useChainFromPath";
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
} from "@rainbow-me/rainbowkit/wallets";
import ThemeProvider from "./ThemeProvider";
import UrqlProvider from "./UrqlProvider";

type Props = {
  children: React.ReactNode;
};

const Providers = ({ children }: Props) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [wagmiConfig, setWagmiConfig] =
    useState<ReturnType<typeof createCustomConfig>>();
  const chain = useChainFromPath();

  const createCustomConfig = () => {
    const publicClient = configureChains(chain ? [chain] : [mainnet], [
      publicProvider(),
      alchemyProvider({
        apiKey: process.env.NEXT_PUBLIC_RPC_URL_ARB_TESTNET ?? "",
      }),
    ]).publicClient;
    const connectors = connectorsForWallets([
      {
        groupName: "Recommended",
        wallets: [
          injectedWallet({ chains }),
          rabbyWallet({ chains }),
          frameWallet({ chains }),
          coinbaseWallet({ appName: "Gardens V2", chains }),
        ],
      },
    ]);

    return createConfig({
      autoConnect: true,
      connectors,
      publicClient,
    });
  };

  useEffect(() => {
    setWagmiConfig(createCustomConfig());
  }, [chain]);

  return (
    // if mounted UrlqProvider will be rendered
    // if not, null will be rendered
    mounted &&
    wagmiConfig && (
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
                <PubSubProvider>{mounted && children}</PubSubProvider>
              </ThemeProvider>
            </RainbowKitProvider>
          </AddrethConfig>
        </WagmiConfig>
      </UrqlProvider>
    )
  );
};

export default Providers;

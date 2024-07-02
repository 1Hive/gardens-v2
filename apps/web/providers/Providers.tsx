"use client";
import React, { useEffect, useState } from "react";
import "@rainbow-me/rainbowkit/styles.css";
import ThemeProvider from "./ThemeProvider";
import {
  connectorsForWallets,
  RainbowKitProvider,
  lightTheme,
} from "@rainbow-me/rainbowkit";
import {
  rabbyWallet,
  frameWallet,
  injectedWallet,
  coinbaseWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import {
  chains,
  publicClient as wagmiPublicClient,
} from "@/configs/wagmiConfig";
import { AddrethConfig } from "addreth";
import UrqlProvider from "./UrqlProvider";
import { PubSubProvider } from "@/contexts/pubsub.context";
import { getChainIdFromPath } from "@/utils/path";
import { getChain } from "@/configs/chainServer";
import { publicProvider } from "wagmi/providers/public";
import { alchemyProvider } from "wagmi/providers/alchemy";

type Props = {
  children: React.ReactNode;
};

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

const Providers = ({ children }: Props) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [wagmiConfig, setWagmiConfig] =
    useState<ReturnType<typeof createConfig>>();

  useEffect(() => {
    const chainId = getChainIdFromPath();
    const chain = getChain(chainId);
    const publicClient = chain
      ? configureChains(
          [chain],
          [
            publicProvider(),
            alchemyProvider({
              apiKey: process.env.NEXT_PUBLIC_RPC_URL_ARB_TESTNET || "",
            }),
          ],
        ).publicClient
      : wagmiPublicClient;

      const wagmiConfig =  createConfig({
        autoConnect: true,
        connectors,
        publicClient,
      });

    setWagmiConfig(
      wagmiConfig
    );

  }, []);

  return (
    // if mounted UrlqProvider will be rendered
    // if not, null will be rendered
    mounted && (
      <UrqlProvider>
        <WagmiConfig config={wagmiConfig}>
          <AddrethConfig>
            <RainbowKitProvider
              modalSize="compact"
              chains={chains}
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

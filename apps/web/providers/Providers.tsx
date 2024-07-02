"use client";
import React from "react";
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
import { createConfig, WagmiConfig } from "wagmi";
import { chains, publicClient } from "@/configs/wagmiConfig";
import { AddrethConfig } from "addreth";
import UrqlProvider from "./UrqlProvider";
import { PubSubProvider } from "@/contexts/pubsub.context";

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

export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

const Providers = ({ children }: Props) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

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

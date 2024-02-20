"use client";
import React from "react";
import "@rainbow-me/rainbowkit/styles.css";
import ThemeProvider from "./ThemeProvider";
import {
  connectorsForWallets,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import {
  rabbyWallet,
  frameWallet,
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, WagmiConfig } from "wagmi";
import { chains, publicClient } from "@/configs/wagmiConfig";
import UrqlProvider from "./UrqlProvider";

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
          <RainbowKitProvider modalSize="compact" chains={chains}>
            <ThemeProvider>{mounted && children}</ThemeProvider>
          </RainbowKitProvider>
        </WagmiConfig>
      </UrqlProvider>
    )
  );
};

export default Providers;

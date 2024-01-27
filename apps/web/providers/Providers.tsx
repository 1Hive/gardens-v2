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
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import { arbitrum, localhost, arbitrumSepolia } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";

type Props = {
  children: React.ReactNode;
};
const { chains, publicClient } = configureChains(
  [arbitrum, arbitrumSepolia, localhost],
  [
    publicProvider(),
  ],
);

const connectors = connectorsForWallets([
  {
    groupName: "Recommended",
    wallets: [
      injectedWallet({ chains }),
      rabbyWallet({ chains }),
      frameWallet({ chains }),
    ],
  }
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
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider modalSize="compact" chains={chains}>
        <ThemeProvider>{mounted && children}</ThemeProvider>
      </RainbowKitProvider>
    </WagmiConfig>
  );
};

export default Providers;

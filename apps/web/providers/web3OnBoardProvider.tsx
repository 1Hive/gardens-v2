"use client"
import {
  Web3OnboardProvider as BlockNativeProvider,
  init,
} from "@web3-onboard/react";
import injectedModule from "@web3-onboard/injected-wallets";

const INFURA_KEY = "";
const ethereumRopsten = {
  id: "0x3",
  token: "rETH",
  label: "Ethereum Ropsten",
  rpcUrl: `https://ropsten.infura.io/v3/${INFURA_KEY}`,
};
const chains = [ethereumRopsten];
const wallets = [injectedModule()];
const web3Onboard = init({
  wallets,
  chains,
  appMetadata: {
    name: "Web3-Onboard Demo",
    icon: "<svg>App Icon</svg>",
    description: "A demo of Web3-Onboard.",
  },
});

export default function Web3OnboardProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BlockNativeProvider web3Onboard={web3Onboard}>
      {children}
    </BlockNativeProvider>
  );
}

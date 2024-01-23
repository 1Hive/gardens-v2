"use client";

import type { ReactNode } from "react";
import { createWeb3Modal } from "@web3modal/wagmi";
import {
  WagmiProvider,
  cookieStorage,
  createStorage,
  createConfig,
  http,
} from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { walletConnect, injected, coinbaseWallet } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { State } from "@wagmi/core";

// type WagmiProviderType = {
//   children: React.ReactNode;
// };

// 0. Setup queryClient
const queryClient = new QueryClient();

// 1. Get projectId at https://cloud.walletconnect.com
const projectId = "cc52770b49b75b8067dfa6149a52b103"; // change project id

const localChain = {
  id: 1337,
  name: "Localhost",
  network: "localhost",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
    public: { http: ["http://127.0.0.1:8545"] },
  },
  blockExplorers: {
    default: { name: "Etherscan", url: "https://etherscan.io" },
  },
  testnet: true,
};

// 2. Create wagmiConfig
const metadata = {
  name: "Web3Modal",
  description: "Web3Modal Example",
  url: "https://web3modal.com",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

const chains = [localChain, sepolia] as const;

export const wagmiConfig = createConfig({
  chains,
  transports: {
    [localChain.id]: http(),
    [sepolia.id]: http(),
  },
  connectors: [
    walletConnect({ projectId, metadata, showQrModal: false }),
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName: metadata.name,
      appLogoUrl: metadata.icons[0],
    }),
  ],
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});

const constChains = [localChain, sepolia];

createWeb3Modal({
  wagmiConfig,
  projectId,
  chains: constChains,
  themeMode: "light",
  themeVariables: {
    "--w3m-color-mix": "#8DE995",
    "--w3m-color-mix-strength": 20,
  },
});

export function Web3Modal({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: State;
}) {
  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider as Provider } from "wagmi";
import { wagmiConfig } from "@/configs/wagmiConfig";

const queryClient = new QueryClient();

// const projectId = "cc52770b49b75b8067dfa6149a52b103"; // change project id

// const localChain = {
//   id: 1337,
//   name: "Localhost",
//   network: "localhost",
//   nativeCurrency: {
//     name: "Ether",
//     symbol: "ETH",
//     decimals: 18,
//   },
//   rpcUrls: {
//     default: { http: ["http://127.0.0.1:8545"] },
//     public: { http: ["http://127.0.0.1:8545"] },
//   },
//   blockExplorers: {
//     default: { name: "Etherscan", url: "https://etherscan.io" },
//   },
//   testnet: true,
// };

// const { chains, publicClient } = configureChains(
//   isProd ? [arbitrumSepolia] : [localChain, arbitrumSepolia],
//   [
//     jsonRpcProvider({ rpc: (chain: any) => chain.rpcUrls.default }),
//     walletConnectProvider({ projectId }),
//     publicProvider(),
//   ],
// );

// const metadata = {
//   name: "Web3Modal",
//   description: "Web3Modal Example",
//   url: "https://web3modal.com",
//   icons: ["https://avatars.githubusercontent.com/u/37784886"],
// };

// const wagmiConfig = createConfig({
//   autoConnect: true,
//   connectors: [
//     new WalletConnectConnector({
//       chains,
//       options: { projectId, showQrModal: false, metadata },
//     }),
//     new EIP6963Connector({ chains }),
//     new InjectedConnector({ chains, options: { shimDisconnect: true } }),
//     new CoinbaseWalletConnector({
//       chains,
//       options: { appName: metadata.name },
//     }),
//   ],
//   publicClient,
// });

// createWeb3Modal({
//   wagmiConfig,
//   projectId,
//   chains,
//   themeMode: "light",
//   themeVariables: {
//     "--w3m-color-mix": "#8DE995",
//     "--w3m-color-mix-strength": 20,
//   },
// });

const WagmiProvider = ({ children }: {children: React.ReactNode}) => {
  return (
    <Provider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );
};

export default WagmiProvider;

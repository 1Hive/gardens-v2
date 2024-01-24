import { http, createConfig, cookieStorage, createStorage } from "wagmi";
import { sepolia } from "wagmi/chains";

export const localChain = {
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

export const wagmiConfig = createConfig({
  chains: [localChain, sepolia],
  ssr: true,
  storage: createStorage({
  storage: cookieStorage,
  }),
  transports: {
    [localChain.id]: http(),
    [sepolia.id]: http(),
  },
});

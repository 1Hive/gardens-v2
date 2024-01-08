import { defineConfig } from "@wagmi/cli";
import { react, foundry } from "@wagmi/cli/plugins";
// import {  erc20Abi } from 'viem'
import { abi as CVStrategyABI } from "#/contracts/out/CVStrategy.sol/CVStrategy.json";
import { abi as RegistryFactoryABI } from "#/contracts/out/RegistryFactory.sol/RegistryFactory.json";
import { abi as RegistryGardensABI } from "#/contracts/out/RegistryGardens.sol/RegistryGardens.json";

import { mainnet, sepolia } from "wagmi/chains";
import { Abi } from "viem";

export default defineConfig({
  out: "src/generated.ts",
  plugins: [
    // etherscan({
    //   apiKey: process.env.ETHERSCAN_API_KEY!,
    //   chainId: mainnet.id,
    //   contracts: [
    //     // {
    //     //   name: 'EnsRegistry',
    //     //   address: {
    //     //     [mainnet.id]: '0x314159265dd8dbb310642f98f50c066173c1259b',
    //     //     [sepolia.id]: '0x112234455c3a32fd11230c42e7bccd4a84e02010',
    //     //   },
    //     // },
    //   ],
    // }),
    foundry({
      project: "../../",
      include: ["CVStrategy.sol", "RegistryFactory.sol", "RegistryGardens.sol"],
    }),
    react(),
  ],
});

import { defineConfig } from "@wagmi/cli";
import { react, foundry } from "@wagmi/cli/plugins";
import { abi as CVStrategyABI } from "#/contracts/out/CVStrategy.sol/CVStrategy.json";
import { abi as RegistryFactoryABI } from "#/contracts/out/RegistryFactory.sol/RegistryFactory.json";
import { abi as RegistryCommunityABI } from "#/contracts/out/RegistryCommunity.sol/RegistryCommunity.json";
import { abi as AlloABI } from "#/contracts/out/Allo.sol/Allo.json";

import { Abi } from "viem";

export default defineConfig({
  out: "src/generated.ts",
  contracts: [
    {
      name: "CVStrategy",
      abi: CVStrategyABI as Abi,
    },
    {
      name: "RegistryFactory",
      abi: RegistryFactoryABI as Abi,
    },
    {
      name: "RegistryCommunity",
      abi: RegistryCommunityABI as Abi,
    },
    {
      name: "Allo",
      abi: AlloABI as Abi,
    },
  ],
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
    // foundry({
    //   project: "../../",
    //   include: [
    //     "CVStrategy.sol",
    //     "RegistryFactory.sol",
    //     "RegistryGardens.sol",
    //     "Allo.sol",
    //   ],
    // }),
    // react(),
  ],
});

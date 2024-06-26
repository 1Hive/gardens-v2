import { defineConfig } from "@wagmi/cli";
import { react, foundry, actions } from "@wagmi/cli/plugins";
import { abi as CVStrategyABI } from "#/contracts/out/CVStrategy.sol/CVStrategy.json";
import { abi as registryFactoryABI } from "#/contracts/out/RegistryFactory.sol/RegistryFactory.json";
import { abi as registryCommunityABI } from "#/contracts/out/RegistryCommunity.sol/RegistryCommunity.json";
import { abi as mockERC20ABI } from "#/contracts/out/utils/MockERC20.sol/MockERC20.json";
import { abi as SafeABI } from "#/contracts/out/ISafe.sol/ISafe.json";
import { abi as alloABI } from "#/contracts/out/Allo.sol/Allo.json";
import { abi as PassportScorerABI } from "#/contracts/out/PassportScorer.sol/PassportScorer.json";
import { Abi } from "viem";

export default defineConfig({
  out: "src/generated.ts",
  contracts: [
    {
      name: "ERC20",
      abi: mockERC20ABI as Abi,
    },
    {
      name: "CVStrategy",
      abi: CVStrategyABI as Abi,
    },
    {
      name: "RegistryFactory",
      abi: registryFactoryABI as Abi,
    },
    {
      name: "RegistryCommunity",
      abi: registryCommunityABI as Abi,
    },
    {
      name: "Allo",
      abi: alloABI as Abi,
    },
    {
      name: "Safe",
      abi: SafeABI as Abi,
    },
    {
      name: "PassportScorer",
      abi: PassportScorerABI as Abi,
    },
  ],
  plugins: [
    actions({
      watchContractEvent: false,
      readContract: true,
      writeContract: true,
      prepareWriteContract: true,
      getContract: true,
    }),
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

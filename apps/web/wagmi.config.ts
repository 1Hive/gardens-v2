import { defineConfig } from "@wagmi/cli";
import { actions } from "@wagmi/cli/plugins";
import { Abi } from "viem";
import { abi as alloABI } from "#/contracts/abis/Allo.sol/Allo.json";
// Use aggregated diamond ABIs that include all facet functions
import { abi as CVStrategyABI } from "#/contracts/abis/DiamondAggregated/CVStrategy.json";
import { abi as registryComityABI } from "#/contracts/abis/DiamondAggregated/RegistryCommunity.json";
import { abi as GoodDollarABI } from "#/contracts/abis/GoodDollarSybil.sol/GoodDollarSybil.json";
import { abi as ArbitratorAbi } from "#/contracts/abis/IArbitrator.sol/IArbitrator.json";
import { abi as mockERC20ABI } from "#/contracts/abis/MockERC20.sol/MockERC20.json";
import { abi as PassportScorerABI } from "#/contracts/abis/PassportScorer.sol/PassportScorer.json";
// Use aggregated diamond ABIs that include all facet functions
import { abi as registryFactoryABI } from "#/contracts/abis/RegistryFactory.sol/RegistryFactory.json";
import { abi as SafeArbitrator } from "#/contracts/abis/SafeArbitrator.sol/SafeArbitrator.json";

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
      abi: registryComityABI as Abi,
    },
    {
      name: "Allo",
      abi: alloABI as Abi,
    },
    {
      name: "PassportScorer",
      abi: PassportScorerABI as Abi,
    },
    {
      name: "IArbitrator",
      abi: ArbitratorAbi as Abi,
    },
    {
      name: "SafeArbitrator",
      abi: SafeArbitrator as Abi,
    },
    {
      name: "GoodDollar",
      abi: GoodDollarABI as Abi,
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

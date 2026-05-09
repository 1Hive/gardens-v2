import { testWithSynpress } from "@synthetixio/synpress";
import {
  Address,
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseAbi,
  zeroAddress,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import basicSetup from "../wallet-setup/basic.setup";
import { getConfig, metaMaskFixtures } from "./utils";

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test.setTimeout(240000);

const cvStrategyAbi = parseAbi([
  "function cvParams() view returns (uint256 maxRatio,uint256 weight,uint256 decay,uint256 minThresholdPoints)",
  "function getArbitrableConfig() view returns (address arbitrator,address tribunalSafe,uint256 submitterCollateralAmount,uint256 challengerCollateralAmount,uint256 defaultRuling,uint256 defaultRulingTimeout)",
  "function setPoolParams((address arbitrator,address tribunalSafe,uint256 submitterCollateralAmount,uint256 challengerCollateralAmount,uint256 defaultRuling,uint256 defaultRulingTimeout) arbitrableConfig,(uint256 maxRatio,uint256 weight,uint256 decay,uint256 minThresholdPoints) cvParams,uint256 sybilScoreThreshold,address[] membersToAdd,address[] membersToRemove,address superfluidToken)",
  "function superfluidToken() view returns (address)",
]);

function createChain(chainId: string, rpcUrl: string) {
  const id = Number(chainId);
  if (!Number.isFinite(id)) {
    throw new Error(`Invalid chain id: ${chainId}`);
  }

  return defineChain({
    id,
    name: "E2E Chain",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: [rpcUrl] },
      public: { http: [rpcUrl] },
    },
  });
}

async function fetchLatestEnabledStrategy(graphUrl: string, communityId: string) {
  return fetch(graphUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `{
        cvstrategies(
          first: 1
          orderBy: poolId
          orderDirection: desc
          where: {isEnabled: true, archived: false, registryCommunity: "${communityId.toLowerCase()}"}
        ) {
          id
        }
      }`,
    }),
  }).then((r) => r.json());
}

test("should edit a pool", async () => {
  const { chainId, communityId, subgraphUrl, rpcUrl, walletSeedPhrase } =
    getConfig();
  const chain = createChain(chainId, rpcUrl);
  const account = mnemonicToAccount(walletSeedPhrase);
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  let strategyAddress: Address | undefined;
  await expect
    .poll(
      async () => {
        const response = await fetchLatestEnabledStrategy(
          subgraphUrl,
          communityId,
        );
        strategyAddress = response.data?.cvstrategies?.[0]?.id;
        return strategyAddress;
      },
      {
        timeout: 180000,
        intervals: [1000, 2000, 3000, 5000],
      },
    )
    .not.toBeUndefined();

  if (!strategyAddress) {
    throw new Error("No enabled strategy found to edit");
  }
  const resolvedStrategyAddress = strategyAddress;

  const [arbitrableConfig, cvParams, superfluidToken] = await Promise.all([
    publicClient.readContract({
      address: resolvedStrategyAddress,
      abi: cvStrategyAbi,
      functionName: "getArbitrableConfig",
    }),
    publicClient.readContract({
      address: resolvedStrategyAddress,
      abi: cvStrategyAbi,
      functionName: "cvParams",
    }),
    publicClient
      .readContract({
        address: resolvedStrategyAddress,
        abi: cvStrategyAbi,
        functionName: "superfluidToken",
      })
      .catch(() => zeroAddress),
  ]);
  const editHash = await walletClient.writeContract({
    address: resolvedStrategyAddress,
    abi: cvStrategyAbi,
    functionName: "setPoolParams",
    args: [
      {
        arbitrator: arbitrableConfig[0],
        tribunalSafe: arbitrableConfig[1],
        submitterCollateralAmount: arbitrableConfig[2],
        challengerCollateralAmount: arbitrableConfig[3],
        defaultRuling: arbitrableConfig[4],
        defaultRulingTimeout: arbitrableConfig[5],
      },
      {
        maxRatio: cvParams[0],
        weight: cvParams[1],
        decay: cvParams[2],
        minThresholdPoints: cvParams[3],
      },
      0n,
      [],
      [],
      superfluidToken,
    ],
  });
  const editReceipt = await publicClient.waitForTransactionReceipt({
    hash: editHash,
    confirmations: 1,
    timeout: 180000,
  });
  expect(editReceipt.status).toBe("success");

  await expect
    .poll(
      async () => {
        const updatedParams = await publicClient.readContract({
          address: resolvedStrategyAddress,
          abi: cvStrategyAbi,
          functionName: "cvParams",
        });
        return updatedParams[3];
      },
      {
        timeout: 180000,
        intervals: [1000, 2000, 3000, 5000],
      },
    )
    .toBe(cvParams[3]);
});

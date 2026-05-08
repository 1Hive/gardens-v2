import { testWithSynpress } from "@synthetixio/synpress";
import {
  Address,
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseAbi,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import basicSetup from "../wallet-setup/basic.setup";
import { getConfig, metaMaskFixtures } from "./utils";

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test.setTimeout(240000);

const registryCommunityAbi = parseAbi([
  "function addStrategyByPoolId(uint256 poolId)",
  "function enabledStrategies(address strategy) view returns (bool)",
]);

type Strategy = {
  id: Address;
  poolId: string;
  isEnabled: boolean;
  archived: boolean;
};

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

async function fetchLatestUnarchivedStrategy({
  graphUrl,
  communityId,
}: {
  graphUrl: string;
  communityId: string;
}) {
  const response = await fetch(graphUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `{
        cvstrategies(
          first: 1
          orderBy: poolId
          orderDirection: desc
          where: {archived: false, registryCommunity: "${communityId.toLowerCase()}"}
        ) {
          id
          poolId
          isEnabled
          archived
        }
      }`,
    }),
  }).then((r) => r.json());

  return response.data?.cvstrategies?.[0] as Strategy | undefined;
}

async function waitForStrategyEnabledOnChain({
  publicClient,
  communityId,
  strategyAddress,
}: {
  publicClient: ReturnType<typeof createPublicClient>;
  communityId: Address;
  strategyAddress: Address;
}) {
  await expect
    .poll(
      async () => {
        return publicClient.readContract({
          address: communityId,
          abi: registryCommunityAbi,
          functionName: "enabledStrategies",
          args: [strategyAddress],
        });
      },
      {
        timeout: 180000,
        intervals: [1000, 2000, 3000, 5000],
      },
    )
    .toBe(true);
}

async function waitForStrategyEnabledInSubgraph({
  graphUrl,
  communityId,
  strategyAddress,
}: {
  graphUrl: string;
  communityId: string;
  strategyAddress: Address;
}) {
  await expect
    .poll(
      async () => {
        const latestStrategy = await fetchLatestUnarchivedStrategy({
          graphUrl,
          communityId,
        });

        return (
          latestStrategy?.id.toLowerCase() === strategyAddress.toLowerCase() &&
          latestStrategy.isEnabled === true &&
          latestStrategy.archived === false
        );
      },
      {
        timeout: 240000,
        intervals: [1000, 2000, 3000, 5000],
      },
    )
    .toBe(true);
}

test("should approve a pool as council safe", async () => {
  const { chainId, communityId, rpcUrl, subgraphUrl, walletSeedPhrase } =
    getConfig();
  const chain = createChain(chainId, rpcUrl);
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    account: mnemonicToAccount(walletSeedPhrase),
    chain,
    transport: http(rpcUrl),
  });

  const latestStrategy = await fetchLatestUnarchivedStrategy({
    graphUrl: subgraphUrl,
    communityId,
  });

  if (!latestStrategy) {
    throw new Error("No unarchived pool found to approve");
  }

  if (!latestStrategy.isEnabled) {
    const hash = await walletClient.writeContract({
      address: communityId,
      abi: registryCommunityAbi,
      functionName: "addStrategyByPoolId",
      args: [BigInt(latestStrategy.poolId)],
    });

    await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
      timeout: 180000,
    });
  }

  await waitForStrategyEnabledOnChain({
    publicClient,
    communityId,
    strategyAddress: latestStrategy.id,
  });
  await waitForStrategyEnabledInSubgraph({
    graphUrl: subgraphUrl,
    communityId,
    strategyAddress: latestStrategy.id,
  });
});

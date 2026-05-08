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

const cvStrategyAbi = parseAbi(["function activatePoints()"]);
const registryCommunityAbi = parseAbi([
  "function memberPowerInStrategy(address member, address strategy) view returns (uint256)",
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

test("should activate governance in the pool", async () => {
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

  const subgraphRes = await fetch(subgraphUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `{ cvstrategies(first: 1, orderBy: poolId, orderDirection: desc, where: { isEnabled: true, archived: false, registryCommunity: "${communityId.toLowerCase()}" }) { id poolId } }`,
    }),
  }).then((r) => r.json());
  const strategyAddress = subgraphRes.data.cvstrategies[0]?.id as
    | Address
    | undefined;
  if (!strategyAddress) {
    throw new Error("No enabled unarchived strategy found");
  }

  const currentPower = await publicClient.readContract({
    address: communityId,
    abi: registryCommunityAbi,
    functionName: "memberPowerInStrategy",
    args: [account.address, strategyAddress],
  });
  if (currentPower > 0n) {
    return;
  }

  const activateHash = await walletClient.writeContract({
    address: strategyAddress,
    abi: cvStrategyAbi,
    functionName: "activatePoints",
  });
  const activateReceipt = await publicClient.waitForTransactionReceipt({
    hash: activateHash,
    confirmations: 1,
    timeout: 180000,
  });
  expect(activateReceipt.status).toBe("success");

  await expect
    .poll(
      async () => {
        return publicClient.readContract({
          address: communityId,
          abi: registryCommunityAbi,
          functionName: "memberPowerInStrategy",
          args: [account.address, strategyAddress],
        });
      },
      {
        timeout: 180000,
        intervals: [1000, 2000, 3000, 5000],
      },
    )
    .toBeGreaterThan(0n);
});

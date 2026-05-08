import { testWithSynpress } from "@synthetixio/synpress";
import {
  Address,
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  maxUint256,
  parseAbi,
  parseUnits,
  zeroAddress,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import basicSetup from "../wallet-setup/basic.setup";
import { getConfig, metaMaskFixtures } from "./utils";

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test.setTimeout(240000);

const CV_SCALE_PRECISION = 10 ** 7;
const ETH_DECIMALS = 18;
const DEFAULT_RULING_TIMEOUT_SEC = 300n;
const E2E_POOL_METADATA_HASH = "QmPjXaoDhSx4mMFCADow9Kea3NMcd44PNCqr8hFpsCpi6f";

const chainCreatePoolConfig: Record<
  string,
  { arbitrator: Address; globalTribunal: Address; blockTime: number }
> = {
  "421614": {
    arbitrator: "0x49222C53695C77a0F8b78Eb42606B893E98DfE6a",
    globalTribunal: "0xb05A948B5c1b057B88D381bDe3A375EfEA87EbAD",
    blockTime: 12,
  },
  "11155420": {
    arbitrator: "0xCcbAc15Eb0D8C241D4b6A74E650dE089c292D131",
    globalTribunal: "0xb05A948B5c1b057B88D381bDe3A375EfEA87EbAD",
    blockTime: 2,
  },
  "11155111": {
    arbitrator: "0x3678d8f5d4f04cb033b8ab4d85df384d0df9cb08",
    globalTribunal: "0xb05A948B5c1b057B88D381bDe3A375EfEA87EbAD",
    blockTime: 12,
  },
};

const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);
const registryCommunityAbi = parseAbi([
  "function createPool(address _token, ((uint256 maxRatio,uint256 weight,uint256 decay,uint256 minThresholdPoints) cvParams,uint8 proposalType,uint8 pointSystem,(uint256 maxAmount) pointConfig,(address arbitrator,address tribunalSafe,uint256 submitterCollateralAmount,uint256 challengerCollateralAmount,uint256 defaultRuling,uint256 defaultRulingTimeout) arbitrableConfig,address registryCommunity,address votingPowerRegistry,address sybilScorer,uint256 sybilScorerThreshold,address[] initialAllowlist,address superfluidToken,uint256 streamingRatePerSecond) _params, (uint256 protocol,string pointer) _metadata) returns (uint256 poolId,address strategy)",
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

function calculateDecay(blockTime: number, convictionGrowth: number) {
  const halfLifeInSeconds = convictionGrowth * 24 * 60 * 60;
  return Math.floor(
    Math.pow(10, 7) * Math.pow(1 / 2, blockTime / halfLifeInSeconds),
  );
}

function calculateMaxRatioNum(
  spendingLimit: number,
  minimumConviction: number,
) {
  return spendingLimit / (1 - Math.sqrt(minimumConviction));
}

async function fetchLatestStrategy(graphUrl: string, communityId: string) {
  return fetch(graphUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `{
        cvstrategies(
          first: 1
          orderBy: poolId
          orderDirection: desc
          where: {registryCommunity: "${communityId.toLowerCase()}"}
        ) {
          id
          poolId
          archived
        }
      }`,
    }),
  }).then((r) => r.json());
}

async function waitForNewPoolIndexed({
  graphUrl,
  communityId,
  previousPoolId,
}: {
  graphUrl: string;
  communityId: string;
  previousPoolId: number;
}) {
  await expect
    .poll(
      async () => {
        const response = await fetchLatestStrategy(graphUrl, communityId);
        return Number(response.data?.cvstrategies?.[0]?.poolId ?? 0);
      },
      {
        timeout: 180000,
        intervals: [1000, 2000, 3000, 5000],
        message: `new pool indexed after pool ${previousPoolId}`,
      },
    )
    .toBeGreaterThan(previousPoolId);
}

test("should create a pool in the community", async () => {
  const {
    chainId,
    communityId,
    governanceToken,
    rpcUrl,
    subgraphUrl,
    walletSeedPhrase,
  } = getConfig();
  const createPoolConfig = chainCreatePoolConfig[chainId];
  if (!createPoolConfig) {
    throw new Error(`Missing create-pool config for chain ${chainId}`);
  }

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

  const initialSubgraphRes = await fetchLatestStrategy(
    subgraphUrl,
    communityId,
  );
  const previousPoolId = Number(
    initialSubgraphRes.data?.cvstrategies?.[0]?.poolId ?? 0,
  );

  const allowance = await publicClient.readContract({
    address: governanceToken,
    abi: erc20Abi,
    functionName: "allowance",
    args: [account.address, communityId],
  });

  if (allowance === 0n) {
    const approveHash = await walletClient.writeContract({
      address: governanceToken,
      abi: erc20Abi,
      functionName: "approve",
      args: [communityId, maxUint256],
    });
    await publicClient.waitForTransactionReceipt({
      hash: approveHash,
      confirmations: 1,
      timeout: 180000,
    });
  }

  const tokenDecimals = Number(
    await publicClient.readContract({
      address: governanceToken,
      abi: erc20Abi,
      functionName: "decimals",
    }),
  );
  const spendingLimit = 0.25;
  const minimumConviction = 0.1;
  const maxRatioNum = calculateMaxRatioNum(spendingLimit, minimumConviction);
  const weightNum = minimumConviction * maxRatioNum ** 2;
  const poolHash = await walletClient.writeContract({
    address: communityId,
    abi: registryCommunityAbi,
    functionName: "createPool",
    args: [
      governanceToken,
      {
        cvParams: {
          maxRatio: BigInt(Math.round(maxRatioNum * CV_SCALE_PRECISION)),
          weight: BigInt(Math.round(weightNum * CV_SCALE_PRECISION)),
          decay: BigInt(calculateDecay(createPoolConfig.blockTime, 10)),
          minThresholdPoints: 0n,
        },
        proposalType: 1,
        pointSystem: 0,
        pointConfig: {
          maxAmount: parseUnits("0", tokenDecimals),
        },
        arbitrableConfig: {
          arbitrator: createPoolConfig.arbitrator,
          tribunalSafe: createPoolConfig.globalTribunal,
          submitterCollateralAmount: parseUnits("0.0000000001", ETH_DECIMALS),
          challengerCollateralAmount: parseUnits("0.0000000001", ETH_DECIMALS),
          defaultRuling: 1n,
          defaultRulingTimeout: DEFAULT_RULING_TIMEOUT_SEC,
        },
        registryCommunity: communityId,
        votingPowerRegistry: zeroAddress,
        sybilScorer: zeroAddress,
        sybilScorerThreshold: 0n,
        initialAllowlist: [zeroAddress],
        superfluidToken: zeroAddress,
        streamingRatePerSecond: 0n,
      },
      {
        protocol: 1n,
        pointer: E2E_POOL_METADATA_HASH,
      },
    ],
  });

  await publicClient.waitForTransactionReceipt({
    hash: poolHash,
    confirmations: 1,
    timeout: 180000,
  });

  await waitForNewPoolIndexed({
    graphUrl: subgraphUrl,
    communityId,
    previousPoolId,
  });
});

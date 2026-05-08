import { testWithSynpress } from "@synthetixio/synpress";
import {
  Address,
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeAbiParameters,
  http,
  parseAbi,
  parseAbiParameters,
  parseUnits,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import basicSetup from "../wallet-setup/basic.setup";
import { getConfig, metaMaskFixtures } from "./utils";
import { proposalTestConfig } from "./proposal-test-config";

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test.setTimeout(240000);

const PROPOSAL_METADATA_HASH = "QmPjXaoDhSx4mMFCADow9Kea3NMcd44PNCqr8hFpsCpi6f";

const erc20Abi = parseAbi(["function decimals() view returns (uint8)"]);
const alloAbi = parseAbi([
  "function registerRecipient(uint256 _poolId, bytes _data) payable returns (address)",
]);
const cvStrategyAbi = parseAbi(["function cancelProposal(uint256 proposalId)"]);

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

async function fetchLatestEnabledStrategyWithProposals(
  graphUrl: string,
  communityId: string,
) {
  return fetch(graphUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `{
        cvstrategies(
          first: 1,
          orderBy: poolId,
          orderDirection: desc,
          where: { isEnabled: true, archived: false, registryCommunity: "${communityId.toLowerCase()}" }
        ) {
          id
          poolId
          token
          proposals(first: 20, orderBy: proposalNumber, orderDirection: desc) {
            proposalNumber
            proposalStatus
          }
        }
      }`,
    }),
  }).then((r) => r.json());
}

async function fetchAlloAddress(graphUrl: string, chainId: string) {
  const response = await fetch(graphUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `{
        allos(first: 1000) {
          id
          chainId
        }
      }`,
    }),
  }).then((r) => r.json());

  const alloAddress = response.data?.allos?.find(
    (allo: { chainId: string }) => allo.chainId === chainId,
  )?.id as Address | undefined;
  if (!alloAddress) {
    throw new Error(`Unable to resolve Allo address for chain ${chainId}`);
  }

  return alloAddress;
}

test("should cancel a proposal", async () => {
  const { chainId, communityId, rpcUrl, subgraphUrl, walletSeedPhrase } =
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

  let subgraphRes = await fetchLatestEnabledStrategyWithProposals(
    subgraphUrl,
    communityId,
  );
  const { id: strategyAddress, poolId, token, proposals } =
    subgraphRes.data.cvstrategies[0] as {
      id: Address;
      poolId: string;
      token: Address;
      proposals: { proposalNumber: string; proposalStatus: string }[];
    };
  const highestKnownProposalNumber = proposals.reduce(
    (max: number, item: { proposalNumber: string }) =>
      Math.max(max, Number(item.proposalNumber)),
    0,
  );
  const alloAddress = await fetchAlloAddress(subgraphUrl, chainId);
  const tokenDecimals = Number(
    await publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "decimals",
    }),
  );
  const encodedData = encodeAbiParameters(
    parseAbiParameters(
      "(uint256 poolId,address beneficiaryAddress,uint256 requestedAmount,address requestedTokenAddress,(uint256 pointer,string ipfsHash) metadata)",
    ),
    [
      {
        poolId: BigInt(poolId),
        beneficiaryAddress: account.address,
        requestedAmount: parseUnits(
          proposalTestConfig.requestedAmount,
          tokenDecimals,
        ),
        requestedTokenAddress: token,
        metadata: {
          pointer: 1n,
          ipfsHash: PROPOSAL_METADATA_HASH,
        },
      },
    ],
  );
  const createHash = await walletClient.writeContract({
    address: alloAddress,
    abi: alloAbi,
    functionName: "registerRecipient",
    args: [BigInt(poolId), encodedData],
    value: parseUnits("0.0000000001", 18),
  });
  const createReceipt = await publicClient.waitForTransactionReceipt({
    hash: createHash,
    confirmations: 1,
    timeout: 180000,
  });
  expect(createReceipt.status).toBe("success");

  let createdProposalNumber = 0;
  await expect
    .poll(
      async () => {
        subgraphRes = await fetchLatestEnabledStrategyWithProposals(
          subgraphUrl,
          communityId,
        );
        const latestProposal =
          subgraphRes.data?.cvstrategies?.[0]?.proposals?.[0];
        createdProposalNumber = Number(latestProposal?.proposalNumber ?? 0);
        return createdProposalNumber;
      },
      {
        timeout: 180000,
        intervals: [1000, 2000, 3000, 5000],
      },
    )
    .toBeGreaterThan(highestKnownProposalNumber);

  const cancelHash = await walletClient.writeContract({
    address: strategyAddress,
    abi: cvStrategyAbi,
    functionName: "cancelProposal",
    args: [BigInt(createdProposalNumber)],
  });
  const cancelReceipt = await publicClient.waitForTransactionReceipt({
    hash: cancelHash,
    confirmations: 1,
    timeout: 180000,
  });
  expect(cancelReceipt.status).toBe("success");
});

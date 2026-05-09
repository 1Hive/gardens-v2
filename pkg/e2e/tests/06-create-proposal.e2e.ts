import { testWithSynpress } from "@synthetixio/synpress";
import {
  Address,
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  http,
  parseAbi,
  parseAbiParameters,
  parseUnits,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import basicSetup from "../wallet-setup/basic.setup";
import {
  createE2EChain,
  fetchAlloAddress,
  getConfig,
  metaMaskFixtures,
} from "./utils";
import { proposalTestConfig } from "./proposal-test-config";

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test.setTimeout(240000);

const PROPOSAL_METADATA_HASH = "QmPjXaoDhSx4mMFCADow9Kea3NMcd44PNCqr8hFpsCpi6f";

const erc20Abi = parseAbi(["function decimals() view returns (uint8)"]);
const alloAbi = parseAbi([
  "function registerRecipient(uint256 _poolId, bytes _data) payable returns (address)",
]);

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
          first: 1
          orderBy: poolId
          orderDirection: desc
          where: { isEnabled: true, archived: false, registryCommunity: "${communityId.toLowerCase()}" }
        ) {
          id
          poolId
          token
          proposals(first: 20, orderBy: proposalNumber, orderDirection: desc) {
            proposalNumber
          }
        }
      }`,
    }),
  }).then((r) => r.json());
}

test("should create a proposal in the pool", async () => {
  const { chainId, communityId, rpcUrl, subgraphUrl, walletSeedPhrase } =
    getConfig();
  const chain = createE2EChain();
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
  const { poolId, token, proposals } = subgraphRes.data.cvstrategies[0] as {
    poolId: string;
    token: Address;
    proposals: { proposalNumber: string }[];
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
  const hash = await walletClient.writeContract({
    address: alloAddress,
    abi: alloAbi,
    functionName: "registerRecipient",
    args: [BigInt(poolId), encodedData],
    value: parseUnits("0.0000000001", 18),
  });

  await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 1,
    timeout: 180000,
  });

  await expect
    .poll(
      async () => {
        subgraphRes = await fetchLatestEnabledStrategyWithProposals(
          subgraphUrl,
          communityId,
        );
        const latestProposal =
          subgraphRes.data?.cvstrategies?.[0]?.proposals?.[0];
        return Number(latestProposal?.proposalNumber ?? 0);
      },
      {
        timeout: 180000,
        intervals: [1000, 2000, 3000, 5000],
      },
    )
    .toBeGreaterThan(highestKnownProposalNumber);
});

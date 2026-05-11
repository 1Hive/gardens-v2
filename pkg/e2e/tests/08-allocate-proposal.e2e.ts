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

test.setTimeout(300000);

type E2EPublicClient = ReturnType<typeof createPublicClient>;
const alloAbi = parseAbi(["function allocate(uint256 _poolId, bytes _data)"]);
const cvStrategyAbi = parseAbi([
  "function getProposalVoterStake(uint256,address) view returns (uint256)",
]);
const registryCommunityAbi = parseAbi([
  "function memberPowerInStrategy(address member, address strategy) view returns (uint256)",
]);

async function fetchLatestEnabledStrategyWithProposal({
  graphUrl,
  communityId,
}: {
  graphUrl: string;
  communityId: string;
}) {
  return fetch(graphUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `{
        cvstrategies(
          first: 5
          orderBy: poolId
          orderDirection: desc
          where: {isEnabled: true, archived: false, registryCommunity:"${communityId.toLowerCase()}"}
        ) {
          id
          poolId
          proposals(first: 20, orderBy: proposalNumber, orderDirection: desc) {
            proposalNumber
            proposalStatus
          }
        }
      }`,
    }),
  }).then((r) => r.json());
}

async function getProposalVoterStake({
  publicClient,
  strategyAddress,
  proposalNumber,
  voter,
}: {
  publicClient: E2EPublicClient;
  strategyAddress: Address;
  proposalNumber: bigint;
  voter: Address;
}) {
  return publicClient.readContract({
    address: strategyAddress,
    abi: cvStrategyAbi,
    functionName: "getProposalVoterStake",
    args: [proposalNumber, voter],
  });
}

async function allocateSupportToProposal({
  publicClient,
  walletClient,
  alloAddress,
  strategyAddress,
  poolId,
  voter,
  targetProposalNumber,
  proposalNumbers,
  targetSupport,
}: {
  publicClient: E2EPublicClient;
  walletClient: any;
  alloAddress: Address;
  strategyAddress: Address;
  poolId: bigint;
  voter: Address;
  targetProposalNumber: bigint;
  proposalNumbers: bigint[];
  targetSupport: bigint;
}) {
  const currentStakes: { proposalNumber: bigint; currentStake: bigint }[] =
    await Promise.all(
      proposalNumbers.map(async (proposalNumber) => ({
        proposalNumber,
        currentStake: BigInt(
          await getProposalVoterStake({
            publicClient,
            strategyAddress,
            proposalNumber,
            voter,
          }),
        ),
      })),
    );

  const currentTargetStake =
    currentStakes.find(
      ({ proposalNumber }) => proposalNumber === targetProposalNumber,
    )?.currentStake ?? 0n;
  const deltas = currentStakes
    .filter(
      ({ proposalNumber, currentStake }) =>
        currentStake > 0n && proposalNumber !== targetProposalNumber,
    )
    .map(({ proposalNumber, currentStake }) => ({
      proposalId: proposalNumber,
      deltaSupport: -currentStake,
    }));

  const targetDelta = targetSupport - currentTargetStake;
  if (targetDelta !== 0n) {
    deltas.push({
      proposalId: targetProposalNumber,
      deltaSupport: targetDelta,
    });
  }

  const encodedData = encodeAbiParameters(
    parseAbiParameters("(uint256 proposalId, int256 deltaSupport)[]"),
    [deltas],
  );

  let lastReceiptStatus: string | undefined;
  for (let attempt = 1; attempt <= 3; attempt++) {
    await expect
      .poll(
        async () => {
          try {
            await publicClient.simulateContract({
              account: walletClient.account,
              address: alloAddress,
              abi: alloAbi,
              functionName: "allocate",
              args: [poolId, encodedData],
            });
            return true;
          } catch {
            return false;
          }
        },
        {
          timeout: 180000,
          intervals: [1000, 2000, 3000, 5000],
          message: `proposal ${targetProposalNumber.toString()} allocation simulation succeeds`,
        },
      )
      .toBe(true);

    const txHash = await walletClient.writeContract({
      address: alloAddress,
      abi: alloAbi,
      functionName: "allocate",
      args: [poolId, encodedData],
    });
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
      timeout: 180000,
    });
    lastReceiptStatus = receipt.status;
    if (receipt.status === "success") {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
  }

  throw new Error(
    `proposal ${targetProposalNumber.toString()} allocation transaction did not succeed; last receipt status was ${lastReceiptStatus}`,
  );
}

test("should allocate support to a proposal", async () => {
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

  let strategyWithProposal:
    | {
        id: Address;
        poolId: string;
        proposals?: { proposalNumber: string; proposalStatus: string }[];
      }
    | undefined;
  await expect
    .poll(
      async () => {
        const response = await fetchLatestEnabledStrategyWithProposal({
          graphUrl: subgraphUrl,
          communityId,
        });
        strategyWithProposal = response.data?.cvstrategies?.find(
          (strategy: {
            proposals?: { proposalNumber: string; proposalStatus: string }[];
          }) =>
            strategy.proposals?.some(
              (proposal: { proposalStatus: string }) =>
                proposal.proposalStatus === "1",
            ),
        );
        return strategyWithProposal;
      },
      {
        timeout: 180000,
        intervals: [1000, 2000, 3000, 5000],
      },
    )
    .not.toBeUndefined();

  const strategyAddress = strategyWithProposal!.id;
  const activeProposals = strategyWithProposal!.proposals!.filter(
    (proposal) => proposal.proposalStatus === "1",
  );
  const targetProposalNumber = BigInt(activeProposals[0].proposalNumber);
  const proposalNumbers = activeProposals.map((proposal) =>
    BigInt(proposal.proposalNumber),
  );
  const alloAddress = await fetchAlloAddress(subgraphUrl, chainId);
  const memberPower = await publicClient.readContract({
    address: communityId,
    abi: registryCommunityAbi,
    functionName: "memberPowerInStrategy",
    args: [account.address, strategyAddress],
  });
  if (memberPower === 0n) {
    throw new Error("No member power available for allocation");
  }

  const configuredSupport = parseUnits(proposalTestConfig.supportAmount, 18);
  const targetSupport =
    memberPower < configuredSupport ? memberPower : configuredSupport;

  await allocateSupportToProposal({
    publicClient,
    walletClient,
    alloAddress,
    strategyAddress,
    poolId: BigInt(strategyWithProposal!.poolId),
    voter: account.address,
    targetProposalNumber,
    proposalNumbers,
    targetSupport,
  });

  await expect
    .poll(
      async () => {
        return getProposalVoterStake({
          publicClient,
          strategyAddress,
          proposalNumber: targetProposalNumber,
          voter: account.address,
        });
      },
      {
        timeout: 180000,
        intervals: [1000, 2000, 3000, 5000],
      },
    )
    .toBeGreaterThanOrEqual(targetSupport);
});

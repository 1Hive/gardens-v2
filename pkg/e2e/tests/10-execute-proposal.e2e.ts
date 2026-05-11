import { testWithSynpress } from "@synthetixio/synpress";
import { mnemonicToAccount } from "viem/accounts";
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
import basicSetup from "../wallet-setup/basic.setup";
import {
  createE2EChain,
  expectNoErrorToast,
  fetchAlloAddress,
  getConfig,
  metaMaskFixtures,
} from "./utils";
import { proposalTestConfig } from "./proposal-test-config";

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;
const requestedAmount = proposalTestConfig.requestedAmount;
const executionPoolFundingAmount = "1";
const PROPOSAL_METADATA_HASH = "QmPjXaoDhSx4mMFCADow9Kea3NMcd44PNCqr8hFpsCpi6f";

const erc20Abi = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
]);
const alloAbi = parseAbi([
  "function allocate(uint256 _poolId, bytes _data) payable",
  "function distribute(uint256 _poolId, address[] _recipientIds, bytes _data)",
  "function registerRecipient(uint256 _poolId, bytes _data) payable returns (address)",
]);
const cvStrategyAbi = parseAbi([
  "function getProposalVoterStake(uint256,address) view returns (uint256)",
  "function calculateProposalConviction(uint256) view returns (uint256)",
  "function calculateThreshold(uint256) view returns (uint256)",
  "function getProposal(uint256) view returns (address,address,address,uint256,uint256,uint8,uint256,uint256,uint256,uint256,uint256,uint256)",
]);
const registryCommunityAbi = parseAbi([
  "function memberPowerInStrategy(address member, address strategy) view returns (uint256)",
]);

test.setTimeout(600000);

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
          where: {isEnabled: true, registryCommunity:"${communityId.toLowerCase()}"}
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

async function getTokenDecimals(publicClient: any, token: Address) {
  const decimals = await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "decimals",
  });

  return Number(decimals);
}

async function waitForTokenBalanceAtLeast({
  publicClient,
  token,
  owner,
  minimumBalance,
  timeoutMs = 60000,
}: {
  publicClient: any;
  token: Address;
  owner: Address;
  minimumBalance: bigint;
  timeoutMs?: number;
}) {
  await expect
    .poll(
      async () => {
        return publicClient.readContract({
          address: token,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [owner],
        });
      },
      {
        timeout: timeoutMs,
        intervals: [1000, 2000, 3000],
      },
    )
    .toBeGreaterThanOrEqual(minimumBalance);
}

async function fundPoolTokensToStrategy({
  publicClient,
  walletClient,
  token,
  strategyAddress,
  amount,
}: {
  publicClient: any;
  walletClient: any;
  token: Address;
  strategyAddress: Address;
  amount: string;
}) {
  const decimals = await getTokenDecimals(publicClient, token);
  const transferAmount = parseUnits(amount, decimals);
  const account = walletClient.account.address as Address;
  const initialStrategyBalance = await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [strategyAddress],
  });

  try {
    await publicClient.simulateContract({
      account: walletClient.account,
      address: token,
      abi: erc20Abi,
      functionName: "mint",
      args: [strategyAddress, transferAmount],
    });

    const mintHash = await walletClient.writeContract({
      address: token,
      abi: erc20Abi,
      functionName: "mint",
      args: [strategyAddress, transferAmount],
    });
    const mintReceipt = await publicClient.waitForTransactionReceipt({
      hash: mintHash,
      confirmations: 1,
      timeout: 180000,
    });
    expect(mintReceipt.status).toBe("success");

    const expectedStrategyBalance = initialStrategyBalance + transferAmount;
    await waitForTokenBalanceAtLeast({
      publicClient,
      token,
      owner: strategyAddress,
      minimumBalance: expectedStrategyBalance,
    });
    return expectedStrategyBalance;
  } catch (error) {
    console.log(
      `[execute-proposal] direct pool token mint unavailable, falling back to transfer: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const initialAccountBalance = await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account],
  });
  if (initialAccountBalance < transferAmount) {
    throw new Error(
      `Insufficient pool token balance for fallback transfer: wallet balance ${initialAccountBalance.toString()} is below ${transferAmount.toString()}`,
    );
  }

  const txHash = await walletClient.writeContract({
    address: token,
    abi: erc20Abi,
    functionName: "transfer",
    args: [strategyAddress, transferAmount],
  });

  const transferReceipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
    timeout: 180000,
  });
  expect(transferReceipt.status).toBe("success");

  const expectedStrategyBalance = initialStrategyBalance + transferAmount;
  await waitForTokenBalanceAtLeast({
    publicClient,
    token,
    owner: strategyAddress,
    minimumBalance: expectedStrategyBalance,
  });
  return expectedStrategyBalance;
}

async function getProposalVoterStake({
  publicClient,
  strategyAddress,
  proposalNumber,
  voter,
}: {
  publicClient: any;
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

async function reallocateSupportToProposal({
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
  publicClient: any;
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

  const deltas: { proposalId: bigint; deltaSupport: bigint }[] = currentStakes
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

async function waitForProposalVoterStakeAtLeast({
  publicClient,
  strategyAddress,
  proposalNumber,
  voter,
  minimumStake,
}: {
  publicClient: any;
  strategyAddress: Address;
  proposalNumber: bigint;
  voter: Address;
  minimumStake: bigint;
}) {
  await expect
    .poll(
      async () => {
        return publicClient.readContract({
          address: strategyAddress,
          abi: cvStrategyAbi,
          functionName: "getProposalVoterStake",
          args: [proposalNumber, voter],
        });
      },
      {
        timeout: 180000,
        intervals: [1000, 2000, 3000, 5000],
        message: `proposal ${proposalNumber.toString()} voter stake reaches ${minimumStake.toString()}`,
      },
    )
    .toBeGreaterThanOrEqual(minimumStake);
}

async function createExecutionProposalDirectly({
  publicClient,
  walletClient,
  alloAddress,
  poolId,
  token,
  beneficiary,
}: {
  publicClient: any;
  walletClient: any;
  alloAddress: Address;
  poolId: bigint;
  token: Address;
  beneficiary: Address;
}) {
  const tokenDecimals = await getTokenDecimals(publicClient, token);
  const encodedData = encodeAbiParameters(
    parseAbiParameters(
      "(uint256 poolId,address beneficiaryAddress,uint256 requestedAmount,address requestedTokenAddress,(uint256 pointer,string ipfsHash) metadata)",
    ),
    [
      {
        poolId,
        beneficiaryAddress: beneficiary,
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
    args: [poolId, encodedData],
    value: parseUnits("0.0000000001", 18),
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 1,
    timeout: 180000,
  });
  expect(receipt.status).toBe("success");
}

async function waitForNewProposalIndexed({
  graphUrl,
  communityId,
  previousProposalNumber,
}: {
  graphUrl: string;
  communityId: string;
  previousProposalNumber: number;
}) {
  let latestProposalNumber = 0;

  await expect
    .poll(
      async () => {
        const response = await fetchLatestStrategy(graphUrl, communityId);
        const latestProposal = response.data?.cvstrategies?.[0]?.proposals?.[0];
        latestProposalNumber = Number(latestProposal?.proposalNumber ?? 0);
        return latestProposalNumber;
      },
      {
        timeout: 180000,
        intervals: [1000, 2000, 3000, 5000],
        message: `new proposal indexed after proposal ${previousProposalNumber}`,
      },
    )
    .toBeGreaterThan(previousProposalNumber);

  return latestProposalNumber;
}

async function waitForProposalToBeExecutable({
  publicClient,
  strategyAddress,
  proposalNumber,
  requestedAmount,
  timeoutMs = 180000,
}: {
  publicClient: any;
  strategyAddress: Address;
  proposalNumber: bigint;
  requestedAmount: bigint;
  timeoutMs?: number;
}) {
  let lastConviction = 0n;
  let lastThreshold = 0n;
  let lastLoggedAt = 0;

  await expect
    .poll(
      async () => {
        const [conviction, threshold] = await Promise.all([
          publicClient.readContract({
            address: strategyAddress,
            abi: cvStrategyAbi,
            functionName: "calculateProposalConviction",
            args: [proposalNumber],
          }),
          publicClient.readContract({
            address: strategyAddress,
            abi: cvStrategyAbi,
            functionName: "calculateThreshold",
            args: [requestedAmount],
          }),
        ]);

        lastConviction = BigInt(conviction);
        lastThreshold = BigInt(threshold);
        const now = Date.now();
        if (now - lastLoggedAt > 15000) {
          console.log(
            `[execute-proposal] conviction=${lastConviction.toString()} threshold=${lastThreshold.toString()}`,
          );
          lastLoggedAt = now;
        }

        return conviction >= threshold;
      },
      {
        timeout: timeoutMs,
        intervals: [1000, 2000, 3000, 5000],
        message: `proposal ${proposalNumber.toString()} is executable`,
      },
    )
    .toBe(true);
}

async function executeProposalDirectly({
  publicClient,
  walletClient,
  alloAddress,
  poolId,
  strategyAddress,
  proposalNumber,
}: {
  publicClient: any;
  walletClient: any;
  alloAddress: Address;
  poolId: bigint;
  strategyAddress: Address;
  proposalNumber: bigint;
}) {
  const encodedData = encodeAbiParameters(
    parseAbiParameters("uint256 proposalId"),
    [proposalNumber],
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
              functionName: "distribute",
              args: [poolId, [strategyAddress], encodedData],
            });
            return true;
          } catch {
            return false;
          }
        },
        {
          timeout: 180000,
          intervals: [1000, 2000, 3000, 5000],
          message: `proposal ${proposalNumber.toString()} execution simulation succeeds`,
        },
      )
      .toBe(true);

    const txHash = await walletClient.writeContract({
      address: alloAddress,
      abi: alloAbi,
      functionName: "distribute",
      args: [poolId, [strategyAddress], encodedData],
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
    `proposal ${proposalNumber.toString()} execution transaction did not succeed; last receipt status was ${lastReceiptStatus}`,
  );
}

async function waitForProposalExecutedOnChain({
  publicClient,
  strategyAddress,
  proposalNumber,
  timeoutMs = 180000,
}: {
  publicClient: any;
  strategyAddress: Address;
  proposalNumber: bigint;
  timeoutMs?: number;
}) {
  await expect
    .poll(
      async () => {
        const proposal = await publicClient.readContract({
          address: strategyAddress,
          abi: cvStrategyAbi,
          functionName: "getProposal",
          args: [proposalNumber],
        });

        return Number(proposal[5]);
      },
      {
        timeout: timeoutMs,
        intervals: [1000, 2000, 3000, 5000],
        message: `proposal ${proposalNumber.toString()} is executed on-chain`,
      },
    )
    .toBe(4);
}

test("should execute a proposal", async ({ page }) => {
  await page.bringToFront();

  const { chainId, communityId, subgraphUrl, rpcUrl, walletSeedPhrase } =
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
  const graphUrl = subgraphUrl;
  let subgraphRes = await fetchLatestStrategy(graphUrl, communityId);
  const {
    id: strategyAddress,
    poolId,
    token,
    proposals,
  } = subgraphRes.data.cvstrategies[0];
  const alloAddress = await fetchAlloAddress(graphUrl, chainId);

  const highestKnownProposalNumber = proposals.reduce(
    (max: number, item: { proposalNumber: string }) =>
      Math.max(max, Number(item.proposalNumber)),
    0,
  );
  await createExecutionProposalDirectly({
    publicClient,
    walletClient,
    alloAddress,
    poolId: BigInt(poolId),
    token,
    beneficiary: account.address,
  });

  const createdProposalNumber = await waitForNewProposalIndexed({
    graphUrl,
    communityId,
    previousProposalNumber: highestKnownProposalNumber,
  });

  const resolvedProposalNumber = BigInt(createdProposalNumber);
  const configuredSupport = parseUnits(proposalTestConfig.supportAmount, 18);
  const memberPower = await publicClient.readContract({
    address: communityId,
    abi: registryCommunityAbi,
    functionName: "memberPowerInStrategy",
    args: [account.address, strategyAddress],
  });
  if (memberPower === 0n) {
    throw new Error("No member power available for execution proposal");
  }
  const targetSupport =
    memberPower < configuredSupport ? memberPower : configuredSupport;

  await reallocateSupportToProposal({
    publicClient,
    walletClient,
    alloAddress,
    strategyAddress,
    poolId: BigInt(poolId),
    voter: account.address,
    targetProposalNumber: resolvedProposalNumber,
    proposalNumbers: Array.from(
      new Set([
        resolvedProposalNumber.toString(),
        ...proposals.map((proposal: { proposalNumber: string }) =>
          proposal.proposalNumber.toString(),
        ),
      ]),
    ).map((proposalNumber) => BigInt(proposalNumber)),
    targetSupport,
  });

  await waitForProposalVoterStakeAtLeast({
    publicClient,
    strategyAddress,
    proposalNumber: resolvedProposalNumber,
    voter: account.address,
    minimumStake: targetSupport,
  });

  const fundedAmount = await fundPoolTokensToStrategy({
    publicClient,
    walletClient,
    token,
    strategyAddress,
    amount: executionPoolFundingAmount,
  });
  await waitForTokenBalanceAtLeast({
    publicClient,
    token,
    owner: strategyAddress,
    minimumBalance: fundedAmount,
  });

  await waitForProposalToBeExecutable({
    publicClient,
    strategyAddress,
    proposalNumber: resolvedProposalNumber,
    requestedAmount: parseUnits(
      requestedAmount,
      await getTokenDecimals(publicClient, token),
    ),
  });

  await executeProposalDirectly({
    publicClient,
    walletClient,
    alloAddress,
    poolId: BigInt(poolId),
    strategyAddress,
    proposalNumber: resolvedProposalNumber,
  });

  await waitForProposalExecutedOnChain({
    publicClient,
    strategyAddress,
    proposalNumber: resolvedProposalNumber,
  });

  const proposalRouteId = `${strategyAddress}-${createdProposalNumber}`;
  await page.goto(
    `/gardens/${chainId}/${communityId}/${poolId}/${proposalRouteId}`,
    { timeout: 60000, waitUntil: "domcontentloaded" },
  );
  await expectNoErrorToast(page);
});

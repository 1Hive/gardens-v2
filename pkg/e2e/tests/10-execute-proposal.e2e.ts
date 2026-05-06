import { testWithSynpress } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";
import { mnemonicToAccount } from "viem/accounts";
import {
  Address,
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeAbiParameters,
  http,
  parseAbi,
  parseAbiParameters,
  parseUnits
} from "viem";
import { metaMaskFixtures } from "./utils";
import basicSetup from "../wallet-setup/basic.setup";
import { confirmTransaction, connectWallet, expectNoErrorToast } from "./utils";
import { getByTestId } from "./utils";
import { getConfig } from "./utils";

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;
const requestedAmount = "0.1";

const erc20Abi = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)"
]);
const alloAbi = parseAbi([
  "function allocate(uint256 _poolId, bytes _data) payable",
  "function distribute(uint256 _poolId, address[] _recipientIds, bytes _data)"
]);
const cvStrategyAbi = parseAbi([
  "function getProposalVoterStake(uint256,address) view returns (uint256)",
  "function calculateProposalConviction(uint256) view returns (uint256)",
  "function calculateThreshold(uint256) view returns (uint256)"
]);

test.setTimeout(240000);

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
      }`
    })
  }).then((r) => r.json());
}

async function getTokenDecimals(publicClient: any, token: Address) {
  const decimals = await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "decimals"
  });

  return Number(decimals);
}

async function waitForTokenBalanceAtLeast({
  publicClient,
  token,
  owner,
  minimumBalance,
  timeoutMs = 60000
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
          args: [owner]
        });
      },
      {
        timeout: timeoutMs,
        intervals: [1000, 2000, 3000]
      }
    )
    .toBeGreaterThanOrEqual(minimumBalance);
}

async function transferPoolTokensToStrategy({
  publicClient,
  walletClient,
  token,
  strategyAddress,
  amount
}: {
  publicClient: any;
  walletClient: any;
  token: Address;
  strategyAddress: Address;
  amount: string;
}) {
  const decimals = await getTokenDecimals(publicClient, token);
  const transferAmount = parseUnits(amount, decimals);

  const txHash = await walletClient.writeContract({
    address: token,
    abi: erc20Abi,
    functionName: "transfer",
    args: [strategyAddress, transferAmount]
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return transferAmount;
}

async function getProposalVoterStake({
  publicClient,
  strategyAddress,
  proposalNumber,
  voter
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
    args: [proposalNumber, voter]
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
  targetSupport
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
          voter
        })
      )
    }))
    );

  const currentTargetStake =
    currentStakes.find(
      ({ proposalNumber }) => proposalNumber === targetProposalNumber
    )?.currentStake ?? 0n;

  const deltas: { proposalId: bigint; deltaSupport: bigint }[] = currentStakes
    .filter(
      ({ proposalNumber, currentStake }) =>
        currentStake > 0n && proposalNumber !== targetProposalNumber
    )
    .map(({ proposalNumber, currentStake }) => ({
      proposalId: proposalNumber,
      deltaSupport: -currentStake
    }));

  const targetDelta = targetSupport - currentTargetStake;
  if (targetDelta !== 0n) {
    deltas.push({
      proposalId: targetProposalNumber,
      deltaSupport: targetDelta
    });
  }

  const encodedData = encodeAbiParameters(
    parseAbiParameters("(uint256 proposalId, int256 deltaSupport)[]"),
    [deltas]
  );

  const txHash = await walletClient.writeContract({
    address: alloAddress,
    abi: alloAbi,
    functionName: "allocate",
    args: [poolId, encodedData]
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
}

async function waitForProposalToBeExecutable({
  publicClient,
  strategyAddress,
  proposalNumber,
  requestedAmount,
  timeoutMs = 60000
}: {
  publicClient: any;
  strategyAddress: Address;
  proposalNumber: bigint;
  requestedAmount: bigint;
  timeoutMs?: number;
}) {
  await expect
    .poll(
      async () => {
        const [conviction, threshold] = await Promise.all([
          publicClient.readContract({
            address: strategyAddress,
            abi: cvStrategyAbi,
            functionName: "calculateProposalConviction",
            args: [proposalNumber]
          }),
          publicClient.readContract({
            address: strategyAddress,
            abi: cvStrategyAbi,
            functionName: "calculateThreshold",
            args: [requestedAmount]
          })
        ]);

        return conviction >= threshold;
      },
      {
        timeout: timeoutMs,
        intervals: [1000, 2000, 3000]
      }
    )
    .toBe(true);
}

async function executeProposalDirectly({
  publicClient,
  walletClient,
  alloAddress,
  poolId,
  strategyAddress,
  proposalNumber
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
    [proposalNumber]
  );
  const txHash = await walletClient.writeContract({
    address: alloAddress,
    abi: alloAbi,
    functionName: "distribute",
    args: [poolId, [strategyAddress], encodedData]
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
}

async function waitForProposalExecution({
  graphUrl,
  proposalId,
  timeoutMs = 120000
}: {
  graphUrl: string;
  proposalId: string;
  timeoutMs?: number;
}) {
  await expect
    .poll(
      async () => {
        const response = await fetch(graphUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            query: `{
            cvproposal(id: "${proposalId}") {
              proposalStatus
              executedAt
            }
          }`
          })
        }).then((r) => r.json());

        const proposal = response.data?.cvproposal;
        return proposal?.proposalStatus === "4" || proposal?.executedAt != null;
      },
      {
        timeout: timeoutMs,
        intervals: [1000, 2000, 3000, 5000]
      }
    )
    .toBe(true);
}

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
      public: { http: [rpcUrl] }
    }
  });
}

test("should execute a proposal", async ({
  context,
  page,
  metamaskPage,
  extensionId
}) => {
  const metamask = new MetaMask(
    context,
    metamaskPage,
    basicSetup.walletPassword,
    extensionId
  );

  await page.bringToFront();
  await connectWallet(page, metamask);

  const { chainId, communityId, subgraphUrl, rpcUrl, walletSeedPhrase } =
    getConfig();
  const chain = createChain(chainId, rpcUrl);
  const account = mnemonicToAccount(walletSeedPhrase);
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl)
  });
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl)
  });
  const graphUrl = subgraphUrl;
  let subgraphRes = await fetchLatestStrategy(graphUrl, communityId);
  const {
    id: strategyAddress,
    poolId,
    token,
    proposals
  } = subgraphRes.data.cvstrategies[0];
  const allosRes = await fetch(graphUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `{
        allos(first: 1000) {
          id
          chainId
        }
      }`
    })
  }).then((r) => r.json());
  const alloAddress = allosRes.data.allos.find(
    (allo: { chainId: string }) => allo.chainId === chainId
  )?.id as Address | undefined;
  if (!alloAddress) {
    throw new Error(`Unable to resolve Allo address for chain ${chainId}`);
  }

  const highestKnownProposalNumber = proposals.reduce(
    (max: number, item: { proposalNumber: string }) =>
      Math.max(max, Number(item.proposalNumber)),
    0
  );
  const latestActiveProposalNumber = proposals.reduce(
    (
      max: number | null,
      item: { proposalNumber: string; proposalStatus: string }
    ) => {
      if (item.proposalStatus !== "1") {
        return max;
      }

      const proposalNumber = Number(item.proposalNumber);
      return max == null || proposalNumber > max ? proposalNumber : max;
    },
    null
  );
  let createdProposalNumber: number | null = latestActiveProposalNumber;

  if (createdProposalNumber == null) {
    await page.goto(
      `/gardens/${chainId}/${communityId}/${strategyAddress}/create-proposal`,
      { timeout: 60000, waitUntil: "domcontentloaded" }
    );

    const amountInput = getByTestId(page, "input-requested-amount");
    await expect(amountInput).toBeVisible({ timeout: 60000 });
    const descriptionInput = getByTestId(
      page,
      "input-proposal-description"
    ).locator('[contenteditable="true"]');
    const beneficiaryInput = getByTestId(page, "input-beneficiary-address");
    const titleInput = getByTestId(page, "input-proposal-title");

    const beneficiary = await page.evaluate(async () => {
      const provider = (window as any).ethereum;
      const accounts = (await provider.request({
        method: "eth_accounts"
      })) as string[];
      return accounts[0] ?? "";
    });

    await amountInput.fill(requestedAmount);
    await descriptionInput.fill("Execution test proposal");
    await beneficiaryInput.fill(beneficiary);
    await titleInput.fill("Execution test proposal");
    const previewBtn = getByTestId(page, "btn-preview-proposal");
    await expect(previewBtn).toBeEnabled({ timeout: 30000 });
    await previewBtn.click();

    const submitProposalBtn = getByTestId(page, "btn-submit-proposal");
    await expect(submitProposalBtn).toBeEnabled({ timeout: 30000 });
    await submitProposalBtn.click();
    await confirmTransaction({ metamask, extensionId });
    await expectNoErrorToast(page);

    await expect
      .poll(
        async () => {
          subgraphRes = await fetchLatestStrategy(graphUrl, communityId);
          const newestProposal = subgraphRes.data.cvstrategies[0].proposals[0];
          const newestProposalNumber = newestProposal
            ? Number(newestProposal.proposalNumber)
            : 0;
          createdProposalNumber =
            newestProposalNumber > highestKnownProposalNumber
              ? newestProposalNumber
              : null;
          return createdProposalNumber;
        },
        {
          timeout: 180000,
          intervals: [1000, 2000, 3000, 5000]
        }
      )
      .not.toBeNull();
  }

  if (createdProposalNumber == null) {
    throw new Error("Unable to resolve proposal number for execution test");
  }

  const resolvedProposalNumber = BigInt(createdProposalNumber);

  await reallocateSupportToProposal({
    publicClient,
    walletClient,
    alloAddress,
    strategyAddress,
    poolId: BigInt(poolId),
    voter: account.address,
    targetProposalNumber: resolvedProposalNumber,
    proposalNumbers: proposals.map((proposal: { proposalNumber: string }) =>
      BigInt(proposal.proposalNumber)
    ),
    targetSupport: parseUnits("0.2", 18)
  });

  const fundedAmount = await transferPoolTokensToStrategy({
    publicClient,
    walletClient,
    token,
    strategyAddress,
    amount: requestedAmount
  });
  await waitForTokenBalanceAtLeast({
    publicClient,
    token,
    owner: strategyAddress,
    minimumBalance: fundedAmount
  });

  await waitForProposalToBeExecutable({
    publicClient,
    strategyAddress,
    proposalNumber: resolvedProposalNumber,
    requestedAmount: parseUnits(requestedAmount, 18)
  });

  await executeProposalDirectly({
    publicClient,
    walletClient,
    alloAddress,
    poolId: BigInt(poolId),
    strategyAddress,
    proposalNumber: resolvedProposalNumber
  });

  const proposalRouteId = `${strategyAddress}-${createdProposalNumber}`;
  await waitForProposalExecution({
    graphUrl,
    proposalId: proposalRouteId
  });

  await page.goto(
    `/gardens/${chainId}/${communityId}/${poolId}/${proposalRouteId}`,
    { timeout: 60000, waitUntil: "domcontentloaded" }
  );
  await expectNoErrorToast(page);
});

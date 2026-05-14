import { testWithSynpress } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";
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
  confirmTransaction,
  connectWallet,
  createE2EChain,
  expectNoErrorToast,
  fetchAlloAddress,
  getByTestId,
  getConfig,
  metaMaskFixtures,
} from "./utils";
import { proposalTestConfig } from "./proposal-test-config";

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test.setTimeout(600000);

const PROPOSAL_METADATA_HASH = "QmPjXaoDhSx4mMFCADow9Kea3NMcd44PNCqr8hFpsCpi6f";
const DISPUTE_REASON = "E2E dispute: proposal violates the covenant.";
const REJECTED_RULING = 2;

const erc20Abi = parseAbi(["function decimals() view returns (uint8)"]);
const alloAbi = parseAbi([
  "function registerRecipient(uint256 _poolId, bytes _data) payable returns (address)",
]);
const cvStrategyAbi = parseAbi([
  "function getArbitrableConfig() view returns (address arbitrator,address tribunalSafe,uint256 submitterCollateralAmount,uint256 challengerCollateralAmount,uint256 defaultRuling,uint256 defaultRulingTimeout)",
  "function getProposal(uint256) view returns (address,address,address,uint256,uint256,uint8,uint256,uint256,uint256,uint256,uint256,uint256)",
]);

type StrategyProposal = {
  proposalNumber: string;
  proposalStatus: string;
};

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
            id
            proposalNumber
            proposalStatus
          }
        }
      }`,
    }),
  }).then((r) => r.json());
}

async function fetchProposalDisputes({
  graphUrl,
  proposalId,
}: {
  graphUrl: string;
  proposalId: string;
}) {
  return fetch(graphUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `{
        proposalDisputes(
          first: 10
          orderBy: createdAt
          orderDirection: desc
          where: {proposal_: {id: "${proposalId.toLowerCase()}"}}
        ) {
          disputeId
          status
          rulingOutcome
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

async function createDisputableProposalDirectly({
  publicClient,
  walletClient,
  alloAddress,
  poolId,
  token,
  beneficiary,
  strategyAddress,
}: {
  publicClient: any;
  walletClient: any;
  alloAddress: Address;
  poolId: bigint;
  token: Address;
  beneficiary: Address;
  strategyAddress: Address;
}) {
  const tokenDecimals = await getTokenDecimals(publicClient, token);
  const arbitrableConfig = await publicClient.readContract({
    address: strategyAddress,
    abi: cvStrategyAbi,
    functionName: "getArbitrableConfig",
  });
  const submitterCollateralAmount = BigInt(arbitrableConfig[2]);
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
    value: submitterCollateralAmount,
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
  let latestProposal:
    | (StrategyProposal & {
        id: string;
      })
    | undefined;

  await expect
    .poll(
      async () => {
        const response = await fetchLatestStrategy(graphUrl, communityId);
        latestProposal = response.data?.cvstrategies?.[0]?.proposals?.[0];
        return Number(latestProposal?.proposalNumber ?? 0);
      },
      {
        timeout: 180000,
        intervals: [1000, 2000, 3000, 5000],
        message: `new proposal indexed after proposal ${previousProposalNumber}`,
      },
    )
    .toBeGreaterThan(previousProposalNumber);

  if (!latestProposal) {
    throw new Error("New proposal was not indexed");
  }

  return latestProposal;
}

async function waitForProposalStatusOnChain({
  publicClient,
  strategyAddress,
  proposalNumber,
  expectedStatus,
  message,
}: {
  publicClient: any;
  strategyAddress: Address;
  proposalNumber: bigint;
  expectedStatus: number;
  message: string;
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
        timeout: 180000,
        intervals: [1000, 2000, 3000, 5000],
        message,
      },
    )
    .toBe(expectedStatus);
}

async function waitForDisputeIndexed({
  graphUrl,
  proposalId,
}: {
  graphUrl: string;
  proposalId: string;
}) {
  let dispute: { disputeId: string; status: string } | undefined;

  await expect
    .poll(
      async () => {
        const response = await fetchProposalDisputes({ graphUrl, proposalId });
        dispute = response.data?.proposalDisputes?.[0];
        return Number(dispute?.disputeId ?? 0);
      },
      {
        timeout: 180000,
        intervals: [1000, 2000, 3000, 5000],
        message: `dispute indexed for proposal ${proposalId}`,
      },
    )
    .toBeGreaterThan(0);

  return dispute;
}

async function waitForDisputeRuled({
  graphUrl,
  proposalId,
}: {
  graphUrl: string;
  proposalId: string;
}) {
  await expect
    .poll(
      async () => {
        const response = await fetchProposalDisputes({ graphUrl, proposalId });
        return response.data?.proposalDisputes?.[0]?.status;
      },
      {
        timeout: 180000,
        intervals: [1000, 2000, 3000, 5000],
        message: `dispute ruled for proposal ${proposalId}`,
      },
    )
    .toBe("1");
}

async function ensureWalletConnected(page: any, metamask: MetaMask) {
  const getWalletState = async () => {
    if (
      await page
        .getByTestId("accounts")
        .isVisible()
        .catch(() => false)
    ) {
      return "connected";
    }
    if (
      await page
        .getByTestId("connectButton")
        .isVisible()
        .catch(() => false)
    ) {
      return "disconnected";
    }
    return "loading";
  };

  let walletState = "loading";
  for (let attempt = 1; attempt <= 2; attempt++) {
    await expect
      .poll(
        async () => {
          walletState = await getWalletState();
          return walletState;
        },
        {
          timeout: 60000,
          intervals: [500, 1000, 2000],
          message: "wallet connection state is visible",
        },
      )
      .not.toBe("loading");

    if (walletState === "connected") {
      return;
    }

    if (walletState === "disconnected") {
      await connectWallet(page, metamask);
      return;
    }

    if (attempt === 1) {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
      await page.bringToFront();
    }
  }
}

async function mockIpfsJsonUpload(page: any) {
  await page.route("**/api/ipfs", async (route: any) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        IpfsHash: PROPOSAL_METADATA_HASH,
      }),
    });
  });
}

test("should dispute and rule a proposal", async ({
  context,
  page,
  metamaskPage,
  extensionId,
}) => {
  const metamask = new MetaMask(
    context,
    metamaskPage,
    basicSetup.walletPassword,
    extensionId,
  );

  await page.bringToFront();
  await mockIpfsJsonUpload(page);

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
  const alloAddress = await fetchAlloAddress(subgraphUrl, chainId);
  let subgraphRes = await fetchLatestStrategy(subgraphUrl, communityId);
  const {
    id: strategyAddress,
    poolId,
    token,
    proposals,
  } = subgraphRes.data.cvstrategies[0] as {
    id: Address;
    poolId: string;
    token: Address;
    proposals: (StrategyProposal & { id: string })[];
  };

  const activeProposal = proposals.find(
    (proposal) => proposal.proposalStatus === "1",
  );
  let disputableProposalNumber = Number(activeProposal?.proposalNumber ?? 0);
  let disputableProposalId = activeProposal?.id;

  if (disputableProposalNumber === 0) {
    const highestKnownProposalNumber = proposals.reduce(
      (max, proposal) => Math.max(max, Number(proposal.proposalNumber)),
      0,
    );
    await createDisputableProposalDirectly({
      publicClient,
      walletClient,
      alloAddress,
      poolId: BigInt(poolId),
      token,
      beneficiary: account.address,
      strategyAddress,
    });

    const indexedProposal = await waitForNewProposalIndexed({
      graphUrl: subgraphUrl,
      communityId,
      previousProposalNumber: highestKnownProposalNumber,
    });
    disputableProposalNumber = Number(indexedProposal.proposalNumber);
    disputableProposalId = indexedProposal.id;

    subgraphRes = await fetchLatestStrategy(subgraphUrl, communityId);
    const refreshedProposal =
      subgraphRes.data?.cvstrategies?.[0]?.proposals?.find(
        (proposal: StrategyProposal & { id: string }) =>
          Number(proposal.proposalNumber) === disputableProposalNumber,
      );
    disputableProposalId = refreshedProposal?.id ?? disputableProposalId;
  }

  if (!disputableProposalId) {
    throw new Error("No disputable proposal id found");
  }

  const proposalNumber = BigInt(disputableProposalNumber);
  await waitForProposalStatusOnChain({
    publicClient,
    strategyAddress,
    proposalNumber,
    expectedStatus: 1,
    message: `proposal ${proposalNumber.toString()} is active before dispute`,
  });

  const proposalRouteId = `${strategyAddress}-${disputableProposalNumber}`;
  await page.goto(
    `/gardens/${chainId}/${communityId}/${poolId}/${proposalRouteId}`,
    { timeout: 60000, waitUntil: "domcontentloaded" },
  );
  await page.bringToFront();
  await ensureWalletConnected(page, metamask);

  const disputeButton = getByTestId(page, "btn-dispute-proposal");
  await expect(disputeButton).toBeVisible({ timeout: 180000 });
  await expect(disputeButton).toBeEnabled({ timeout: 180000 });
  await disputeButton.click();

  const disputeReasonInput = getByTestId(page, "input-dispute-reason");
  await expect(disputeReasonInput).toBeVisible({ timeout: 60000 });
  await disputeReasonInput.fill(DISPUTE_REASON);

  const submitDisputeButton = getByTestId(page, "btn-submit-dispute-proposal");
  await expect(submitDisputeButton).toBeEnabled({ timeout: 180000 });
  await submitDisputeButton.click();
  await confirmTransaction({ metamask, extensionId });
  await page.bringToFront();

  await waitForProposalStatusOnChain({
    publicClient,
    strategyAddress,
    proposalNumber,
    expectedStatus: 5,
    message: `proposal ${proposalNumber.toString()} is disputed on-chain`,
  });
  await waitForDisputeIndexed({
    graphUrl: subgraphUrl,
    proposalId: disputableProposalId,
  });

  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  await page.bringToFront();
  await ensureWalletConnected(page, metamask);

  const openDisputeButton = getByTestId(page, "btn-open-dispute");
  await expect(openDisputeButton).toBeVisible({ timeout: 180000 });
  await expect(openDisputeButton).toBeEnabled({ timeout: 180000 });
  await openDisputeButton.click();

  const rejectRulingButton = getByTestId(page, "btn-rule-reject");
  await expect(rejectRulingButton).toBeVisible({ timeout: 180000 });
  await expect(rejectRulingButton).toBeEnabled({ timeout: 180000 });
  await rejectRulingButton.click();
  await confirmTransaction({ metamask, extensionId });
  await page.bringToFront();

  await waitForProposalStatusOnChain({
    publicClient,
    strategyAddress,
    proposalNumber,
    expectedStatus: 6,
    message: `proposal ${proposalNumber.toString()} is rejected after ruling`,
  });
  await waitForDisputeRuled({
    graphUrl: subgraphUrl,
    proposalId: disputableProposalId,
  });

  await expectNoErrorToast(page);
});

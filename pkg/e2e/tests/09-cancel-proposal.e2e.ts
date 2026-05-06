import { testWithSynpress } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";
import { metaMaskFixtures } from "./utils";
import basicSetup from "../wallet-setup/basic.setup";
import { confirmTransaction, connectWallet, expectNoErrorToast } from "./utils";
import { getByTestId } from "./utils";
import { getConfig } from "./utils";

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test.setTimeout(240000);

const cancellableStatuses = [0, 1, 2, 5];

async function fetchLatestStrategyWithProposals(
  subgraphUrl: string,
  communityId: string
) {
  return fetch(subgraphUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `{
        cvstrategies(
          first: 1,
          orderBy: poolId,
          orderDirection: desc,
          where: { isEnabled: true, registryCommunity: "${communityId.toLowerCase()}" }
        ) {
          id
          poolId
          proposals(first: 10, orderBy: proposalNumber, orderDirection: desc) {
            proposalNumber
            proposalStatus
          }
        }
      }`
    })
  }).then((r) => r.json());
}

test("should cancel a proposal", async ({
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

  const { chainId, communityId, subgraphUrl } = getConfig();
  const graphUrl = subgraphUrl;
  let subgraphRes = await fetchLatestStrategyWithProposals(
    graphUrl,
    communityId
  );
  let strategy = subgraphRes.data.cvstrategies[0];
  const highestKnownProposalNumber = strategy.proposals.reduce(
    (max: number, item: { proposalNumber: string }) =>
      Math.max(max, Number(item.proposalNumber)),
    0
  );

  let proposal = strategy.proposals.find((item: { proposalStatus: string }) =>
    cancellableStatuses.includes(Number(item.proposalStatus))
  );

  if (!proposal) {
    await page.goto(
      `/gardens/${chainId}/${communityId}/${strategy.id}/create-proposal`,
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

    await amountInput.fill("0.1");
    await descriptionInput.fill("Cancellation test proposal");
    await beneficiaryInput.fill(beneficiary);
    await titleInput.fill("Cancellation test proposal");
    await getByTestId(page, "btn-preview-proposal").click();
    await getByTestId(page, "btn-submit-proposal").click();
    await confirmTransaction({ metamask, extensionId });
    await expectNoErrorToast(page);

    let createdProposalNumber: number | null = null;
    await expect
      .poll(
        async () => {
          subgraphRes = await fetchLatestStrategyWithProposals(
            graphUrl,
            communityId
          );
          strategy = subgraphRes.data.cvstrategies[0];
          const newestProposal = strategy.proposals[0];
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

    proposal = strategy.proposals.find(
      (item: { proposalNumber: string }) =>
        Number(item.proposalNumber) === Number(createdProposalNumber)
    );
  }

  const { id: strategyId, poolId } = strategy;
  const { proposalNumber } = proposal;

  await page.goto(
    `/gardens/${chainId}/${communityId}/${poolId}/${strategyId}-${proposalNumber}`,
    { timeout: 60000, waitUntil: "domcontentloaded" }
  );

  // Click the Cancel button to open the confirmation modal
  const cancelBtn = getByTestId(page, "btn-cancel-proposal");
  await expect(cancelBtn).toBeVisible({ timeout: 30000 });
  await cancelBtn.click();

  // Confirm cancellation in the modal
  const confirmCancelBtn = getByTestId(page, "btn-confirm-cancel-proposal");
  await expect(confirmCancelBtn).toBeVisible({ timeout: 10000 });
  await confirmCancelBtn.click();

  await confirmTransaction({ metamask, extensionId });
  await expectNoErrorToast(page);
});

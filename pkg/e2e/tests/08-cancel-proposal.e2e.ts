import { testWithSynpress } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";
import { metaMaskFixtures } from "./support/metaMaskFixtures";
import basicSetup from "../wallet-setup/basic.setup";
import {
  confirmTransaction,
  connectWallet,
  expectNoErrorToast
} from "./support/metamaskUtils";

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test.setTimeout(240000);

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

  // Fetch latest pool and its latest proposal
  const subgraphRes = await fetch(
    "https://api.studio.thegraph.com/query/102093/gardens-v2---optimism/version/latest",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: `{
          cvstrategies(first: 1, orderBy: poolId, orderDirection: desc, where: { isEnabled: true }) {
            id
            poolId
            proposals(
              first: 10
              orderBy: proposalNumber
              orderDirection: desc
              where: { proposalStatus_not_in: [3, 4, 6] }
            ) {
              proposalNumber
            }
          }
        }`
      })
    }
  ).then((r) => r.json());

  const strategy = subgraphRes.data.cvstrategies[0];
  const { id: strategyId, poolId } = strategy;
  const { proposalNumber } = strategy.proposals[0];

  await page.goto(
    `gardens/10/0x8b2f706cd2bc0df6679218177c56e72c5241de9b/0x9ee73d7afd1d75d9d3468ab7845150180936dec4/${poolId}/${strategyId}-${proposalNumber}`,
    { timeout: 60000 }
  );

  // Click the Cancel button to open the confirmation modal
  const cancelBtn = page.getByTestId("btn-cancel-proposal");
  await expect(cancelBtn).toBeVisible({ timeout: 30000 });
  await cancelBtn.click();

  // Confirm cancellation in the modal
  const confirmCancelBtn = page.getByTestId("btn-confirm-cancel-proposal");
  await expect(confirmCancelBtn).toBeVisible({ timeout: 10000 });
  await confirmCancelBtn.click();

  await confirmTransaction({ metamask, extensionId });
  await expectNoErrorToast(page);
});

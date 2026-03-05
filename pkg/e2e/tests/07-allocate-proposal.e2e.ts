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

test("should allocate support to a proposal", async ({
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

  const subgraphRes = await fetch(
    "https://api.studio.thegraph.com/query/102093/gardens-v2---optimism/version/latest",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query:
          "{ cvstrategies(first: 1, orderBy: poolId, orderDirection: desc, where: { isEnabled: true }) { id poolId } }"
      })
    }
  ).then((r) => r.json());
  const { poolId } = subgraphRes.data.cvstrategies[0];

  await page.goto(
    `gardens/10/0x8b2f706cd2bc0df6679218177c56e72c5241de9b/0x9ee73d7afd1d75d9d3468ab7845150180936dec4/${poolId}`,
    { timeout: 60000 }
  );

  // Open the allocation view
  const voteBtn = page.getByTestId("btn-vote-on-proposals");
  await expect(voteBtn).toBeVisible({ timeout: 60000 });
  await voteBtn.click();

  // Fill the slider for the first proposal
  const slider = page.getByTestId("input-slider-vote").first();
  await expect(slider).toBeVisible({ timeout: 30000 });
  const box = await slider.boundingBox();
  await page.mouse.click(box!.x + box!.width * 0.1, box!.y + box!.height / 2);
  await page.waitForTimeout(1000);

  // Submit the vote
  const submitBtn = page.getByText("Submit your vote");
  await expect(submitBtn).toBeVisible({ timeout: 30000 });
  await submitBtn.click();

  await confirmTransaction({ metamask, extensionId });
  await expectNoErrorToast(page);
});

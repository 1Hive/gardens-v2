import { testWithSynpress } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";
import { metaMaskFixtures } from "./utils";
import basicSetup from "../wallet-setup/basic.setup";
import {
  confirmTransaction,
  connectWallet,
  expectNoErrorToast,
  getConnectedAccount,
  waitForMemberPowerActive,
} from "./utils";
import { getByTestId } from "./utils";
import { getConfig } from "./utils";

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test.setTimeout(240000);

test("should allocate support to a proposal", async ({
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
  await connectWallet(page, metamask);
  await page.bringToFront();

  const { chainId, communityId, subgraphUrl } = getConfig();
  const graphUrl = subgraphUrl;
  const subgraphRes = await fetch(graphUrl, {
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
  }
}`,
    }),
  }).then((r) => r.json());
  const { id: strategyAddress } = subgraphRes.data.cvstrategies[0];
  const account = await getConnectedAccount(page);

  await waitForMemberPowerActive({
    page,
    community: communityId,
    strategy: strategyAddress,
    account,
  });

  await page.goto(`/gardens/${chainId}/${communityId}/${strategyAddress}`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });

  const activateBtn = getByTestId(page, "btn-activate-governance");
  const voteBtn = getByTestId(page, "btn-vote-on-proposals");
  const connectBtn = getByTestId(page, "connectButton");

  for (let attempt = 0; attempt < 24; attempt++) {
    const voteVisible = await voteBtn
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    const voteEnabled = await voteBtn
      .isEnabled({ timeout: 1000 })
      .catch(() => false);

    if (voteVisible && voteEnabled) {
      break;
    }

    const activateVisible = await activateBtn
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    const activateEnabled = await activateBtn
      .isEnabled({ timeout: 1000 })
      .catch(() => false);

    if (activateVisible && activateEnabled) {
      await activateBtn.click();
      await confirmTransaction({ metamask, extensionId });
      await page.bringToFront();
      await expectNoErrorToast(page);
      await waitForMemberPowerActive({
        page,
        community: communityId,
        strategy: strategyAddress,
        account,
      });
      continue;
    }

    const connectVisible = await connectBtn
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    if (connectVisible) {
      await page.waitForLoadState("networkidle").catch(() => {});
    }
    await page.waitForTimeout(5000);
  }

  await expect(voteBtn).toBeVisible({ timeout: 60000 });
  await expect(voteBtn).toBeEnabled({ timeout: 60000 });
  await voteBtn.click();

  // Fill the slider for the first proposal
  const slider = getByTestId(page, "input-slider-vote");
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

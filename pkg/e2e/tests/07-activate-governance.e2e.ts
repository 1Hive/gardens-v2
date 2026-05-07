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

test("should activate governance in the pool", async ({
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
  const subgraphRes = await fetch(graphUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `{ cvstrategies(first: 1, orderBy: poolId, orderDirection: desc, where: { isEnabled: true, registryCommunity: "${communityId.toLowerCase()}" }) { id poolId } }`
    })
  }).then((r) => r.json());
  const { id: strategyAddress } = subgraphRes.data.cvstrategies[0];

  await page.goto(`/gardens/${chainId}/${communityId}/${strategyAddress}`, {
    timeout: 60000
  });

  const activateBtn = getByTestId(page, "btn-activate-governance");
  const voteBtn = getByTestId(page, "btn-vote-on-proposals");
  const deactivateBtn = page.getByRole("button", {
    name: "Deactivate governance"
  });

  for (let attempt = 0; attempt < 12; attempt++) {
    const activateVisible = await activateBtn.isVisible().catch(() => false);
    const voteVisible = await voteBtn.isVisible().catch(() => false);
    const deactivateVisible = await deactivateBtn.isVisible().catch(() => false);

    if (activateVisible || voteVisible || deactivateVisible) {
      break;
    }

    await page.reload({ waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(5000);
  }

  if (
    (await voteBtn.isVisible().catch(() => false)) ||
    (await deactivateBtn.isVisible().catch(() => false))
  ) {
    return;
  }

  await expect(activateBtn).toBeVisible({ timeout: 60000 });
  await activateBtn.click();

  await confirmTransaction({ metamask, extensionId });
  await expectNoErrorToast(page);

  for (let attempt = 0; attempt < 12; attempt++) {
    const voteVisible = await voteBtn.isVisible().catch(() => false);
    const deactivateVisible = await deactivateBtn.isVisible().catch(() => false);

    if (voteVisible || deactivateVisible) {
      return;
    }

    await page.reload({ waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(5000);
  }

  await expect(deactivateBtn.or(voteBtn)).toBeVisible({ timeout: 60000 });
});

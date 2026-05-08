import { testWithSynpress } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";
import basicSetup from "../wallet-setup/basic.setup";
import {
  approveTokenAllowance,
  confirmTransaction,
  connectWallet,
  expectNoErrorToast,
  getByTestId,
  metaMaskFixtures,
  gotoE2ECommunity,
} from "./utils";
const test = testWithSynpress(metaMaskFixtures(basicSetup));

const { expect } = test;

// Give the flow extra breathing room; MetaMask + subgraph responses can be slow
test.setTimeout(240000);

// Define a basic test case
test("should approve a pool as council safe", async ({
  context,
  page,
  metamaskPage,
  extensionId,
}) => {
  // Create a new MetaMask instance
  const metamask = new MetaMask(
    context,
    metamaskPage,
    basicSetup.walletPassword,
    extensionId,
  );

  await page.bringToFront();
  await connectWallet(page, metamask);
  await gotoE2ECommunity(page);

  await page.waitForTimeout(2000); // Wait for tx to succeed and UI to update

  await page.bringToFront();
  await page.waitForTimeout(2000); // Wait for tx to succeed and UI to update
  const selectAllBtn = getByTestId(page, "btn-select-all");
  await selectAllBtn.click();
  // Find the first pending pool card and navigate to it
  const poolCard = page
    .locator('[data-testid^="pool-card-unapproved-"]')
    .first();
  await expect(poolCard).toBeVisible({ timeout: 30000 });
  await poolCard.click();

  // Approve the pool
  const approveBtn = getByTestId(page, "btn-approve");
  await expect(approveBtn).toBeVisible({ timeout: 30000 });
  await approveBtn.click();

  await confirmTransaction({ metamask, extensionId });
  await expectNoErrorToast(page);

  await gotoE2ECommunity(page);
  await page.waitForLoadState("networkidle").catch(() => {});
  await getByTestId(page, "btn-select-all").click();

  const approvedPoolCard = page
    .locator('[data-testid^="pool-card-approved-"]')
    .first();
  for (let attempt = 0; attempt < 12; attempt++) {
    const approvedVisible = await approvedPoolCard
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    if (approvedVisible) {
      return;
    }

    await page.reload({ waitUntil: "networkidle" }).catch(() => {});
    await getByTestId(page, "btn-select-all")
      .click()
      .catch(() => {});
    await page.waitForTimeout(5000);
  }

  await expect(approvedPoolCard).toBeVisible({ timeout: 30000 });
});

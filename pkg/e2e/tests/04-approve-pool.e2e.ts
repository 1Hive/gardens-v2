import { testWithSynpress } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";
import { metaMaskFixtures } from "./support/metaMaskFixtures";
import basicSetup from "../wallet-setup/basic.setup";
import {
  approveTokenAllowance,
  confirmTransaction,
  connectWallet,
  expectNoErrorToast
} from "./support/metamaskUtils";
const test = testWithSynpress(metaMaskFixtures(basicSetup));

const { expect } = test;

// Give the flow extra breathing room; MetaMask + subgraph responses can be slow
test.setTimeout(240000);

// Define a basic test case
test("should approve a pool as council safe", async ({
  context,
  page,
  metamaskPage,
  extensionId
}) => {
  // Create a new MetaMask instance
  const metamask = new MetaMask(
    context,
    metamaskPage,
    basicSetup.walletPassword,
    extensionId
  );

  await page.bringToFront();
  await connectWallet(page, metamask);
  await page.goto(
    "/gardens/10/0x8b2f706cd2bc0df6679218177c56e72c5241de9b/0x9ee73d7afd1d75d9d3468ab7845150180936dec4",
    {
      timeout: 60000 // Increase timeout to handle slow loading
    }
  );

  await page.waitForTimeout(2000); // Wait for tx to succeed and UI to update

  await page.bringToFront();
  await page.waitForTimeout(2000); // Wait for tx to succeed and UI to update

  // Find the first pending pool card and navigate to it
  const poolCard = page.locator('[data-testid^="pool-card-"]').first();
  await expect(poolCard).toBeVisible({ timeout: 30000 });
  await poolCard.click();

  // Approve the pool
  const approveBtn = page.getByTestId("btn-approve");
  await expect(approveBtn).toBeVisible({ timeout: 30000 });
  await approveBtn.click();

  await confirmTransaction({ metamask, extensionId });
  await expectNoErrorToast(page);
});

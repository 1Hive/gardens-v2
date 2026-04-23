import { testWithSynpress } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";
import { metaMaskFixtures } from "./support/metaMaskFixtures";
import basicSetup from "../wallet-setup/basic.setup";
import {
  confirmTransaction,
  connectWallet,
  expectNoErrorToast
} from "./support/metamaskUtils";
import { getByTestId } from "./support/locators-utils";

const test = testWithSynpress(metaMaskFixtures(basicSetup));

const { expect } = test;

// Give the flow extra breathing room; MetaMask + subgraph responses can be slow
test.setTimeout(240000);

test("should edit a pool", async ({
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
  await page.goto(
    "/gardens/10/0x8b2f706cd2bc0df6679218177c56e72c5241de9b/0x9ee73d7afd1d75d9d3468ab7845150180936dec4",
    {
      timeout: 60000
    }
  );

  await page.waitForTimeout(2000);
  await page.bringToFront();
  await page.waitForTimeout(2000);

  // Navigate to the first approved pool
  const poolCard = page.locator('[data-testid^="pool-card-approved-"]').first();
  await expect(poolCard).toBeVisible({ timeout: 30000 });
  await poolCard.click();
  await page.waitForTimeout(5000);
  // Click the edit button (pick the visible one — desktop/mobile both render it)
  const editBtn = getByTestId(page, "btn-edit-pool");
  await expect(editBtn).toBeVisible({ timeout: 30000 });
  await editBtn.click();

  // Fill in the conviction input
  const convictionInput = getByTestId(page, "conviction-input");
  await expect(convictionInput).toBeVisible({ timeout: 30000 });
  await convictionInput.fill("0.000001");

  // Preview then submit
  await page.getByRole("button", { name: "Preview" }).click();
  await page.getByRole("button", { name: "Submit" }).click();

  await confirmTransaction({ metamask, extensionId });
  await expectNoErrorToast(page);
});

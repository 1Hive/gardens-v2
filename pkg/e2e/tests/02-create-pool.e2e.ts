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
test("should join and leave community", async ({
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

  // Stake Create Pool
  await page.getByTestId("btn-create-pool").click();

  //Find all inputs
  const nameInput = page.getByTestId("input-pool-name");
  await expect(nameInput).toBeVisible({ timeout: 30000 });
  const descriptionInput = page
    .getByTestId("input-pool-description")
    .locator('[contenteditable="true"]');
  const tokenAddressInput = page.getByTestId("input-token-address");

  // Fill all inputs
  await nameInput.fill("Test Pool");
  await descriptionInput.fill("Test Description");
  await tokenAddressInput.fill("0x8b2f706cd2bc0df6679218177c56e72c5241de9b");
  await page.getByTestId("btn-preview-pool").click();
  await page.getByTestId("btn-submit-pool").click();

  // Approve token allowance for staking
  await approveTokenAllowance({ page, metamask, extensionId });
  await page.waitForTimeout(1000); // Wait for next tx to launch

  // // Confirm the stake transaction
  await confirmTransaction({ metamask, extensionId });
  await expectNoErrorToast(page);
  await page.waitForTimeout(6000);
});

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
test("should create a proposal in the pool", async ({
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
    "gardens/10/0x8b2f706cd2bc0df6679218177c56e72c5241de9b/0x9ee73d7afd1d75d9d3468ab7845150180936dec4/189/create-proposal",
    {
      timeout: 60000 // Increase timeout to handle slow loading
    }
  );

  await page.waitForTimeout(2000); // Wait for tx to succeed and UI to update

  // await page.bringToFront();
  // await page.waitForTimeout(2000); // Wait for tx to succeed and UI to update
  // const selectAllBtn = page.getByTestId("btn-select-all");
  // await selectAllBtn.click();
  // // Find the first pending pool card and navigate to it
  // const poolCard = page.locator('[data-testid^="pool-card-approved"]').first();
  // await expect(poolCard).toBeVisible({ timeout: 30000 });
  // await poolCard.click();
  // await page.waitForTimeout(2000);

  // // Approve the pool
  // const addNewProposalBtn = page.getByTestId("btn-add-proposal");
  // await expect(addNewProposalBtn).toBeVisible({ timeout: 30000 });
  // await addNewProposalBtn.click();

  const amountInput = page.getByTestId("input-requested-amount");
  await expect(amountInput).toBeVisible({ timeout: 60000 });
  const descriptionInput = page
    .getByTestId("input-proposal-description")
    .locator('[contenteditable="true"]');
  const tokenAddressInput = page.getByTestId("input-beneficiary-address");
  const titleInput = page.getByTestId("input-proposal-title");

  // Fill all inputs
  await amountInput.fill("0");
  await descriptionInput.fill("Test Proposal Description");
  await tokenAddressInput.fill("0x327F6AA1870731235A57Bc785523dAF0054b7394");
  await titleInput.fill("Test Proposal Title");

  await page.getByTestId("btn-preview-proposal").click();
  // const submitBtn = page.getByTestId("")
  await page.getByTestId("btn-submit-proposal").click();

  await confirmTransaction({ metamask, extensionId });
  await expectNoErrorToast(page);
});

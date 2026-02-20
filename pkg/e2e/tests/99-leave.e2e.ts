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

  await page.goto(
    "/gardens/10/0x8b2f706cd2bc0df6679218177c56e72c5241de9b/0x9ee73d7afd1d75d9d3468ab7845150180936dec4",
    {
      timeout: 60000 // Increase timeout to handle slow loading
    }
  );
  await connectWallet(page, metamask);

  // 4. Leave the community
  const leaveBtn = page
    .getByTestId("register-member-button")
    .getByText("Leave");
  await expect(leaveBtn).toBeVisible({ timeout: 60000 });
  await expect(leaveBtn).toBeEnabled({ timeout: 60000 });
  await leaveBtn.click();
  await page.waitForTimeout(1000); // Wait for the tx to open
  await confirmTransaction({ metamask, extensionId });
  await expectNoErrorToast(page);
});

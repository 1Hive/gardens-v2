import { testWithSynpress } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";
import { metaMaskFixtures } from "./utils";
import basicSetup from "../wallet-setup/basic.setup";
import { confirmTransaction, connectWallet, expectNoErrorToast } from "./utils";
import { getByTestId } from "./utils";
import { gotoE2ECommunity } from "./utils";

const test = testWithSynpress(metaMaskFixtures(basicSetup));

const { expect } = test;

// Give the flow extra breathing room; MetaMask + subgraph responses can be slow
test.setTimeout(240000);

// Define a basic test case
test("should leave community", async ({
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

  await gotoE2ECommunity(page);
  await connectWallet(page, metamask);

  // 4. Leave the community
  const leaveBtn = getByTestId(page, "register-member-button").getByText(
    "Leave"
  );
  await expect(leaveBtn).toBeVisible({ timeout: 60000 });
  await expect(leaveBtn).toBeEnabled({ timeout: 60000 });
  await leaveBtn.click();
  await page.waitForTimeout(1000); // Wait for the tx to open
  await confirmTransaction({ metamask, extensionId });
  await expectNoErrorToast(page);
});

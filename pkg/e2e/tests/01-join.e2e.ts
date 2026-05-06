import { testWithSynpress } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";
import basicSetup from "../wallet-setup/basic.setup";
import {
  approveTokenAllowance,
  confirmTransaction,
  expectNoErrorToast,
  metaMaskFixtures,
  getByTestId,
  getConfig
} from "./utils";

const test = testWithSynpress(metaMaskFixtures(basicSetup));

const { expect } = test;

// Give the flow extra breathing room; MetaMask + subgraph responses can be slow
test.setTimeout(240000);

// Define a basic test case
test("should join community", async ({
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

  // Navigate to the homepage
  await page.addInitScript(() => {
    // Show archived communities by default
    localStorage.setItem("flag_showArchived", "true");
    localStorage.setItem("flag_queryAllChains", "true");
  });
  await page.goto("/", {
    timeout: 60000 // Increase timeout to handle slow loading
  });

  await getByTestId(page, "connectButton").click();
  await getByTestId(page, "rk-wallet-option-injected").click();
  await metamask.connectToDapp();

  // Verify connected account renders in shortened form without asserting a specific address
  await expect(getByTestId(page, "accounts")).toHaveText(
    /0x[0-9a-fA-F]{2,4}…[0-9a-fA-F]{2,4}/
  );

  const { communityId } = getConfig();
  await getByTestId(page, `community-card-${communityId}`).click(); // Opt - 🧪 End-to-End Test Playground

  // Wait for page loaded
  await page.waitForLoadState("networkidle");

  // Launch join flow
  await getByTestId(page, "register-member-button").click();

  // 1. Sign the community covenant
  await metamask.confirmSignature();

  // 2. Token allowance approval, then wait until allowance is on-chain
  await approveTokenAllowance({ page, metamask, extensionId });

  // Wait for join tx waiting for signature
  await page.getByText("Waiting for signature").isVisible({
    timeout: 60000
  });

  // 3. Join the community
  await page.waitForTimeout(1000); // Wait for the tx to open
  await confirmTransaction({ metamask, extensionId });
  await expectNoErrorToast(page);
});

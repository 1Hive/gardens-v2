import { testWithSynpress } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";
import { metaMaskFixtures } from "./support/metaMaskFixtures";
import basicSetup from "../wallet-setup/basic.setup";
import {
  approveTokenAllowance,
  confirmTransaction,
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

  // Navigate to the homepage
  await page.addInitScript(() => {
    // Show archived communities by default
    localStorage.setItem("flag_showArchived", "true");
    localStorage.setItem("flag_queryAllChains", "true");
  });
  await page.goto("/", {
    timeout: 60000 // Increase timeout to handle slow loading
  });

  await page.getByTestId("connectButton").click();
  await page.getByTestId("rk-wallet-option-injected").click();
  await metamask.connectToDapp();

  // Verify the connected account address
  await expect(page.locator("[data-testid='accounts']")).toHaveText(
    "0x327F…7394"
  );

  await page
    .getByTestId("community-card-0x9ee73d7afd1d75d9d3468ab7845150180936dec4") // Opt - 🧪 End-to-End Test Playground
    .click();

  // Wait for page loaded
  await page.waitForLoadState("networkidle");

  // Launch join flow
  await page.getByTestId("register-member-button").click();

  // 1. Sign the community covenant
  await metamask.confirmSignature();

  // 2. Token allowance approval
  await approveTokenAllowance({ page, metamask, extensionId });
  // Wait for next tx to launch
  await page.waitForTimeout(1000);

  // Wait for join tx waiting for signature
  await page.getByText("Waiting for signature").isVisible({
    timeout: 60000
  });

  // 3. Join the community
  await page.waitForTimeout(1000); // Wait for the tx to open
  await confirmTransaction({ metamask, extensionId });
  await expectNoErrorToast(page);

  // Close the modal
  await page.getByTestId("modal-close-button-register").click();
});

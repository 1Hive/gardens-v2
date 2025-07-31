import { testWithSynpress } from "@synthetixio/synpress";
import { MetaMask, metaMaskFixtures } from "@synthetixio/synpress/playwright";
import basicSetup from "../test/wallet-setup/basic.setup";

const test = testWithSynpress(metaMaskFixtures(basicSetup));

const { expect } = test;

// Define a basic test case
test("should connect wallet to the MetaMask Test Dapp", async ({
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
    .getByTestId("community-card-0xc219730ec703c9525748c3b80184d57f1d57699b") // ArbSep - Alpha Centaurians
    .click();

  // Wait for page loaded
  await page.waitForLoadState("networkidle");

  // Switch network
  await page.getByTestId("wrong-network").click();
  await page.getByTestId("switch-network-button").click();
  await metamask.approveNewNetwork();
  await metamask.approveSwitchNetwork();

  // Launch join flow
  await page.getByTestId("register-member-button").click();

  // 1. Sign the community covenant
  await metamask.confirmSignature();

  // 2. Token allowance approval
  // // Wait for the metamask page to load
  // await metamaskPage.waitForTimeout(1000);
  // await metamaskPage.waitForLoadState("networkidle");
  // await metamaskPage.locator("body").click();
  // for (let i = 0; i < 6; i++) {
  //   await metamaskPage.keyboard.press("Tab");
  // }
  // await metamaskPage.keyboard.press("Enter");
  // await metamaskPage.waitForTimeout(1000);
  // await metamaskPage.waitForLoadState("networkidle");
  // await metamaskPage.locator("body").click();
  // for (let i = 0; i < 12; i++) {
  //   await metamaskPage.keyboard.press("Tab");
  // }
  // await metamaskPage.keyboard.press("Enter");
  await metamask.approveTokenPermission({
    spendLimit: "max"
  });

  // 3. Join the community
  await metamask.confirmTransactionAndWaitForMining();

  // 4. Leave the community
  await page.getByTestId("register-member-button").click();
  await metamask.confirmTransactionAndWaitForMining();

  // Additional test steps can be added here, such as:
  // - Sending transactions
  // - Interacting with smart contracts
  // - Testing dapp-specific functionality
});

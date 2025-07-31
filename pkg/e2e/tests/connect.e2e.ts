import { testWithSynpress } from "@synthetixio/synpress";
import {
  getExtensionId,
  MetaMask,
  metaMaskFixtures
} from "@synthetixio/synpress/playwright";
import basicSetup from "../test/wallet-setup/basic.setup";
import { BrowserContext, Page } from "@playwright/test";

const test = testWithSynpress(metaMaskFixtures(basicSetup));

const { expect } = test;

async function approveTokenAllowance({
  context,
  page,
  metamask
}: {
  context: BrowserContext;
  page: Page;
  metamask: MetaMask;
}) {
  metamask.approveTokenPermission;
  // Need to wait for Metamask Notification page to exist, does not exist immediately after clicking 'Approve' button.
  // In Synpress source code, they use this logic in every method interacting with the Metamask notification page.
  const extensionId = await getExtensionId(context, "MetaMask");
  const notificationPageUrl = `chrome-extension://${extensionId}/notification.html`;
  while (
    metamask.page
      .context()
      .pages()
      .find((page) => page.url().includes(notificationPageUrl)) === undefined
  ) {
    await page.waitForTimeout(250);
  }
  const notificationPage = metamask.page
    .context()
    .pages()
    .find((page) => page.url().includes(notificationPageUrl)) as Page;
  await notificationPage.waitForLoadState("domcontentloaded", {
    timeout: 10000
  });
  await notificationPage.waitForLoadState("networkidle", {
    timeout: 10000
  });
  await metamask.page.reload();
  // Unsure if commented out below are required to mitigate flakiness
  // await metamask.page.waitForLoadState("domcontentloaded", { timeout: PAGE_TIMEOUT });
  // await metamask.page.waitForLoadState("networkidle", { timeout: PAGE_TIMEOUT });
  const nextBtn = metamask.page.getByRole("button", {
    name: "Next",
    exact: true
  });
  // Unsure if commented out below are required to mitigate flakiness
  // await expect(nextBtn).toBeVisible();
  // await expect(nextBtn).toBeEnabled();
  await nextBtn.click();
  const approveMMBtn = metamask.page.getByRole("button", {
    name: "Approve",
    exact: true
  });
  await approveMMBtn.click();
}

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
  // await metamask.approveTokenPermission({
  //   spendLimit: "max"
  // });
  await approveTokenAllowance({
    context,
    page,
    metamask
  });
  // Wait for next tx to launch
  await page.waitForTimeout(1000);

  // Wait for join tx waiting for signature
  await page.getByText("Waiting for signature").isVisible({
    timeout: 10000
  });

  // 3. Join the community
  await metamask.confirmTransactionAndWaitForMining();

  // Close the modal
  await page.keyboard.press("Escape");

  // 4. Leave the community
  await page.getByTestId("register-member-button").getByText("Leave").click();
  await page.getByTestId("register-member-button").click();
  await metamask.confirmTransactionAndWaitForMining();
});

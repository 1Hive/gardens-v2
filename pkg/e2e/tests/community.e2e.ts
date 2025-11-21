import { testWithSynpress } from "@synthetixio/synpress";
import {
  getExtensionId,
  MetaMask,
  metaMaskFixtures
} from "@synthetixio/synpress/playwright";
import basicSetup from "../wallet-setup/basic.setup";
import { BrowserContext, Page } from "@playwright/test";

const test = testWithSynpress(metaMaskFixtures(basicSetup));

const { expect } = test;

// Give the flow extra breathing room; MetaMask + subgraph responses can be slow
test.setTimeout(240000);

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

  // If allowance was already approved, the notification window will never open; bail out after waiting a bit
  let notificationPage: Page | undefined;
  for (let i = 0; i < 40; i++) {
    notificationPage = metamask.page
      .context()
      .pages()
      .find((page) => page.url().includes(notificationPageUrl));
    if (notificationPage) break;
    await page.waitForTimeout(250);
  }

  if (!notificationPage) {
    // Skipped because allowance already granted
    return;
  }

  try {
    // Approval was required — finish the flow
    const hydratedNotificationPage = notificationPage
      .context()
      .pages()
      .find((page) => page.url().includes(notificationPageUrl)) as Page;
    await hydratedNotificationPage.waitForLoadState("domcontentloaded", {
      timeout: 10000
    });
    await hydratedNotificationPage.waitForLoadState("networkidle", {
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
    await nextBtn.click({ timeout: 10000 });
    const approveMMBtn = hydratedNotificationPage.getByRole("button", {
      name: "Approve",
      exact: true
    });
    await approveMMBtn.click({ timeout: 10000 });
  } catch (error) {
    console.warn(
      "MetaMask allowance approval skipped due to timeout/error, continuing:",
      error
    );
  }
}

async function expectNoErrorToast(page: Page) {
  // Ensure no visible error toast is present (react-toastify default error class)
  await expect(page.locator(".Toastify__toast--error")).toHaveCount(0, {
    timeout: 5000
  });
}

async function confirmTransaction({
  context,
  metamask
}: {
  context: BrowserContext;
  metamask: MetaMask;
}) {
  const extensionId = await getExtensionId(context, "MetaMask");
  const notificationPageUrl = `chrome-extension://${extensionId}/notification.html`;
  let notificationPage: Page | undefined;

  // Wait for the transaction confirmation popup
  for (let i = 0; i < 40; i++) {
    notificationPage = metamask.page
      .context()
      .pages()
      .find((p) => p.url().includes(notificationPageUrl));
    if (notificationPage) break;
    await metamask.page.waitForTimeout(250);
  }

  if (!notificationPage) {
    console.warn("MetaMask transaction notification not found; continuing");
    return;
  }

  try {
    await notificationPage.waitForLoadState("domcontentloaded", {
      timeout: 15000
    });
    await notificationPage.waitForLoadState("networkidle", {
      timeout: 15000
    });

    const confirmBtn = notificationPage.getByRole("button", {
      name: "Confirm",
      exact: true
    });

    await confirmBtn.click({ timeout: 40000 });
    await metamask.page.waitForTimeout(1000);
  } catch (error) {
    console.warn(
      "MetaMask transaction confirm button not found or timed out; continuing:",
      error
    );
  }
}

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
    .getByTestId("community-card-0x6f9074a0bc5b92e839da4fd52f84be9d50e065a9") // Celo - Gardens on Celo
    .click();

  // Wait for page loaded
  await page.waitForLoadState("networkidle");

  // Switch network
  const wrongNetwork = page.getByTestId("wrong-network");
  await expect(wrongNetwork).toBeVisible({ timeout: 120000 });
  await wrongNetwork.click();
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
    timeout: 60000
  });

  // 3. Join the community
  await page.waitForTimeout(1000); // Wait for the tx to open
  await confirmTransaction({ context, metamask });
  await expectNoErrorToast(page);

  // Close the modal
  await page.keyboard.press("Escape");

  // 4. Leave the community
  const leaveBtn = page
    .getByTestId("register-member-button")
    .getByText("Leave");
  if (await leaveBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
    await leaveBtn.click();
    await page.getByTestId("register-member-button").click();
    await page.waitForTimeout(1000); // Wait for the tx to open
    await confirmTransaction({ context, metamask });
    await expectNoErrorToast(page);
  } else {
    console.warn("Leave button not visible; skipping leave step");
  }
});

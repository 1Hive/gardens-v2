import { testWithSynpress } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";
import { metaMaskFixtures } from "./support/metaMaskFixtures";
import basicSetup from "../wallet-setup/basic.setup";
import { Page } from "@playwright/test";

const test = testWithSynpress(metaMaskFixtures(basicSetup));

const { expect } = test;

// Give the flow extra breathing room; MetaMask + subgraph responses can be slow
test.setTimeout(240000);

async function approveTokenAllowance({
  page,
  metamask,
  extensionId
}: {
  page: Page;
  metamask: MetaMask;
  extensionId: string;
}) {
  metamask.approveTokenPermission;
  // Need to wait for Metamask Notification page to exist, does not exist immediately after clicking 'Approve' button.
  // In Synpress source code, they use this logic in every method interacting with the Metamask notification page.
  const notificationPageUrl = `chrome-extension://${extensionId}/notification.html`;

  const findNotificationPage = () =>
    metamask.page
      .context()
      .pages()
      .find((notification) => notification.url().includes(notificationPageUrl));

  const waitForNotificationPage = async () => {
    for (let i = 0; i < 40; i++) {
      const notification = findNotificationPage();
      if (notification) {
        return notification;
      }
      await page.waitForTimeout(250);
    }

    return undefined;
  };

  const clickWhenVisible = async (
    label: string,
    locatorFactory: (target: Page) => ReturnType<Page["locator"]>
  ) => {
    for (let i = 0; i < 60; i++) {
      const targetPage = findNotificationPage();
      if (!targetPage) {
        await page.waitForTimeout(250);
        continue;
      }

      try {
        const locator = locatorFactory(targetPage);
        if (await locator.isVisible().catch(() => false)) {
          await locator.first().click({ timeout: 10000 });
          return;
        }
      } catch {
        await page.waitForTimeout(250);
        continue;
      }

      await page.waitForTimeout(250);
    }

    throw new Error(`MetaMask allowance ${label} button not found.`);
  };

  // Approval was required — finish the flow
  const hydratedNotificationPage = await waitForNotificationPage();
  if (!hydratedNotificationPage) {
    return;
  }
  await hydratedNotificationPage.waitForLoadState("domcontentloaded", {
    timeout: 10000
  });
  await hydratedNotificationPage.waitForLoadState("networkidle", {
    timeout: 10000
  });

  const hasAllowanceField = await (async () => {
    for (let i = 0; i < 20; i++) {
      const targetPage = findNotificationPage();
      if (!targetPage) {
        await page.waitForTimeout(250);
        continue;
      }

      try {
        const allowanceInput = targetPage.getByTestId(
          "custom-spending-cap-input"
        );
        const maxButton = targetPage.getByTestId(
          "custom-spending-cap-max-button"
        );
        if (
          (await allowanceInput.isVisible().catch(() => false)) ||
          (await maxButton.isVisible().catch(() => false))
        ) {
          return true;
        }
      } catch {
        await page.waitForTimeout(250);
        continue;
      }

      await page.waitForTimeout(250);
    }

    return false;
  })();

  if (!hasAllowanceField) {
    console.warn(
      "MetaMask allowance already approved; skipping allowance step."
    );
    return;
  }

  await clickWhenVisible("Next", (targetPage) =>
    targetPage.locator(
      '[data-testid="page-container-footer-next"], button:has-text("Next")'
    )
  );

  await clickWhenVisible("Approve", (targetPage) =>
    targetPage.locator('button:has-text("Approve"), button:has-text("Confirm")')
  );
}

async function expectNoErrorToast(page: Page) {
  // Ensure no visible error toast is present (react-toastify default error class)
  await expect(page.locator(".Toastify__toast--error")).toHaveCount(0, {
    timeout: 5000
  });
}

async function confirmTransaction({
  metamask,
  extensionId
}: {
  metamask: MetaMask;
  extensionId: string;
}) {
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
    .getByTestId("community-card-0x9ee73d7afd1d75d9d3468ab7845150180936dec4") // Opt - 🧪 End-to-End Test Playground
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

  // 4. Leave the community
  const leaveBtn = page
    .getByTestId("register-member-button")
    .getByText("Leave");
  if (await leaveBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
    await leaveBtn.click();
    await page.waitForTimeout(1000); // Wait for the tx to open
    await confirmTransaction({ metamask, extensionId });
    await expectNoErrorToast(page);
  } else {
    throw new Error("Leave button not visible; cannot complete leave flow.");
  }
});

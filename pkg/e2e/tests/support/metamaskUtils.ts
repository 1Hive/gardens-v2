import { MetaMask } from "@synthetixio/synpress/playwright";
import { expect, Page } from "@playwright/test";

const OP_MAINNET = {
  name: "OP Mainnet",
  rpcUrl: "https://mainnet.optimism.io",
  chainId: 10,
  symbol: "ETH",
  blockExplorerUrl: "https://optimistic.etherscan.io"
};

const OP_MAINNET_CHAIN_ID_HEX = "0xa";

async function dismissWalletPopovers(walletPage: Page) {
  const closeSelectors = [
    '[data-testid="popover-close"]',
    'button[aria-label="Close"]'
  ];

  for (let i = 0; i < 6; i++) {
    let clicked = false;

    for (const selector of closeSelectors) {
      const button = walletPage.locator(selector).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click({ timeout: 1000 }).catch(() => {});
        clicked = true;
      }
    }

    await walletPage.keyboard.press("Escape").catch(() => {});
    await walletPage.waitForTimeout(250);

    if (!clicked) {
      return;
    }
  }
}

async function ensureOptimismNetwork(page: Page, metamask: MetaMask) {
  const chainId = await page.evaluate(async () => {
    const provider = (window as any).ethereum;
    if (!provider) {
      throw new Error("Missing injected ethereum provider");
    }

    return (await provider.request({ method: "eth_chainId" })) as string;
  });

  if (chainId.toLowerCase() === OP_MAINNET_CHAIN_ID_HEX) {
    return;
  }

  const maxSwitchAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxSwitchAttempts; attempt++) {
    try {
      await dismissWalletPopovers(metamask.page);

      try {
        await metamask.switchNetwork(OP_MAINNET.name);
      } catch {
        await dismissWalletPopovers(metamask.page);
        await metamask.addNetwork(OP_MAINNET);
        await dismissWalletPopovers(metamask.page);
        await metamask.switchNetwork(OP_MAINNET.name);
      }

      const switchedChainId = await page.evaluate(async () => {
        const provider = (window as any).ethereum;
        return (await provider.request({ method: "eth_chainId" })) as string;
      });

      if (switchedChainId.toLowerCase() !== OP_MAINNET_CHAIN_ID_HEX) {
        throw new Error(
          `Switch reported success but chainId is ${switchedChainId}`
        );
      }

      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      if (attempt === maxSwitchAttempts) {
        throw error;
      }

      console.warn(
        `[connectWallet] Network switch failed on attempt ${attempt}/${maxSwitchAttempts}, retrying...`
      );
      await page.waitForTimeout(1500);
    }
  }

  if (lastError) {
    throw lastError;
  }
}

export async function approveTokenAllowance({
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
  const waitForLoadState = async (
    targetPage: Page,
    state: Parameters<Page["waitForLoadState"]>[0]
  ) => {
    if (targetPage.isClosed()) {
      return false;
    }

    try {
      await targetPage.waitForLoadState(state, { timeout: 10000 });
      return true;
    } catch (error) {
      if (targetPage.isClosed()) {
        return false;
      }

      throw error;
    }
  };

  const domReady = await waitForLoadState(
    hydratedNotificationPage,
    "domcontentloaded"
  );
  if (!domReady) {
    return;
  }

  const networkReady = await waitForLoadState(
    hydratedNotificationPage,
    "networkidle"
  );
  if (!networkReady) {
    return;
  }

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

export async function expectNoErrorToast(page: Page) {
  // Ensure no visible error toast is present (react-toastify default error class)
  await expect(page.locator(".Toastify__toast--error")).toHaveCount(0, {
    timeout: 5000
  });
}

export async function confirmTransaction({
  metamask,
  extensionId
}: {
  metamask: MetaMask;
  extensionId: string;
}) {
  const notificationPageUrl = `chrome-extension://${extensionId}/notification.html`;
  let notificationPage: Page | undefined;
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // Wait for the transaction confirmation popup
  for (let i = 0; i < 40; i++) {
    notificationPage = metamask.page
      .context()
      .pages()
      .find((p) => p.url().includes(notificationPageUrl));
    if (notificationPage) break;
    await sleep(250);
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

export async function connectWallet(page: Page, metamask: MetaMask) {
  await page.getByTestId("connectButton").click();
  await page.getByTestId("rk-wallet-option-injected").click();
  const maxConnectAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxConnectAttempts; attempt++) {
    try {
      await metamask.connectToDapp();
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      if (attempt === maxConnectAttempts) {
        throw error;
      }

      console.warn(
        `[connectWallet] MetaMask connectToDapp failed on attempt ${attempt}/${maxConnectAttempts}, retrying...`
      );
      await page.waitForTimeout(1500);
    }
  }

  if (lastError) {
    throw lastError;
  }

  // Verify the connected account address
  await expect(page.locator("[data-testid='accounts']")).toHaveText(
    "0x327F…7394"
  );

  // E2E flows run on Optimism; switch MetaMask network if needed.
  await ensureOptimismNetwork(page, metamask);
}

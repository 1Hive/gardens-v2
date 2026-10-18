import type { MetaMask } from "@synthetixio/synpress/playwright";
import type { Page } from "@playwright/test";

export async function confirmTransaction({
  metamask,
  extensionId,
  timeout = 180000,
}: {
  metamask: MetaMask;
  extensionId: string;
  timeout?: number;
}) {
  const extensionOrigin = `chrome-extension://${extensionId}`;
  const deadline = Date.now() + timeout;
  let notificationPage: Page | undefined;
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  const confirmSelectors = [
    '[data-testid="confirm-footer-button"]',
    'button:has-text("Confirm")',
    'button:has-text("Sign")',
    'button:has-text("Submit")',
  ];
  const nextSelectors = [
    '[data-testid="page-container-footer-next"]',
    'button:has-text("Next")',
    'button:has-text("Continue")',
  ];
  const gasWarningBypassSelectors = [
    'button:has-text("I want to proceed anyway")',
    'a:has-text("I want to proceed anyway")',
    'text="I want to proceed anyway"',
  ];
  const transactionButtonSelectors = [
    ...confirmSelectors,
    ...nextSelectors,
    ...gasWarningBypassSelectors,
  ];
  const findExtensionPages = () =>
    metamask.page
      .context()
      .pages()
      .filter((p) => !p.isClosed() && p.url().startsWith(extensionOrigin));

  const findTransactionPage = async () => {
    const pages = findExtensionPages().reverse();
    // A connection popup can still exist after connectToDapp returns. Only
    // accept a page once transaction controls have actually rendered.
    for (const page of pages) {
      for (const selector of transactionButtonSelectors) {
        const visible = await page
          .locator(selector)
          .first()
          .isVisible({ timeout: 100 })
          .catch(() => false);
        if (visible) {
          return page;
        }
      }
    }

    return undefined;
  };

  // RPC preflight/fallback runs before MetaMask receives the request and can
  // outlast the old 30-second polling loop. Share one bounded deadline across
  // prompt readiness and confirmation, including replacement popup pages.
  while (Date.now() < deadline) {
    notificationPage = await findTransactionPage();
    if (notificationPage) break;
    await sleep(250);
  }

  if (!notificationPage) {
    throw new Error(
      `MetaMask transaction controls did not appear within ${timeout}ms`,
    );
  }

  await notificationPage.waitForLoadState("domcontentloaded", {
    timeout: 15000,
  });
  await notificationPage.bringToFront().catch(() => {});

  const scrollConfirmView = async () => {
    // Legacy MetaMask keeps Confirm in a scrollable pane.
    // Avoid `page.evaluate` because LavaMoat blocks direct global access.
    await notificationPage?.mouse.wheel(0, 1200).catch(() => {});
    await notificationPage?.keyboard.press("PageDown").catch(() => {});
    await notificationPage?.keyboard.press("End").catch(() => {});
  };

  let clicked = false;
  const isTransactionClosed = async () => !(await findTransactionPage());

  while (Date.now() < deadline) {
    const latestNotificationPage = await findTransactionPage();
    if (!latestNotificationPage) {
      await sleep(250);
      continue;
    }
    notificationPage = latestNotificationPage;
    await notificationPage.bringToFront().catch(() => {});

    await scrollConfirmView();

    let bypassedGasWarning = false;
    for (const selector of gasWarningBypassSelectors) {
      const button = notificationPage.locator(selector).first();
      const visible = await button.isVisible().catch(() => false);
      if (!visible) {
        continue;
      }

      const enabled = await button.isEnabled().catch(() => true);
      if (!enabled) {
        continue;
      }

      await button.scrollIntoViewIfNeeded().catch(() => {});
      try {
        await button.click({ timeout: 5000 });
        await sleep(1000);
        bypassedGasWarning = true;
        break;
      } catch {
        // A warning can close/recreate the popup. Reacquire it; that is not
        // evidence that the transaction itself was confirmed.
      }
    }

    if (bypassedGasWarning) {
      continue;
    }

    for (const selector of confirmSelectors) {
      const button = notificationPage.locator(selector).first();
      const visible = await button.isVisible().catch(() => false);
      if (!visible) {
        continue;
      }

      const enabled = await button.isEnabled().catch(() => false);
      if (!enabled) {
        continue;
      }

      await button.scrollIntoViewIfNeeded().catch(() => {});
      try {
        await button.click({ timeout: 5000 });
        clicked = true;
        break;
      } catch {
        if (await isTransactionClosed()) {
          clicked = true;
          break;
        }
        try {
          await button.click({ timeout: 5000, force: true });
          clicked = true;
          break;
        } catch {
          if (await isTransactionClosed()) {
            clicked = true;
            break;
          }
        }
      }
    }

    if (clicked) {
      break;
    }

    for (const selector of nextSelectors) {
      const button = notificationPage.locator(selector).first();
      const visible = await button.isVisible().catch(() => false);
      if (!visible) {
        continue;
      }

      const enabled = await button.isEnabled().catch(() => false);
      if (!enabled) {
        continue;
      }

      await button.scrollIntoViewIfNeeded().catch(() => {});
      try {
        await button.click({ timeout: 5000 });
        await sleep(1500);
        break;
      } catch {
        // Next/Continue may replace the popup. Only a final confirmation
        // click can complete this helper.
      }
    }

    await sleep(250);
  }

  if (!clicked) {
    throw new Error(
      `MetaMask Confirm button was not clickable within ${timeout}ms`,
    );
  }

  await metamask.page.waitForTimeout(1000);
}

import { expect, test, type Page } from "@playwright/test";
import type { MetaMask } from "@synthetixio/synpress/playwright";
import { confirmTransaction } from "../utils/confirmTransaction";

const extensionId = "test-wallet";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Use real browser locators/clicks with simulated extension URLs. These tests
// need neither a funded wallet nor access to RPC, IPFS, or the subgraph.
function walletHarness(homePage: Page) {
  const pages: Page[] = [];
  const addPage = (page: Page, path: string) => {
    const walletPage = new Proxy(page, {
      get(target, key) {
        if (key === "url") {
          return () => `chrome-extension://${extensionId}/${path}`;
        }
        if (key === "context") return () => ({ pages: () => pages });
        const value = Reflect.get(target, key);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    pages.push(walletPage);
    return walletPage;
  };
  const metamask = { page: addPage(homePage, "home.html") } as MetaMask;
  return { metamask, addPage };
}

test("waits beyond 30 seconds for RPC preflight and ignores a stale connection popup", async ({
  page,
  context,
}) => {
  const { metamask, addPage } = walletHarness(page);
  const stalePopup = await context.newPage();
  addPage(stalePopup, "notification.html");
  await stalePopup.setContent("<p>Connection complete</p>");

  const showTransaction = async () => {
    await sleep(100);
    await stalePopup.close();
    await sleep(31000);
    const popup = await context.newPage();
    addPage(popup, "notification.html");
    await popup.setContent(
      '<button data-testid="confirm-footer-button" onclick="this.textContent=\'Confirmed\'">Confirm</button>',
    );
    return popup;
  };

  const [, popup] = await Promise.all([
    confirmTransaction({ metamask, extensionId }),
    showTransaction(),
  ]);
  await expect(
    popup.getByRole("button", { name: "Confirmed", exact: true }),
  ).toBeVisible();
});

test("waits for a disabled confirmation button to become enabled", async ({
  page,
}) => {
  const { metamask } = walletHarness(page);
  await page.setContent(
    '<button disabled data-testid="confirm-footer-button" onclick="this.textContent=\'Confirmed\'">Confirm</button>',
  );
  await Promise.all([
    confirmTransaction({ metamask, extensionId, timeout: 5000 }),
    (async () => {
      await sleep(500);
      await expect(
        page.getByRole("button", { name: "Confirm", exact: true }),
      ).toBeDisabled();
      await page.getByRole("button").evaluate((button: HTMLButtonElement) => {
        button.disabled = false;
      });
    })(),
  ]);
  await expect(
    page.getByRole("button", { name: "Confirmed", exact: true }),
  ).toBeVisible();
});

test("does not count a disappearing Next popup as transaction confirmation", async ({
  page,
  context,
}) => {
  const { metamask, addPage } = walletHarness(page);
  const nextPopup = await context.newPage();
  addPage(nextPopup, "notification.html");
  await nextPopup.setContent('<button onclick="this.remove()">Next</button>');
  let confirmed = false;
  const confirmation = confirmTransaction({
    metamask,
    extensionId,
    timeout: 10000,
  }).then(() => {
    confirmed = true;
  });
  await expect(nextPopup.getByRole("button", { name: "Next" })).toHaveCount(0);
  await nextPopup.close();
  await sleep(3000);
  expect(confirmed).toBe(false);

  const confirmPopup = await context.newPage();
  addPage(confirmPopup, "notification.html");
  await confirmPopup.setContent(
    "<button onclick=\"this.textContent='Confirmed'\">Confirm</button>",
  );
  await confirmation;
  await expect(
    confirmPopup.getByRole("button", { name: "Confirmed", exact: true }),
  ).toBeVisible();
});

test("fails when only a stale notification exists", async ({
  page,
  context,
}) => {
  const { metamask, addPage } = walletHarness(page);
  const popup = await context.newPage();
  addPage(popup, "notification.html");
  await popup.setContent("<p>No pending transaction</p>");
  await expect(
    confirmTransaction({ metamask, extensionId, timeout: 500 }),
  ).rejects.toThrow(
    "MetaMask transaction controls did not appear within 500ms",
  );
});

import "dotenv/config";
import { defineWalletSetup } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";

const SEED_PHRASE = process.env.E2E_WALLET_SEED_PHRASE;
const PASSWORD = "Tester@1234";
const RETRIES = 3;

const OP_MAINNET = {
  name: "OP Mainnet",
  rpcUrl: "https://mainnet.optimism.io",
  chainId: 10,
  symbol: "ETH",
  blockExplorerUrl: "https://optimistic.etherscan.io"
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function dismissTransientPopovers(walletPage: any) {
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
    await sleep(250);

    if (!clicked) {
      return;
    }
  }
}

async function withRetry(taskName: string, task: () => Promise<void>) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      await task();
      return;
    } catch (error) {
      lastError = error;
      if (attempt === RETRIES) {
        throw error;
      }
      console.warn(
        `[wallet-setup] ${taskName} failed on attempt ${attempt}/${RETRIES}, retrying...`
      );
      await sleep(1500);
    }
  }

  throw lastError;
}

export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
  if (!SEED_PHRASE) {
    throw new Error("E2E_WALLET_SEED_PHRASE environment variable is not set");
  }

  const metamask = new MetaMask(context, walletPage, PASSWORD);

  await withRetry("importWallet", async () => {
    await metamask.importWallet(SEED_PHRASE);
  });

  await dismissTransientPopovers(walletPage);

  // Keep network preconfiguration in cache so tests don't repeat this step.
  // Best effort only: intermittent MetaMask overlays can block this click path in CI.
  try {
    await withRetry("switchNetwork(OP Mainnet)", async () => {
      await dismissTransientPopovers(walletPage);
      try {
        await metamask.switchNetwork(OP_MAINNET.name);
        return;
      } catch {
        // If network does not exist yet, add it then switch.
      }

      await dismissTransientPopovers(walletPage);
      await metamask.addNetwork(OP_MAINNET);
      await dismissTransientPopovers(walletPage);
      await metamask.switchNetwork(OP_MAINNET.name);
    });
  } catch (error) {
    console.warn(
      `[wallet-setup] Unable to pre-switch to ${OP_MAINNET.name}; continuing without preconfiguration.`,
      error
    );
  }
});

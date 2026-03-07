import { MetaMask } from "@synthetixio/synpress/playwright";

const SEED_PHRASE = process.env.E2E_WALLET_SEED_PHRASE;
const RETRIES = 3;
// Enabled by default so the cached wallet profile already has OP Mainnet selected.
// Set E2E_PRECONFIGURE_OP_MAINNET=false to skip during troubleshooting.
const SHOULD_PRECONFIGURE_OP_MAINNET = process.env.E2E_PRECONFIGURE_OP_MAINNET !== "false";
const OPTIMISM_RPC_URL = process.env.RPC_URL_OPTIMISM?.trim() || "https://mainnet.optimism.io";

const OP_MAINNET = {
  name: "OP Mainnet",
  rpcUrl: OPTIMISM_RPC_URL,
  chainId: 10,
  symbol: "ETH",
  blockExplorerUrl: "https://optimistic.etherscan.io"
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function clickFirstVisible(walletPage: any, selectors: string[], timeout = 1500) {
  for (const selector of selectors) {
    const locator = walletPage.locator(selector).first();
    const isVisible = await locator.isVisible().catch(() => false);
    if (!isVisible) {
      continue;
    }
    await locator.click({ timeout }).catch(() => {});
    return true;
  }
  return false;
}

async function waitAndClickFirstVisible(
  walletPage: any,
  selectors: string[],
  waitMs: number,
  clickTimeout = 2000
) {
  const startTime = Date.now();
  while (Date.now() - startTime < waitMs) {
    const clicked = await clickFirstVisible(walletPage, selectors, clickTimeout);
    if (clicked) {
      return true;
    }
    await sleep(250);
  }

  return false;
}

async function fillFirstVisibleInput(walletPage: any, selectors: string[], value: string) {
  for (const selector of selectors) {
    const locator = walletPage.locator(selector).first();
    const isVisible = await locator.isVisible().catch(() => false);
    if (!isVisible) {
      continue;
    }
    await locator.fill(value, { timeout: 2000 }).catch(() => {});
    return true;
  }
  return false;
}

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

async function importWalletLegacyOnboarding(walletPage: any, seedPhrase: string, password: string) {
  await clickFirstVisible(walletPage, ['[data-testid="onboarding-terms-checkbox"]'], 2000);
  await clickFirstVisible(walletPage, ['[data-testid="onboarding-import-wallet"]'], 3000);
  await clickFirstVisible(walletPage, ['[data-testid="metametrics-no-thanks"]'], 2000);

  const words = seedPhrase.trim().split(/\s+/);
  const wordsDropdown = walletPage
    .locator(".import-srp__number-of-words-dropdown > .dropdown__select")
    .first();
  if (await wordsDropdown.isVisible().catch(() => false)) {
    await wordsDropdown.selectOption(String(words.length)).catch(() => {});
  }

  for (const [index, word] of words.entries()) {
    const filled = await fillFirstVisibleInput(
      walletPage,
      [
        `[data-testid="import-srp__srp-word-${index}"]`,
        `input[placeholder="${index + 1}."]`
      ],
      word
    );

    if (!filled) {
      throw new Error(`Could not fill seed phrase word #${index + 1}`);
    }
  }

  const confirmSeedClicked = await clickFirstVisible(walletPage, ['[data-testid="import-srp-confirm"]'], 3000);
  if (!confirmSeedClicked) {
    throw new Error("Could not confirm seed phrase in legacy onboarding");
  }

  const passwordFilled = await fillFirstVisibleInput(walletPage, ['[data-testid="create-password-new"]'], password);
  const confirmPasswordFilled = await fillFirstVisibleInput(
    walletPage,
    ['[data-testid="create-password-confirm"]'],
    password
  );
  if (!passwordFilled || !confirmPasswordFilled) {
    throw new Error("Could not fill password fields in legacy onboarding");
  }

  await clickFirstVisible(walletPage, ['[data-testid="create-password-terms"]'], 2000);
  const importClicked = await clickFirstVisible(walletPage, ['[data-testid="create-password-import"]'], 3000);
  if (!importClicked) {
    throw new Error("Could not submit password form in legacy onboarding");
  }

  const gotItClicked = await waitAndClickFirstVisible(
    walletPage,
    [
      '[data-testid="onboarding-complete-done"]',
      'button:has-text("Got it!")',
      'button:has-text("Got it")'
    ],
    20000
  );
  if (!gotItClicked) {
    throw new Error("Could not confirm wallet creation success screen");
  }

  await walletPage.waitForLoadState("domcontentloaded").catch(() => {});
  await sleep(500);

  const nextClicked = await waitAndClickFirstVisible(
    walletPage,
    ['[data-testid="pin-extension-next"]', 'button:has-text("Next")'],
    15000
  );
  if (!nextClicked) {
    throw new Error("Could not click pin-extension Next after wallet import");
  }

  const doneClicked = await waitAndClickFirstVisible(
    walletPage,
    ['[data-testid="pin-extension-done"]', 'button:has-text("Done")'],
    15000
  );
  if (!doneClicked) {
    throw new Error("Could not click pin-extension Done after wallet import");
  }
}

async function importWalletWithCompatibility(
  walletPage: any,
  metamask: any,
  seedPhrase: string,
  password: string
) {
  try {
    await importWalletLegacyOnboarding(walletPage, seedPhrase, password);
    return;
  } catch (legacyError) {
    console.warn("[wallet-setup] Legacy onboarding flow failed, trying Synpress import flow.", legacyError);
  }

  await metamask.importWallet(seedPhrase);
}

async function openWalletFromReadyScreen(walletPage: any) {
  const clicked = await clickFirstVisible(
    walletPage,
    [
      '[data-testid="onboarding-complete-done"]',
      'button:has-text("Open wallet")',
      'button:has-text("Open Wallet")'
    ],
    3000
  );

  if (!clicked) {
    return;
  }

  await walletPage.waitForLoadState("domcontentloaded").catch(() => {});
  await sleep(600);
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

async function fallbackAddAndSwitchNetwork(walletPage: any, metamask: any) {
  const currentUrl = walletPage.url();
  if (!currentUrl.startsWith("chrome-extension://")) {
    throw new Error(`Wallet page is not an extension page: ${currentUrl}`);
  }

  const extensionOrigin = new URL(currentUrl).origin;
  await walletPage.goto(`${extensionOrigin}/home.html#settings/networks/add-network`);
  await walletPage.waitForLoadState("domcontentloaded");
  await dismissTransientPopovers(walletPage);

  const networkNameFilled = await fillFirstVisibleInput(
    walletPage,
    [
      ".networks-tab__add-network-form .form-field:nth-child(1) input",
      'input[name="networkName"]',
      '[data-testid="network-form-network-name"] input'
    ],
    OP_MAINNET.name
  );
  const rpcFilled = await fillFirstVisibleInput(
    walletPage,
    [
      ".networks-tab__add-network-form .form-field:nth-child(2) input",
      'input[name="rpcUrl"]',
      '[data-testid="network-form-rpc-url"] input'
    ],
    OP_MAINNET.rpcUrl
  );
  const chainIdFilled = await fillFirstVisibleInput(
    walletPage,
    [
      ".networks-tab__add-network-form .form-field:nth-child(3) input",
      'input[name="chainId"]',
      '[data-testid="network-form-chain-id"] input'
    ],
    String(OP_MAINNET.chainId)
  );
  const symbolFilled = await fillFirstVisibleInput(
    walletPage,
    [
      ".networks-tab__add-network-form .form-field:nth-child(4) input",
      'input[name="ticker"]',
      '[data-testid="network-form-symbol"] input'
    ],
    OP_MAINNET.symbol
  );

  if (!networkNameFilled || !rpcFilled || !chainIdFilled || !symbolFilled) {
    throw new Error("Could not locate one or more network form inputs in MetaMask");
  }

  await fillFirstVisibleInput(
    walletPage,
    [
      ".networks-tab__add-network-form .form-field:last-child input",
      'input[name="blockExplorerUrl"]',
      '[data-testid="network-form-block-explorer-url"] input'
    ],
    OP_MAINNET.blockExplorerUrl
  );

  const saveClicked = await clickFirstVisible(walletPage, [
    ".networks-tab__add-network-form-footer button.btn-primary",
    '[data-testid="network-form-save"]',
    'button[type="submit"]'
  ]);

  if (!saveClicked) {
    throw new Error("Could not find network save button in MetaMask");
  }

  await sleep(1000);
  await dismissTransientPopovers(walletPage);
  await walletPage.goto(`${extensionOrigin}/home.html`);
  await walletPage.waitForLoadState("domcontentloaded");
  await dismissTransientPopovers(walletPage);
  await clickFirstVisible(walletPage, [".home__new-network-added__switch-to-button"], 1000);

  await metamask.switchNetwork(OP_MAINNET.name);
}

export async function runBasicWalletSetup(context: any, walletPage: any, password: string) {
  if (!SEED_PHRASE) {
    throw new Error("E2E_WALLET_SEED_PHRASE environment variable is not set");
  }

  const metamask = new MetaMask(context, walletPage, password);

  await withRetry("importWallet", async () => {
    await importWalletWithCompatibility(walletPage, metamask, SEED_PHRASE, password);
  });

  // Newer MetaMask onboarding can stop on "Your wallet is ready!" and block
  // network actions until the user confirms by opening the wallet home.
  await withRetry("openWalletFromReadyScreen", async () => {
    await openWalletFromReadyScreen(walletPage);
  });

  await dismissTransientPopovers(walletPage);

  // Network preconfiguration is optional because Synpress network selectors can
  // drift with newer MetaMask UI versions and introduce long flaky retries.
  if (!SHOULD_PRECONFIGURE_OP_MAINNET) {
    return;
  }

  try {
    await withRetry("switchNetwork(OP Mainnet)", async () => {
      await dismissTransientPopovers(walletPage);
      try {
        await metamask.switchNetwork(OP_MAINNET.name);
        return;
      } catch {
      }

      await dismissTransientPopovers(walletPage);
      try {
        await metamask.addNetwork(OP_MAINNET);
      } catch {
        await fallbackAddAndSwitchNetwork(walletPage, metamask);
        return;
      }
      await dismissTransientPopovers(walletPage);
      await metamask.switchNetwork(OP_MAINNET.name);
    });
  } catch (error) {
    console.warn(
      `[wallet-setup] Unable to pre-switch to ${OP_MAINNET.name}; continuing without preconfiguration.`,
      error
    );
  }
}

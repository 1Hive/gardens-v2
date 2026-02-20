import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { chromium, test as base, type Page } from "@playwright/test";
import { MetaMask, unlockForFixture } from "@synthetixio/synpress/playwright";

type MetaMaskFixtures = {
  _contextPath: string;
  metamask: MetaMask;
  extensionId: string;
  metamaskPage: Page;
};

type WalletSetup = {
  walletPassword: string;
  hash: string;
};

const DEFAULT_METAMASK_VERSION = "11.9.1";
const CACHE_DIR_NAME = ".cache-synpress";

const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;
const browserExecutablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
const defaultChromiumPath = path.join(
  os.homedir(),
  ".cache",
  "ms-playwright",
  "chromium-1140",
  "chrome-linux",
  "chrome"
);

async function persistLocalStorage(
  origins: {
    origin: string;
    localStorage: { name: string; value: string }[];
  }[],
  context: { newPage: () => Promise<Page> }
) {
  const newPage = await context.newPage();

  for (const { origin, localStorage } of origins) {
    const frame = newPage.mainFrame();
    await frame.goto(origin);

    await frame.evaluate((localStorageData) => {
      localStorageData.forEach(({ name, value }) => {
        window.localStorage.setItem(name, value);
      });
    }, localStorage);
  }

  await newPage.close();
}

async function prepareExtension() {
  const extensionDir = path.join(
    process.cwd(),
    CACHE_DIR_NAME,
    `metamask-chrome-${DEFAULT_METAMASK_VERSION}`
  );

  try {
    await fs.access(extensionDir);
  } catch {
    throw new Error(
      `MetaMask extension not found at ${extensionDir}. Run \
"pnpm exec synpress wallet-setup --force" to rebuild the cache.`
    );
  }

  return extensionDir;
}

async function resolveExecutablePath() {
  if (browserExecutablePath) {
    return browserExecutablePath;
  }

  try {
    await fs.access(defaultChromiumPath);
    return defaultChromiumPath;
  } catch {
    return undefined;
  }
}

let cachedMetaMaskPage: Page;
let cachedExtensionId: string;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getExtensionIdFromProfile(contextPath: string, extensionPath: string) {
  const preferencesPath = path.join(contextPath, "Default", "Preferences");

  try {
    const rawPreferences = await fs.readFile(preferencesPath, "utf-8");
    const preferences = JSON.parse(rawPreferences);
    const settings = preferences?.extensions?.settings ?? {};

    for (const [extensionId, details] of Object.entries(settings)) {
      if (details && typeof details === "object" && "path" in details) {
        if ((details as { path?: string }).path === extensionPath) {
          return extensionId;
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function getExtensionIdFromExtensionsPage(context: { newPage: () => Promise<Page> }) {
  const page = await context.newPage();
  try {
    await page.goto("chrome://extensions/");
    await page.waitForTimeout(1000);

    const extensionId = await page.evaluate(() => {
      const manager = document.querySelector("extensions-manager") as HTMLElement | null;
      const items = manager?.shadowRoot?.querySelectorAll("extensions-item") ?? [];

      for (const item of Array.from(items)) {
        const nameEl = item.shadowRoot?.querySelector("#name") as HTMLElement | null;
        const name = nameEl?.textContent?.trim().toLowerCase();
        if (name === "metamask") {
          return item.getAttribute("id") || item.id || null;
        }
      }

      return null;
    });

    return extensionId || null;
  } finally {
    await page.close();
  }
}

async function resolveExtensionId(context: {
  backgroundPages: () => Page[];
  pages: () => Page[];
  serviceWorkers: () => { url: () => string }[];
  newPage: () => Promise<Page>;
}) {
  if (cachedExtensionId) {
    return cachedExtensionId;
  }

  const timeoutMs = 15000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const urls = [
      ...context.backgroundPages().map((page) => page.url()),
      ...context.pages().map((page) => page.url()),
      ...context.serviceWorkers().map((worker) => worker.url())
    ];

    const extensionUrl = urls.find((url) => url.startsWith("chrome-extension://"));
    if (extensionUrl) {
      cachedExtensionId = new URL(extensionUrl).host;
      return cachedExtensionId;
    }

    await sleep(250);
  }

  const domExtensionId = await getExtensionIdFromExtensionsPage(context);
  if (domExtensionId) {
    cachedExtensionId = domExtensionId;
    return cachedExtensionId;
  }

  throw new Error("[resolveExtensionId] MetaMask extension did not load in time.");
}

export const metaMaskFixtures = (walletSetup: WalletSetup, slowMo = 0) => {
  return base.extend<MetaMaskFixtures>({
    _contextPath: async ({ browserName }, use, testInfo) => {
      const contextPath = await fs.mkdtemp(
        path.join(os.tmpdir(), `synpress_${browserName}_${testInfo.testId}_`)
      );

      await use(contextPath);

      try {
        await fs.rm(contextPath, { recursive: true, force: true });
      } catch (error) {
        console.error(error);
      }
    },
    context: async ({ context: currentContext, _contextPath }, use) => {
      const { walletPassword, hash } = walletSetup;

      const cacheDirPath = path.join(process.cwd(), CACHE_DIR_NAME, hash);
      try {
        await fs.access(cacheDirPath);
      } catch {
        throw new Error(`Cache for ${hash} does not exist. Create it first!`);
      }

      await fs.cp(cacheDirPath, _contextPath, { recursive: true });

      const metamaskPath = await prepareExtension();
      cachedExtensionId = (await getExtensionIdFromProfile(_contextPath, metamaskPath)) ?? "";

      const browserArgs = [
        `--disable-extensions-except=${metamaskPath}`,
        `--load-extension=${metamaskPath}`
      ];

      if (process.env.HEADLESS) {
        browserArgs.push("--headless=new");

        if (slowMo > 0) {
          console.warn("[WARNING] Slow motion makes no sense in headless mode. It will be ignored!");
        }
      }

      const executablePath = await resolveExecutablePath();

      const context = await chromium.launchPersistentContext(_contextPath, {
        headless: false,
        args: browserArgs,
        slowMo: process.env.HEADLESS ? 0 : slowMo,
        ignoreDefaultArgs: [
          "--disable-extensions",
          "--disable-component-extensions-with-background-pages"
        ],
        ...(browserChannel ? { channel: browserChannel } : {}),
        ...(executablePath ? { executablePath } : {})
      });

      const { cookies, origins } = await currentContext.storageState();

      if (cookies) {
        await context.addCookies(cookies);
      }
      if (origins && origins.length > 0) {
        await persistLocalStorage(origins, context);
      }

      const extensionId = cachedExtensionId || (await resolveExtensionId(context));

      cachedMetaMaskPage = context.pages()[0] as Page;

      await cachedMetaMaskPage.goto(`chrome-extension://${extensionId}/home.html`);
      await cachedMetaMaskPage.waitForLoadState("domcontentloaded", { timeout: 10000 });
      await cachedMetaMaskPage.waitForLoadState("networkidle", { timeout: 10000 });
      await unlockForFixture(cachedMetaMaskPage, walletPassword);

      await use(context);

      await context.close();
    },
    metamaskPage: async ({ context: _ }, use) => {
      await use(cachedMetaMaskPage);
    },
    extensionId: async ({ context }, use) => {
      const extensionId = await resolveExtensionId(context);

      await use(extensionId);
    },
    metamask: async ({ context, extensionId }, use) => {
      const { walletPassword } = walletSetup;

      const metamask = new MetaMask(context, cachedMetaMaskPage, walletPassword, extensionId);

      await use(metamask);
    },
    page: async ({ page }, use) => {
      await page.goto("/");

      await use(page);
    }
  });
};

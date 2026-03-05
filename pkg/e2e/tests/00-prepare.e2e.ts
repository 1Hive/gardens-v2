import { testWithSynpress } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";
import { metaMaskFixtures } from "./support/metaMaskFixtures";
import basicSetup from "../wallet-setup/basic.setup";
import {
  confirmTransaction,
  connectWallet,
  expectNoErrorToast
} from "./support/metamaskUtils";

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test.setTimeout(240000);

const IS_MEMBER_SELECTOR = "a230c524";
const UNREGISTER_MEMBER_SELECTOR = "b99b4370";

const isAddress = (value: string | undefined): value is `0x${string}` =>
  typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);

const parseBoolResult = (value: string) => {
  const normalized = value.toLowerCase();
  return normalized === "0x1" || normalized.endsWith("1".padStart(64, "0"));
};

const encodeIsMember = (account: `0x${string}`) =>
  `0x${IS_MEMBER_SELECTOR}${account.slice(2).toLowerCase().padStart(64, "0")}`;

test("should ensure wallet is not a member before running e2e flow", async ({
  context,
  page,
  metamaskPage,
  extensionId
}) => {
  const metamask = new MetaMask(
    context,
    metamaskPage,
    basicSetup.walletPassword,
    extensionId
  );

  await page.addInitScript(() => {
    localStorage.setItem("flag_showArchived", "true");
    localStorage.setItem("flag_queryAllChains", "true");
  });

  await page.goto("/", { timeout: 60000 });
  await connectWallet(page, metamask);

  const chainId = await page.evaluate(async () => {
    const provider = (window as any).ethereum;
    if (!provider) {
      throw new Error("Missing injected ethereum provider");
    }
    return (await provider.request({ method: "eth_chainId" })) as string;
  });

  if (chainId.toLowerCase() !== "0xa") {
    throw new Error(`Expected Optimism chainId 0xa, got ${chainId}`);
  }

  const account = await page.evaluate(async () => {
    const provider = (window as any).ethereum;
    const accounts = (await provider.request({
      method: "eth_accounts"
    })) as string[];
    return accounts[0] ?? null;
  });

  if (!isAddress(account)) {
    throw new Error("Connected wallet account is missing or invalid.");
  }

  const communityId = process.env.E2E_COMMUNITY_ID;
  if (!communityId) {
    throw new Error("E2E_COMMUNITY_ID environment variable is not set.");
  }

  const communityCard = page.getByTestId(`community-card-${communityId}`);
  await expect(communityCard).toBeVisible({ timeout: 60000 });

  const targetHref = await communityCard.evaluate((el) => {
    const href = el.closest("a")?.getAttribute("href");
    return href ?? "";
  });
  if (!targetHref.startsWith("/gardens/")) {
    throw new Error(
      `Community card link is missing or invalid for ${communityId}: ${targetHref}`
    );
  }

  await communityCard.click();
  await page.waitForLoadState("networkidle");

  // Some runs don't navigate on click even though the card has a valid link.
  // Force navigation to the card href so contract extraction is deterministic.
  if (new URL(page.url()).pathname === "/gardens") {
    await page.goto(targetHref, { timeout: 60000 });
    await page.waitForLoadState("networkidle");
  }

  if (!isAddress(communityId)) {
    throw new Error(
      `E2E_COMMUNITY_ID is not a valid address: ${communityId}`
    );
  }
  const communityAddress = communityId;

  const readMembership = async () => {
    const result = await page.evaluate(
      async ({ to, data }) => {
        const provider = (window as any).ethereum;
        return (await provider.request({
          method: "eth_call",
          params: [{ to, data }, "latest"]
        })) as string;
      },
      { to: communityAddress, data: encodeIsMember(account) }
    );
    return parseBoolResult(result);
  };

  if (!(await readMembership())) {
    return;
  }

  await page.evaluate(
    async ({ from, to, data }) => {
      const provider = (window as any).ethereum;
      await provider.request({
        method: "eth_sendTransaction",
        params: [{ from, to, data }]
      });
    },
    {
      from: account,
      to: communityAddress,
      data: `0x${UNREGISTER_MEMBER_SELECTOR}`
    }
  );

  await confirmTransaction({ metamask, extensionId });
  await expectNoErrorToast(page);

  await expect
    .poll(async () => !(await readMembership()), {
      timeout: 60000,
      intervals: [1000, 2000, 3000]
    })
    .toBe(true);
});

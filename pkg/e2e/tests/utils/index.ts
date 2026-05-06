import { Page } from "@playwright/test";
import { getConfig } from "./config";

export * from "./metaMaskFixtures";
export * from "./locators-utils";
export * from "./metamaskUtils";
export * from "./config";

export async function gotoE2ECommunity(page: Page) {
  const cfg = getConfig();
  const uri = `/gardens/${cfg.chainId}/${cfg.communityId}`;
  await page.goto(uri, { timeout: 60000 });
  await page.bringToFront();
}

// ERC20 allowance(address owner, address spender) -> 0xdd62ed3e
const ALLOWANCE_SELECTOR = "dd62ed3e";

function encodeAddress(addr: string) {
  const v = addr.replace(/^0x/i, "").toLowerCase();
  return v.padStart(64, "0");
}

export async function waitForAllowancePositive({
  page,
  token,
  spender,
  owner,
  timeoutMs = 180000,
  pollMs = 3000
}: {
  page: Page;
  token: `0x${string}`;
  spender: `0x${string}`;
  owner?: `0x${string}`;
  timeoutMs?: number;
  pollMs?: number;
}) {
  let acct = owner;
  if (!acct) {
    acct = (await page.evaluate(async () => {
      const provider = (window as any).ethereum;
      const accounts = (await provider.request({
        method: "eth_accounts"
      })) as string[];
      return accounts[0] ?? null;
    })) as `0x${string}` | null;
  }
  if (!acct) throw new Error("waitForAllowancePositive: missing owner account");

  const data = `0x${ALLOWANCE_SELECTOR}${encodeAddress(acct)}${encodeAddress(spender)}`;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = (await page.evaluate(
        async ({ to, data }) => {
          const provider = (window as any).ethereum;
          return (await provider.request({
            method: "eth_call",
            params: [{ to, data }, "latest"]
          })) as string;
        },
        { to: token, data }
      )) as string;
      if (res && res !== "0x" && res !== "0x0") {
        try {
          if (BigInt(res) > 0n) return true;
        } catch {
          // non-numeric, fallback to truthy
          return true;
        }
      }
    } catch {}
    await page.waitForTimeout(pollMs);
  }
  throw new Error(
    "waitForAllowancePositive: allowance not observed > 0 within timeout"
  );
}

import { Page } from "@playwright/test";
import { createPublicClient, defineChain, http, parseAbi } from "viem";
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

const allowanceAbi = parseAbi([
  "function allowance(address owner, address spender) view returns (uint256)"
]);

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
  let acct: `0x${string}` | undefined = owner;
  if (!acct) {
    const evaluatedAcct = (await page.evaluate(async () => {
      const provider = (window as any).ethereum;
      const accounts = (await provider.request({
        method: "eth_accounts"
      })) as string[];
      return accounts[0] ?? null;
    })) as `0x${string}` | null;
    if (evaluatedAcct) {
      acct = evaluatedAcct;
    }
  }
  if (!acct) throw new Error("waitForAllowancePositive: missing owner account");

  const { chainId, rpcUrl } = getConfig();
  const numericChainId = Number(chainId);
  if (!Number.isFinite(numericChainId)) {
    throw new Error(`waitForAllowancePositive: invalid chain id ${chainId}`);
  }

  const publicClient = createPublicClient({
    chain: defineChain({
      id: numericChainId,
      name: "E2E Chain",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: {
        default: {
          http: [rpcUrl]
        }
      }
    }),
    transport: http(rpcUrl)
  });

  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const allowance = await publicClient.readContract({
        address: token,
        abi: allowanceAbi,
        functionName: "allowance",
        args: [acct, spender]
      });

      if (allowance > 0n) {
        return true;
      }
      lastError = undefined;
    } catch (error) {
      lastError = error;
    }
    await page.waitForTimeout(pollMs);
  }
  throw new Error(
    lastError instanceof Error ?
      `waitForAllowancePositive: allowance not observed > 0 within timeout (${lastError.message})`
    : "waitForAllowancePositive: allowance not observed > 0 within timeout"
  );
}

import { Page } from "@playwright/test";
import {
  Address,
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseAbi,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
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
  "function allowance(address owner, address spender) view returns (uint256)",
]);
const membershipAbi = parseAbi([
  "function isMember(address account) view returns (bool)",
]);
const registryCommunityAbi = parseAbi([
  "function memberPowerInStrategy(address member, address strategy) view returns (uint256)",
  "function rejectPool(address strategy)",
  "function unregisterMember()",
]);

const isAddress = (value: string | null | undefined): value is Address =>
  typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);

function createE2EChain() {
  const { chainId, rpcUrl } = getConfig();
  const numericChainId = Number(chainId);
  if (!Number.isFinite(numericChainId)) {
    throw new Error(`Invalid chain id ${chainId}`);
  }

  return defineChain({
    id: numericChainId,
    name: "E2E Chain",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: {
        http: [rpcUrl],
      },
      public: {
        http: [rpcUrl],
      },
    },
  });
}

function createE2EPublicClient() {
  const { rpcUrl } = getConfig();
  return createPublicClient({
    chain: createE2EChain(),
    transport: http(rpcUrl),
  });
}

export async function getConnectedAccount(page: Page) {
  const account = (await page.evaluate(async () => {
    const provider = (window as any).ethereum;
    const accounts = (await provider.request({
      method: "eth_accounts",
    })) as string[];
    return accounts[0] ?? null;
  })) as string | null;

  if (!isAddress(account)) {
    throw new Error("Missing connected account");
  }

  return account;
}

export async function waitForAllowancePositive({
  page,
  token,
  spender,
  owner,
  timeoutMs = 180000,
  pollMs = 3000,
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
        method: "eth_accounts",
      })) as string[];
      return accounts[0] ?? null;
    })) as `0x${string}` | null;
    if (evaluatedAcct) {
      acct = evaluatedAcct;
    }
  }
  if (!acct) throw new Error("waitForAllowancePositive: missing owner account");

  const publicClient = createE2EPublicClient();

  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const allowance = await publicClient.readContract({
        address: token,
        abi: allowanceAbi,
        functionName: "allowance",
        args: [acct, spender],
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
    lastError instanceof Error
      ? `waitForAllowancePositive: allowance not observed > 0 within timeout (${lastError.message})`
      : "waitForAllowancePositive: allowance not observed > 0 within timeout",
  );
}

export async function waitForMembershipActive({
  page,
  community,
  account,
  timeoutMs = 180000,
  pollMs = 4000,
}: {
  page: Page;
  community: `0x${string}`;
  account: `0x${string}`;
  timeoutMs?: number;
  pollMs?: number;
}) {
  const publicClient = createE2EPublicClient();

  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const isMember = await publicClient.readContract({
        address: community,
        abi: membershipAbi,
        functionName: "isMember",
        args: [account],
      });

      if (isMember) {
        return true;
      }
      lastError = undefined;
    } catch (error) {
      lastError = error;
    }
    await page.waitForTimeout(pollMs);
  }

  throw new Error(
    lastError instanceof Error
      ? `waitForMembershipActive: membership not observed within timeout (${lastError.message})`
      : "waitForMembershipActive: membership not observed within timeout",
  );
}

export async function waitForMembershipInactive({
  community,
  account,
  timeoutMs = 180000,
  pollMs = 4000,
}: {
  community: `0x${string}`;
  account: `0x${string}`;
  timeoutMs?: number;
  pollMs?: number;
}) {
  const publicClient = createE2EPublicClient();

  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const isMember = await publicClient.readContract({
        address: community,
        abi: membershipAbi,
        functionName: "isMember",
        args: [account],
      });

      if (!isMember) {
        return true;
      }
      lastError = undefined;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  throw new Error(
    lastError instanceof Error
      ? `waitForMembershipInactive: membership still active within timeout (${lastError.message})`
      : "waitForMembershipInactive: membership still active within timeout",
  );
}

export async function leaveCommunityIfMember() {
  const { communityId, rpcUrl, walletSeedPhrase } = getConfig();
  const account = mnemonicToAccount(walletSeedPhrase);
  const publicClient = createE2EPublicClient();
  const isMember = await publicClient.readContract({
    address: communityId,
    abi: membershipAbi,
    functionName: "isMember",
    args: [account.address],
  });

  if (!isMember) {
    return false;
  }

  const walletClient = createWalletClient({
    account,
    chain: createE2EChain(),
    transport: http(rpcUrl),
  });
  const hash = await walletClient.writeContract({
    address: communityId,
    abi: registryCommunityAbi,
    functionName: "unregisterMember",
  });
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 1,
    timeout: 180000,
  });
  if (receipt.status !== "success") {
    throw new Error(
      `leaveCommunityIfMember: unregister transaction ${hash} ${receipt.status}`,
    );
  }

  await waitForMembershipInactive({
    community: communityId,
    account: account.address,
  });
  return true;
}

export async function waitForMemberPowerActive({
  page,
  community,
  strategy,
  account,
  timeoutMs = 180000,
  pollMs = 4000,
}: {
  page: Page;
  community: Address;
  strategy: Address;
  account: Address;
  timeoutMs?: number;
  pollMs?: number;
}) {
  const publicClient = createE2EPublicClient();
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const power = await publicClient.readContract({
        address: community,
        abi: registryCommunityAbi,
        functionName: "memberPowerInStrategy",
        args: [account, strategy],
      });

      if (power > 0n) {
        return power;
      }
      lastError = undefined;
    } catch (error) {
      lastError = error;
    }

    await page.waitForTimeout(pollMs);
  }

  throw new Error(
    lastError instanceof Error
      ? `waitForMemberPowerActive: member power not observed within timeout (${lastError.message})`
      : "waitForMemberPowerActive: member power not observed within timeout",
  );
}

type UnarchivedStrategy = {
  id: Address;
  poolId: string;
  isEnabled: boolean;
};

async function postSubgraphQuery<T>(query: string, errorPrefix: string) {
  const { subgraphUrl } = getConfig();
  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(subgraphUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const json = (await response.json()) as {
        data?: T;
        errors?: { message?: string }[];
      };

      if (json.errors?.length) {
        throw new Error(
          json.errors
            .map((error) => error.message ?? "unknown error")
            .join("; "),
        );
      }

      return json.data;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }

  throw new Error(
    lastError instanceof Error
      ? `${errorPrefix}: ${lastError.message}`
      : errorPrefix,
  );
}

async function fetchUnarchivedStrategies() {
  const { communityId } = getConfig();
  const data = await postSubgraphQuery<{
    cvstrategies?: { id?: string; poolId: string; isEnabled: boolean }[];
  }>(
    `{
        cvstrategies(
          first: 1000
          orderBy: poolId
          orderDirection: asc
          where: {archived: false, registryCommunity:"${communityId.toLowerCase()}"}
        ) {
          id
          poolId
          isEnabled
        }
      }`,
    "archivePools: subgraph query failed",
  );

  return (data?.cvstrategies ?? []).filter((strategy: { id?: string }) =>
    isAddress(strategy.id),
  ) as UnarchivedStrategy[];
}

async function waitForStrategiesArchived(strategies: UnarchivedStrategy[]) {
  if (strategies.length === 0) {
    return;
  }

  const ids = strategies.map((strategy) => `"${strategy.id.toLowerCase()}"`);
  const deadline = Date.now() + 180000;

  while (Date.now() < deadline) {
    const data = await postSubgraphQuery<{
      cvstrategies?: { id: string }[];
    }>(
      `{
          cvstrategies(
            first: 1000
            where: {id_in: [${ids.join(",")}], archived: false}
          ) {
            id
          }
        }`,
      "archivePools: archive poll failed",
    );

    if ((data?.cvstrategies ?? []).length === 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error("archivePools: pools still indexed as unarchived");
}

export async function archivePools() {
  const { communityId, rpcUrl, walletSeedPhrase } = getConfig();
  const strategies = await fetchUnarchivedStrategies();
  if (strategies.length === 0) {
    return [];
  }

  const publicClient = createE2EPublicClient();
  const chain = createE2EChain();
  const walletClient = createWalletClient({
    account: mnemonicToAccount(walletSeedPhrase),
    chain,
    transport: http(rpcUrl),
  });
  const archived: UnarchivedStrategy[] = [];

  for (const strategy of strategies) {
    const hash = await walletClient.writeContract({
      address: communityId,
      abi: registryCommunityAbi,
      functionName: "rejectPool",
      args: [strategy.id],
    });
    await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
      timeout: 180000,
    });
    archived.push(strategy);
  }

  await waitForStrategiesArchived(strategies);

  return archived;
}

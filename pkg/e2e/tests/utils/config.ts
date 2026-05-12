type Address = `0x${string}`;

const GRAPH_STUDIO_ACCOUNT_BY_CHAIN_ID: Record<string, string> = {
  "421614": "70985",
  "11155420": "70985",
  "11155111": "70985",
  "1": "102093",
  "10": "102093",
  "100": "102093",
  "137": "102093",
  "42220": "102093",
  "8453": "102093",
  "42161": "102093"
};

export type E2EConfig = {
  // Execution context
  isCI: boolean;

  // Chain + routing
  chainId: string; // decimal as used in app routes
  communityId: Address; // RegistryCommunity address

  // Tokens and RPC
  governanceToken: Address;
  poolToken: Address;
  rpcUrl: string;
  subgraphUrl: string;
  walletSeedPhrase: string;
};

const isHexAddress = (value: unknown): value is Address =>
  typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);

const pickEnv = (name: string, isCI: boolean): string | undefined => {
  // Prefer CI-suffixed var in CI, else base. Fallback to the other if missing.
  const ciKey = `${name}_CI`;
  if (isCI) {
    return process.env[ciKey] ?? process.env[name];
  }
  return process.env[name] ?? process.env[ciKey];
};

const getRequired = (name: string, isCI: boolean): string => {
  const v = pickEnv(name, isCI);
  if (!v || v.length === 0) {
    throw new Error(`Missing required env: ${isCI ? name + "_CI" : name}`);
  }
  return v;
};

const getOptional = (name: string, isCI: boolean): string | undefined =>
  pickEnv(name, isCI);

const normalizeSubgraphUrl = (value: string, chainId: string) => {
  const trimmed = value.trim();

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split("/").filter(Boolean);

    // Accept legacy shorthand like /query/<slug>/version/latest and inject the
    // Graph Studio account number expected by the current app config.
    if (
      url.hostname === "api.studio.thegraph.com" &&
      segments[0] === "query" &&
      segments.length >= 4 &&
      !/^\d+$/.test(segments[1])
    ) {
      const accountNumber = GRAPH_STUDIO_ACCOUNT_BY_CHAIN_ID[chainId];
      if (!accountNumber) {
        throw new Error(
          `E2E_SUBGRAPH_URL is missing its Graph Studio account number and chain ${chainId} has no configured fallback.`
        );
      }

      url.pathname = ["query", accountNumber, ...segments.slice(1)].join("/");
      return url.toString();
    }

    return url.toString();
  } catch {
    return trimmed;
  }
};

export function getConfig(): E2EConfig {
  const isCI =
    process.env.E2E_CI === "true" ||
    process.env.CI === "true" ||
    process.env.GITHUB_ACTIONS === "true" ||
    false;

  const chainId = getRequired("E2E_CHAIN_ID", isCI);
  const communityIdRaw = getRequired("E2E_COMMUNITY_ID", isCI);
  if (!isHexAddress(communityIdRaw)) {
    throw new Error(
      `E2E_COMMUNITY_ID must be a valid address, got: ${communityIdRaw}`
    );
  }

  // Token address resolution with sensible fallback to a shared E2E_TOKEN_ADDRESS
  const governanceTokenRaw =
    pickEnv("E2E_GOVERNANCE_TOKEN_ADDRESS", isCI) ??
    pickEnv("E2E_TOKEN_ADDRESS", isCI);
  if (!governanceTokenRaw || !isHexAddress(governanceTokenRaw)) {
    throw new Error(
      `Missing or invalid governance token address (E2E_GOVERNANCE_TOKEN_ADDRESS[_CI] or E2E_TOKEN_ADDRESS[_CI])`
    );
  }

  const poolTokenRaw =
    pickEnv("E2E_POOL_TOKEN_ADDRESS", isCI) ??
    pickEnv("E2E_TOKEN_ADDRESS", isCI);
  if (!poolTokenRaw || !isHexAddress(poolTokenRaw)) {
    throw new Error(
      `Missing or invalid pool token address (E2E_POOL_TOKEN_ADDRESS[_CI] or E2E_TOKEN_ADDRESS[_CI])`
    );
  }

  const rpcUrl = getRequired("E2E_RPC_URL", isCI);
  const walletSeedPhrase = getRequired("E2E_WALLET_SEED_PHRASE", isCI);
  const subgraphUrl = normalizeSubgraphUrl(
    getRequired("E2E_SUBGRAPH_URL", isCI),
    chainId
  );

  return Object.freeze({
    isCI,
    chainId,
    communityId: communityIdRaw,
    governanceToken: governanceTokenRaw,
    poolToken: poolTokenRaw,
    rpcUrl,
    subgraphUrl,
    walletSeedPhrase
  });
}

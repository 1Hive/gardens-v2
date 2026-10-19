import { writeFile } from "node:fs/promises";

// Refresh reviewed families only. This script is never called by the application.
const aaveRevision = "d24749ac746872981cec4f7d862ac0d301a05462";
const markets = [
  ["Ethereum", 1],
  ["Optimism", 10],
  ["Arbitrum", 42161],
  ["Polygon", 137],
  ["Gnosis", 100],
  ["Base", 8453],
  ["Celo", 42220],
];

async function get(url, options) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response;
}

const aaveMarkets = await Promise.all(
  markets.map(async ([market, chainId]) => {
    const source = `https://raw.githubusercontent.com/bgd-labs/aave-address-book/${aaveRevision}/src/AaveV3${market}.sol`;
    const code = await (await get(source)).text();
    const tokens = [
      ...code.matchAll(
        /address internal constant (\w+)_A_TOKEN = (0x[0-9a-fA-F]{40});/g,
      ),
    ]
      .filter((match) => !/_(STATIC|STATA)$/.test(match[1]))
      .map((match) => ({ asset: match[1], address: match[2].toLowerCase() }));
    if (!tokens.length) throw new Error(`No aTokens found for ${market}`);
    return { market, chainId, tokens };
  }),
);

const predicate = (column, filterType, value) => ({
  Type: "FilterPredicate",
  FilterType: filterType,
  Column: column,
  Value: value,
});
async function circlesQuery(filter, limit, sortOrder) {
  const response = await get("https://rpc.aboutcircles.com/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "circles_query",
      params: [
        {
          Namespace: "CrcV2",
          Table: "ERC20WrapperDeployed",
          Columns: ["blockNumber", "erc20Wrapper", "circlesType"],
          Filter: [predicate("circlesType", "Equals", 0), ...filter],
          Order: [{ Column: "blockNumber", SortOrder: sortOrder }],
          Limit: limit,
        },
      ],
    }),
  });
  const data = await response.json();
  if (data.error || !Array.isArray(data.result?.rows))
    throw new Error(JSON.stringify(data));
  const { columns, rows } = data.result;
  return rows.map((row) =>
    Object.fromEntries(columns.map((column, i) => [column, row[i]])),
  );
}

const latest = await circlesQuery([], 1, "DESC");
if (!latest.length) throw new Error("Circles registry is empty");
const throughBlock = latest[0].blockNumber;
const addresses = new Set();
let fromBlock = 0;
while (true) {
  const rows = await circlesQuery(
    [
      predicate("blockNumber", "GreaterThanOrEquals", fromBlock),
      predicate("blockNumber", "LessThanOrEquals", throughBlock),
    ],
    10000,
    "ASC",
  );
  for (const row of rows) {
    if (
      row.circlesType !== 0 ||
      !/^0x[0-9a-fA-F]{40}$/.test(row.erc20Wrapper)
    ) {
      throw new Error("Invalid Circles demurrage registry row");
    }
    addresses.add(row.erc20Wrapper.toLowerCase());
  }
  if (rows.length < 10000) break;
  const lastBlock = rows.at(-1).blockNumber;
  if (lastBlock <= fromBlock)
    throw new Error("Circles pagination did not advance");
  // Repeat the final block so deployments at the page boundary are not skipped.
  fromBlock = lastBlock;
}

const snapshot = {
  aaveRevision,
  aaveMarkets,
  circles: { chainId: 100, throughBlock, addresses: [...addresses].sort() },
};
await writeFile(
  new URL(
    "../configs/unsupportedGovernanceTokenSnapshot.json",
    import.meta.url,
  ),
  `${JSON.stringify(snapshot, null, 2)}\n`,
);
console.log(
  `Saved ${aaveMarkets.reduce((sum, market) => sum + market.tokens.length, 0)} aTokens and ${addresses.size} Circles demurrage wrappers through block ${throughBlock}`,
);

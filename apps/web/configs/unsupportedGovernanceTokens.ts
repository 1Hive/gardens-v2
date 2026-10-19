import snapshot from "./unsupportedGovernanceTokenSnapshot.json";

// Curated snapshot, reviewed 2026-10-19. Unknown tokens are not certified compatible.
// Only incompatible balance/transfer behavior is included, not every weird-ERC20 quirk.
const weirdErc20 =
  "https://github.com/d-xo/weird-erc20/blob/781c8f039c106eb2d5c6071046b0dbb2f72c9870/readme.md";

export const unsupportedGovernanceTokens = [
  {
    chainId: 42220,
    address: "0xe3b55684aecd7cc6908f75ec40f48f8639cc9276",
    symbol: "RIBA",
    reason: "demurrage",
    sources: [
      "https://celo.blockscout.com/address/0xE3B55684AeCd7cC6908F75Ec40F48F8639cc9276?tab=contract",
    ],
  },
  {
    chainId: 1,
    address: "0xd46ba6d942050d489dbd938a2c909a5d5039a161",
    symbol: "AMPL",
    reason: "rebasing",
    sources: [
      `${weirdErc20}#balance-modifications-outside-of-transfers-rebasingairdrops`,
      "https://www.ampleforth.org/",
    ],
  },
  {
    chainId: 1,
    address: "0xa7de087329bfcda5639247f96140f9dabe3deed1",
    symbol: "STA",
    reason: "transfer fees",
    // GoPlus snapshot: token_symbol=STA, transfer_tax=0.01 (1%).
    sources: [
      `${weirdErc20}#fee-on-transfer`,
      "https://api.gopluslabs.io/api/v1/token_security/1?contract_addresses=0xa7de087329bfcda5639247f96140f9dabe3deed1",
      "https://stateraproject.medium.com/sta-faqs-cafea2fda645",
    ],
  },
  {
    chainId: 1,
    address: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
    symbol: "stETH",
    reason: "rebasing",
    sources: [
      "https://docs.lido.fi/token-guides/steth-superuser-functions/",
      "https://docs.lido.fi/guides/lido-tokens-integration-guide/",
    ],
  },
  {
    chainId: 1,
    address: "0xaf37c1167910ebc994e266949387d2c7c326b879",
    symbol: "rUSDY",
    reason: "rebasing",
    sources: [
      "https://docs.ondo.finance/addresses",
      "https://ondo.finance/usdy",
    ],
  },
  ...[
    "0x31932e6e45012476ba3a3a4953cba62aee77fbbe",
    "0x04f2694c8fcee23e8fd0dfea1d4f5bb8c352111f",
    "0x04906695d6d12cf5459975d7c3c03356e4ccd460",
  ].map((address) => ({
    chainId: 1,
    address,
    symbol: "sOHM",
    reason: "rebasing",
    sources: ["https://docs.olympusdao.finance/main/contracts-old/tokens"],
  })),
  // Legacy rebasing design; rewards were disabled during the issuer's wind-down.
  ...[1, 10, 137, 8453, 42161, 42220].map((chainId) => ({
    chainId,
    address: "0x59d9356e565ab3a36dd77763fc0d87feaf85508c",
    symbol: "USDM",
    reason: "a rebasing token design",
    sources: [
      "https://docs.mountainprotocol.com/legacy-docs/usdm-token",
      "https://docs.mountainprotocol.com/wind-down-documentation/usdm-wind-down-overview",
    ],
  })),
  ...snapshot.aaveMarkets.flatMap(({ market, chainId, tokens }) =>
    tokens.map(({ asset, address }) => ({
      chainId,
      address,
      symbol: `Aave ${asset} aToken`,
      reason: "interest-accruing balances",
      sources: [
        `https://github.com/bgd-labs/aave-address-book/blob/${snapshot.aaveRevision}/src/AaveV3${market}.sol`,
        "https://www.aave.com/docs/aave-v3/smart-contracts/tokenization",
      ],
    })),
  ),
  ...snapshot.circles.addresses.map((address) => ({
    chainId: snapshot.circles.chainId,
    address,
    symbol: "Circles ERC-20",
    reason: "demurrage",
    sources: [
      "https://rpc.aboutcircles.com/",
      "https://aboutcircles.github.io/circles-contracts-v2/beta/architecture/",
    ],
  })),
];

const unsupportedByChainAndAddress = new Map(
  unsupportedGovernanceTokens.map((token) => [
    `${token.chainId}:${token.address}`,
    token,
  ]),
);

export function getUnsupportedGovernanceTokenError(
  chainId: number | undefined,
  address: string,
): string | undefined {
  const token = unsupportedByChainAndAddress.get(
    `${chainId}:${address.toLowerCase()}`,
  );
  if (!token) return undefined;
  return `${token.symbol} is not supported because it uses ${token.reason}. Choose a token with stable balances and no transfer fees.`;
}

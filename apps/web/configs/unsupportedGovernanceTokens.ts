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
] as const;

export function getUnsupportedGovernanceTokenError(
  chainId: number | undefined,
  address: string,
): string | undefined {
  const token = unsupportedGovernanceTokens.find(
    (entry) =>
      entry.chainId === chainId && entry.address === address.toLowerCase(),
  );
  if (!token) return undefined;
  return `${token.symbol} is not supported because it uses ${token.reason}. Choose a token with stable balances and no transfer fees.`;
}

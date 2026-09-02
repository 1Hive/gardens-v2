import {
  Address,
  bytesToHex,
  decodeAbiParameters,
  encodeAbiParameters,
  Hex,
  keccak256,
  PublicClient,
  toBytes,
} from "viem";

export const REVNET_NATIVE_TOKEN =
  "0x000000000000000000000000000000000000EEEe" as Address;

const REVNET_BUYBACK_HOOK_BY_CHAIN_ID: Record<number, Address> = {
  8453: "0x77bEe1AD2AC0AcE98a9b5B58D75685c8b4d94948",
  11155111: "0x77bEe1AD2AC0AcE98a9b5B58D75685c8b4d94948",
};

export const revnetTerminalCashOutABI = [
  {
    type: "function",
    name: "TOKENS",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "cashOutTokensOf",
    stateMutability: "nonpayable",
    inputs: [
      { name: "holder", type: "address" },
      { name: "projectId", type: "uint256" },
      { name: "cashOutCount", type: "uint256" },
      { name: "tokenToReclaim", type: "address" },
      { name: "minTokensReclaimed", type: "uint256" },
      { name: "beneficiary", type: "address" },
      { name: "metadata", type: "bytes" },
    ],
    outputs: [{ name: "reclaimAmount", type: "uint256" }],
  },
  {
    type: "function",
    name: "feeFreeSurplusOf",
    stateMutability: "view",
    inputs: [
      { name: "projectId", type: "uint256" },
      { name: "token", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "previewCashOutFrom",
    stateMutability: "view",
    inputs: [
      { name: "holder", type: "address" },
      { name: "projectId", type: "uint256" },
      { name: "cashOutCount", type: "uint256" },
      { name: "tokenToReclaim", type: "address" },
      { name: "beneficiary", type: "address" },
      { name: "metadata", type: "bytes" },
    ],
    outputs: [
      {
        name: "ruleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", type: "uint48" },
          { name: "id", type: "uint48" },
          { name: "basedOnId", type: "uint48" },
          { name: "start", type: "uint48" },
          { name: "duration", type: "uint32" },
          { name: "weight", type: "uint112" },
          { name: "weightCutPercent", type: "uint32" },
          { name: "approvalHook", type: "address" },
          { name: "metadata", type: "uint256" },
        ],
      },
      { name: "reclaimAmount", type: "uint256" },
      { name: "cashOutTaxRate", type: "uint256" },
      {
        name: "hookSpecifications",
        type: "tuple[]",
        components: [
          { name: "hook", type: "address" },
          { name: "noop", type: "bool" },
          { name: "amount", type: "uint256" },
          { name: "metadata", type: "bytes" },
        ],
      },
    ],
  },
  { type: "error", name: "JBMultiTerminal_UnderMin", inputs: [] },
] as const;

export const revnetTokensABI = [
  {
    type: "function",
    name: "tokenOf",
    stateMutability: "view",
    inputs: [{ name: "projectId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export const markeeTokenABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

type HookSpecification = {
  hook: Address;
  metadata: Hex;
  noop: boolean;
};

type CashOutPreview = {
  cashOutTaxRate: bigint;
  hookSpecifications: readonly HookSpecification[];
  reclaimAmount: bigint;
  rulesetId: bigint;
};

export type MarkeeCashOutQuote = {
  expectedReturn: bigint;
  metadata: Hex;
  minimumReturn: bigint;
  route: "revnet" | "uniswap";
  terminalMinimum: bigint;
};

const MAX_BPS = 10_000n;
const SLIPPAGE_BPS = 100n;
const WORD_HEX_LENGTH = 64;

function slippageFloor(value: bigint) {
  if (value <= 0n) return 0n;
  const floor = (value * (MAX_BPS - SLIPPAGE_BPS)) / MAX_BPS;
  return floor > 0n ? floor : 1n;
}

function metadataId(target: Address, purpose: string) {
  const targetBytes = toBytes(target).slice(0, 20);
  const purposeBytes = toBytes(keccak256(toBytes(purpose))).slice(0, 20);
  return bytesToHex(
    targetBytes.map((byte, index) => byte ^ purposeBytes[index]).slice(0, 4),
  );
}

function createHookMetadata(id: Hex, payload: Hex): Hex {
  const idBody = id.slice(2);
  const payloadBody = payload.slice(2).padEnd(WORD_HEX_LENGTH, "0");
  const table = `${idBody}02`.padEnd(WORD_HEX_LENGTH, "0");
  return `0x${"0".repeat(WORD_HEX_LENGTH)}${table}${payloadBody}` as Hex;
}

function buybackMetadata(hook: Address, minimumReturn: bigint) {
  const payload = encodeAbiParameters(
    [{ type: "uint256" }, { type: "bool" }],
    [minimumReturn, false],
  );
  return createHookMetadata(metadataId(hook, "cashOut"), payload);
}

function readBuybackQuote(metadata: Hex) {
  const [
    minimumSwapAmountOut,
    ,
    netDirectCashOutAmount,
    ,
    ,
    ,
    rawSwapQuote,
    hasUserSpecifiedMinimum,
  ] = decodeAbiParameters(
    [
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "int24" },
      { type: "uint128" },
      { type: "bytes32" },
      { type: "uint256" },
      { type: "bool" },
    ],
    metadata,
  );
  return {
    hasUserSpecifiedMinimum,
    minimumSwapAmountOut,
    netDirectCashOutAmount,
    rawSwapQuote,
  };
}

async function previewCashOut(
  client: PublicClient,
  terminal: Address,
  holder: Address,
  projectId: bigint,
  tokenCount: bigint,
  metadata: Hex,
): Promise<CashOutPreview> {
  const [ruleset, reclaimAmount, cashOutTaxRate, hookSpecifications] =
    await client.readContract({
      abi: revnetTerminalCashOutABI,
      address: terminal,
      args: [
        holder,
        projectId,
        tokenCount,
        REVNET_NATIVE_TOKEN,
        holder,
        metadata,
      ],
      functionName: "previewCashOutFrom",
    });
  return {
    cashOutTaxRate,
    hookSpecifications,
    reclaimAmount,
    rulesetId: BigInt(ruleset.id),
  };
}

async function resolveQuote(
  client: PublicClient,
  chainId: number,
  terminal: Address,
  projectId: bigint,
  preview: CashOutPreview,
): Promise<MarkeeCashOutQuote> {
  const feeFreeSurplus =
    preview.cashOutTaxRate === 0n ?
      await client.readContract({
        abi: revnetTerminalCashOutABI,
        address: terminal,
        args: [projectId, REVNET_NATIVE_TOKEN],
        functionName: "feeFreeSurplusOf",
      })
    : 0n;
  const feeable =
    preview.cashOutTaxRate > 0n ? preview.reclaimAmount
    : preview.reclaimAmount < feeFreeSurplus ? preview.reclaimAmount
    : feeFreeSurplus;
  const treasuryNet = preview.reclaimAmount - feeable / 40n;
  const treasuryMinimum = slippageFloor(treasuryNet);
  const buybackAddress = REVNET_BUYBACK_HOOK_BY_CHAIN_ID[chainId];
  const specification = preview.hookSpecifications.find(
    (item) =>
      buybackAddress != null &&
      item.hook.toLowerCase() === buybackAddress.toLowerCase() &&
      item.metadata !== "0x",
  );
  if (specification == null || specification.noop) {
    return {
      expectedReturn: treasuryNet,
      metadata: "0x",
      minimumReturn: treasuryMinimum,
      route: "revnet",
      terminalMinimum: treasuryMinimum,
    };
  }

  const buyback = readBuybackQuote(specification.metadata);
  const expectedReturn =
    buyback.rawSwapQuote > 0n ?
      buyback.rawSwapQuote
    : buyback.minimumSwapAmountOut;
  const executableReturn =
    buyback.minimumSwapAmountOut > expectedReturn ?
      expectedReturn
    : buyback.minimumSwapAmountOut;
  const minimumReturn =
    buyback.hasUserSpecifiedMinimum ?
      buyback.minimumSwapAmountOut
    : slippageFloor(executableReturn);
  if (expectedReturn <= 0n || minimumReturn <= buyback.netDirectCashOutAmount) {
    return {
      expectedReturn: treasuryNet,
      metadata: "0x",
      minimumReturn: treasuryMinimum,
      route: "revnet",
      terminalMinimum: treasuryMinimum,
    };
  }

  return {
    expectedReturn,
    metadata: buybackMetadata(specification.hook, minimumReturn),
    minimumReturn,
    route: "uniswap",
    terminalMinimum: 0n,
  };
}

export async function getMarkeeCashOutQuote({
  chainId,
  client,
  holder,
  projectId,
  terminal,
  tokenCount,
}: {
  chainId: number;
  client: PublicClient;
  holder: Address;
  projectId: bigint;
  terminal: Address;
  tokenCount: bigint;
}) {
  const preview = await previewCashOut(
    client,
    terminal,
    holder,
    projectId,
    tokenCount,
    "0x",
  );
  return resolveQuote(client, chainId, terminal, projectId, preview);
}

export async function prepareMarkeeCashOut(args: {
  chainId: number;
  client: PublicClient;
  holder: Address;
  projectId: bigint;
  terminal: Address;
  tokenCount: bigint;
}) {
  const preview = await previewCashOut(
    args.client,
    args.terminal,
    args.holder,
    args.projectId,
    args.tokenCount,
    "0x",
  );
  const quote = await resolveQuote(
    args.client,
    args.chainId,
    args.terminal,
    args.projectId,
    preview,
  );
  if (quote.route === "uniswap") {
    const locked = await previewCashOut(
      args.client,
      args.terminal,
      args.holder,
      args.projectId,
      args.tokenCount,
      quote.metadata,
    );
    const lockedQuote = await resolveQuote(
      args.client,
      args.chainId,
      args.terminal,
      args.projectId,
      locked,
    );
    if (
      locked.rulesetId !== preview.rulesetId ||
      lockedQuote.route !== "uniswap" ||
      lockedQuote.minimumReturn !== quote.minimumReturn
    ) {
      throw new Error("The best Markee quote changed. Please try again.");
    }
  }
  return quote;
}

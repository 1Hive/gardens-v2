import {
  Address,
  createWalletClient,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  Hex,
  http,
  isAddress,
  keccak256,
  parseAbi,
  zeroAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  getEnvPublicClient,
  getRpcUrlForChain,
  resolveClientChain,
} from "@/utils/publicClient";

const MARKEE_SEPOLIA_CHAIN_ID = 11155111;
const MARKEE_BASE_CHAIN_ID = 8453;
const GNOSIS_CHAIN_ID = 100;
const SQUID_MAX_WETH_SLIPPAGE_PERCENT = 5;
const SQUID_NATIVE_TOKEN: Address =
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const SQUID_DESTINATION_ETH_TOKENS: Record<number, Address> = {
  1: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  10: "0x4200000000000000000000000000000000000006",
  100: "0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1",
  137: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
  42161: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
  42220: "0x2def4285787d58a2f811af24755a8150622f4361",
};
const SQUID_NATIVE_ETH_CHAIN_IDS = new Set([1, 10, 42161]);
const SQUID_ROUTE_URL = "https://v2.api.squidrouter.com/v2/route";
const SQUID_STATUS_URL = "https://v2.api.squidrouter.com/v2/status";
const LIFI_QUOTE_URL = "https://li.quest/v1/quote";
const LIFI_NATIVE_TOKEN: Address = zeroAddress;
const LIFI_BASE_DIAMOND: Address = "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE";
const GARDENS_TESTNET_CHAIN_IDS = new Set([421614, 11155420, 11155111]);
const BRIDGE_PROTOCOL = {
  NONE: 0,
  ACROSS: 1,
  SQUID: 2,
  LIFI: 3,
} as const;

type BridgeProtocol = (typeof BRIDGE_PROTOCOL)[keyof typeof BRIDGE_PROTOCOL];

const isTestnetCommunity = (chainId?: number) =>
  chainId != null && GARDENS_TESTNET_CHAIN_IDS.has(chainId);

export const getMarkeeChainId = (communityChainId?: number) =>
  isTestnetCommunity(communityChainId) ?
    MARKEE_SEPOLIA_CHAIN_ID
  : MARKEE_BASE_CHAIN_ID;

const gardensMarkeeRouterABI = parseAbi([
  "function communityVault(bytes32 communityKey) view returns (address vault)",
  "function bridgeConfiguration(uint256 destinationChainId) view returns (address adapter, uint8 protocol)",
  "function keepers(address keeper) view returns (bool)",
  "function remoteReceivers(uint256 chainId) view returns (address)",
  "function sweep(bytes32 communityKey, bytes quoteData, uint256 minAmountOut, uint256 gasCost) payable",
]);

const acrossBridgeAdapterABI = parseAbi([
  "function wrappedNativeToken() view returns (address)",
  "function destinationTokens(uint256 chainId) view returns (address)",
]);

const squidBridgeAdapterABI = parseAbi([
  "function squidRouter() view returns (address)",
]);

const squidGardensRevenueReceiverABI = parseAbi([
  "function receiveSquidRevenue(bytes32 payoutId, bytes32 communityKey, address registryCommunity) payable",
  "function receiveSquidTokenRevenue(bytes32 payoutId, bytes32 communityKey, address registryCommunity, address token, uint256 amount)",
]);

const erc20ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
]);

const communityRevenueVaultABI = parseAbi([
  "function availableRevenue() view returns (uint256 nativeETH, uint256 ethxBalance, uint256 wethBalance, uint256 combinedETH)",
]);

const streamingLeaderboardFactoryABI = parseAbi([
  "function getLeaderboards(uint256 offset, uint256 limit) view returns (address[] result)",
]);

const streamingLeaderboardABI = parseAbi([
  "function beneficiaryAddress() view returns (address)",
  "function maxMessageLength() view returns (uint256)",
  "function maxNameLength() view returns (uint256)",
  "function minimumMonthlyRate() view returns (uint256)",
  "function topMarkee() view returns (address)",
  "function topRate() view returns (uint256)",
]);

const markeeABI = parseAbi([
  "function message() view returns (string)",
  "function name() view returns (string)",
  "function owner() view returns (address)",
]);

export const getMarkeeRouterAddress = (communityChainId?: number) => {
  const markeeChainId = getMarkeeChainId(communityChainId);
  const value = (
    markeeChainId === MARKEE_BASE_CHAIN_ID ?
      process.env.MARKEE_ROUTER_ADDRESS_BASE
    : process.env.MARKEE_ROUTER_ADDRESS_SEPOLIA)?.trim();

  return value && isAddress(value) ? getAddress(value) : null;
};

const getStreamingLeaderboardFactoryAddress = (communityChainId?: number) => {
  const markeeChainId = getMarkeeChainId(communityChainId);
  const environmentValue = (
    markeeChainId === MARKEE_BASE_CHAIN_ID ?
      process.env.MARKEE_STREAMING_LEADERBOARD_FACTORY_ADDRESS_BASE
    : process.env.MARKEE_STREAMING_LEADERBOARD_FACTORY_ADDRESS_SEPOLIA)?.trim();
  const fallbackValue =
    process.env.MARKEE_STREAMING_LEADERBOARD_FACTORY_ADDRESS?.trim();
  const value =
    environmentValue != null && environmentValue.length > 0 ?
      environmentValue
    : fallbackValue;

  return value && isAddress(value) ? getAddress(value) : null;
};

export const getCommunityKey = (chainId: number, community: Address) =>
  keccak256(
    encodeAbiParameters(
      [{ type: "uint256" }, { type: "address" }],
      [BigInt(chainId), community],
    ),
  );

const getCommunityRevenue = async (chainId: number, community: Address) => {
  const router = getMarkeeRouterAddress(chainId);
  if (router == null) {
    throw new Error("Markee router is not configured for this environment");
  }

  const client = getEnvPublicClient(getMarkeeChainId(chainId));
  const vaultResult = await client.readContract({
    abi: gardensMarkeeRouterABI,
    address: router,
    args: [getCommunityKey(chainId, community)],
    functionName: "communityVault",
  });

  if (
    typeof vaultResult !== "string" ||
    !isAddress(vaultResult) ||
    getAddress(vaultResult) === zeroAddress
  ) {
    return { claimableAmount: 0n, vaultAddress: null };
  }

  const vaultAddress = getAddress(vaultResult);
  const revenue = await client.readContract({
    abi: communityRevenueVaultABI,
    address: vaultAddress,
    functionName: "availableRevenue",
  });

  return {
    claimableAmount: revenue[3],
    vaultAddress,
  };
};

type AcrossSuggestedFeesResponse = {
  fillDeadline?: string | number;
  isAmountTooLow?: boolean;
  message?: string;
  outputAmount?: string;
};

type SquidRouteResponse = {
  message?: string;
  requestId?: string;
  route?: {
    estimate?: {
      aggregateSlippage?: number | string;
      estimatedRouteDuration?: number | string;
      fromAmountUSD?: string;
      toAmount?: string;
      toAmountMin?: string;
      toAmountUSD?: string;
    };
    transactionRequest?: {
      data?: string;
      target?: string;
      targetAddress?: string;
      value?: string;
    };
  };
};

type LifiQuoteResponse = {
  action?: {
    fromAddress?: string;
    fromAmount?: string;
    fromChainId?: number;
    toAddress?: string;
    toChainId?: number;
  };
  code?: string;
  estimate?: {
    fromAmount?: string;
    fromAmountUSD?: string;
    toAmount?: string;
    toAmountMin?: string;
    toAmountUSD?: string;
  };
  message?: string;
  transactionRequest?: {
    chainId?: number | string;
    data?: string;
    from?: string;
    to?: string;
    value?: string;
  };
};

export type MarkeeClaimExecutionQuote = {
  bridgeProtocol: "across" | "lifi" | "none" | "squid";
  bridged: boolean;
  claimAmount: bigint;
  destinationSymbol: string;
  estimatedFeeAmount: bigint;
  estimatedRouteDurationSeconds?: number;
  executionValue: bigint;
  gasCost: bigint;
  expectedAmountOut: bigint;
  expiresAt: number;
  markeeChainId: number;
  minAmountOut: bigint;
  quoteData: Hex;
  recipient: Address;
  router: Address;
  symbol: "ETH";
  transferAmount: bigint;
};

export type MarkeeClaimBridgeStatus = {
  axelarTransactionUrl: string | null;
  destinationTransactionUrl: string | null;
  elapsedTimeSeconds: number | null;
  sourceTransactionUrl: string | null;
  status:
    | "needs_gas"
    | "not_found"
    | "ongoing"
    | "partial_success"
    | "refund"
    | "success"
    | "unknown";
};

type SquidStatusResponse = {
  axelarTransactionUrl?: string;
  fromChain?: { transactionUrl?: string };
  message?: string;
  squidTransactionStatus?: string;
  status?: string;
  timeSpent?: { total?: number | string };
  toChain?: { transactionUrl?: string };
};

const safeExternalUrl = (value: unknown) =>
  typeof value === "string" && /^https:\/\//u.test(value) ? value : null;

export const getSquidClaimBridgeStatus = async ({
  fromChainId,
  toChainId,
  transactionHash,
}: {
  fromChainId: number;
  toChainId: number;
  transactionHash: Hex;
}): Promise<MarkeeClaimBridgeStatus> => {
  const integratorId = process.env.SQUID_INTEGRATOR_ID?.trim();
  if (!integratorId) {
    throw new MarkeeClaimExecutionError(
      "The Squid integrator ID is not configured.",
      503,
    );
  }

  const params = new URLSearchParams({
    fromChainId: fromChainId.toString(),
    toChainId: toChainId.toString(),
    transactionId: transactionHash,
  });
  const response = await fetch(`${SQUID_STATUS_URL}?${params.toString()}`, {
    cache: "no-store",
    headers: { "x-integrator-id": integratorId },
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await response.json()) as SquidStatusResponse;
  if (!response.ok) {
    console.error("[Markee claim status] Squid status request failed", {
      fromChainId,
      message: body.message ?? "No provider error message",
      status: response.status,
      toChainId,
      transactionHash,
    });
    throw new MarkeeClaimExecutionError(
      "The bridge status is temporarily unavailable.",
      502,
    );
  }

  const rawStatus = (
    body.squidTransactionStatus ??
    body.status ??
    "unknown"
  ).toLowerCase();
  const status: MarkeeClaimBridgeStatus["status"] =
    rawStatus === "success" ? "success"
    : rawStatus === "needs_gas" ? "needs_gas"
    : rawStatus === "partial_success" ? "partial_success"
    : rawStatus === "refund" || rawStatus === "refund_status" ? "refund"
    : rawStatus === "not_found" ? "not_found"
    : rawStatus === "ongoing" ? "ongoing"
    : "unknown";
  const elapsedTime = Number(body.timeSpent?.total);

  return {
    axelarTransactionUrl: safeExternalUrl(body.axelarTransactionUrl),
    destinationTransactionUrl: safeExternalUrl(body.toChain?.transactionUrl),
    elapsedTimeSeconds:
      Number.isFinite(elapsedTime) && elapsedTime >= 0 ? elapsedTime : null,
    sourceTransactionUrl: safeExternalUrl(body.fromChain?.transactionUrl),
    status,
  };
};

const getClaimBridgeDetails = ({
  chainId,
  markeeChainId,
  protocol,
  transactionHash,
}: {
  chainId: number;
  markeeChainId: number;
  protocol: MarkeeClaimExecutionQuote["bridgeProtocol"];
  transactionHash: Hex;
}) => {
  if (chainId === GNOSIS_CHAIN_ID || protocol === "lifi") {
    return {
      bridgeName: "LI.FI",
      transactionUrl: `https://scan.li.fi/tx/${transactionHash}`,
    };
  }
  if (protocol === "squid") {
    return {
      bridgeName: "Squid",
      transactionUrl: `https://axelarscan.io/gmp/${transactionHash}`,
    };
  }

  return {
    bridgeName: protocol === "across" ? "Across" : null,
    transactionUrl:
      markeeChainId === MARKEE_BASE_CHAIN_ID ?
        `https://basescan.org/tx/${transactionHash}`
      : `https://sepolia.etherscan.io/tx/${transactionHash}`,
  };
};

export class MarkeeClaimExecutionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "MarkeeClaimExecutionError";
  }
}

const requireAddress = (value: unknown, message: string) => {
  if (typeof value !== "string" || !isAddress(value)) {
    throw new MarkeeClaimExecutionError(message, 503);
  }
  const address = getAddress(value);
  if (address === zeroAddress) {
    throw new MarkeeClaimExecutionError(message, 503);
  }
  return address;
};

const getBridgeConfiguration = async ({
  chainId,
  client,
  router,
}: {
  chainId: number;
  client: ReturnType<typeof getEnvPublicClient>;
  router: Address;
}) => {
  const configuration = (await client.readContract({
    abi: gardensMarkeeRouterABI,
    address: router,
    args: [BigInt(chainId)],
    functionName: "bridgeConfiguration",
  })) as readonly [Address, number];
  const adapter = requireAddress(
    configuration[0],
    "Markee bridge adapter is not configured for this chain.",
  );
  const protocol = Number(configuration[1]);
  if (
    protocol !== BRIDGE_PROTOCOL.ACROSS &&
    protocol !== BRIDGE_PROTOCOL.SQUID &&
    protocol !== BRIDGE_PROTOCOL.LIFI
  ) {
    throw new MarkeeClaimExecutionError(
      "The configured Markee bridge protocol is not supported.",
      503,
    );
  }
  return { adapter, protocol: protocol as BridgeProtocol };
};

const getAcrossSuggestedFees = async ({
  adapter,
  amount,
  chainId,
  community,
  communityKey,
  inputToken,
  originChainId,
  outputToken,
  receiver,
}: {
  adapter: Address;
  amount: bigint;
  chainId: number;
  community: Address;
  communityKey: Hex;
  inputToken: Address;
  originChainId: number;
  outputToken: Address;
  receiver: Address;
}) => {
  const payoutId = keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "address" }, { type: "uint256" }],
      [communityKey, community, amount],
    ),
  );
  const message = encodeAbiParameters(
    [{ type: "bytes32" }, { type: "bytes32" }, { type: "address" }],
    [payoutId, communityKey, community],
  );
  const params = new URLSearchParams({
    amount: amount.toString(),
    depositor: adapter,
    destinationChainId: chainId.toString(),
    inputToken,
    message,
    originChainId: originChainId.toString(),
    outputToken,
    recipient: receiver,
  });
  const acrossApi =
    originChainId === MARKEE_SEPOLIA_CHAIN_ID ?
      "https://testnet.across.to/api"
    : "https://app.across.to/api";
  const response = await fetch(
    `${acrossApi}/suggested-fees?${params.toString()}`,
    { cache: "no-store", signal: AbortSignal.timeout(15_000) },
  );
  const body = (await response.json()) as AcrossSuggestedFeesResponse;

  if (!response.ok) {
    throw new MarkeeClaimExecutionError(
      body.message ?? "Across could not quote this testnet claim.",
      502,
    );
  }
  if (body.isAmountTooLow) {
    throw new MarkeeClaimExecutionError(
      "The community revenue is below the minimum Across bridge amount.",
      409,
    );
  }

  let outputAmount: bigint;
  let fillDeadline: number;
  try {
    outputAmount = BigInt(body.outputAmount ?? "0");
    fillDeadline = Number(body.fillDeadline);
  } catch {
    throw new MarkeeClaimExecutionError(
      "Across returned an invalid claim quote.",
      502,
    );
  }
  if (
    outputAmount <= 0n ||
    outputAmount > amount ||
    !Number.isSafeInteger(fillDeadline) ||
    fillDeadline <= Math.floor(Date.now() / 1000)
  ) {
    throw new MarkeeClaimExecutionError(
      "Across returned an invalid or expired claim quote.",
      502,
    );
  }

  return { fillDeadline, outputAmount };
};

const parseDecimalToFixed = (value: string, decimals = 18) => {
  if (!/^\d+(?:\.\d+)?$/u.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return (
    BigInt(whole) * 10n ** BigInt(decimals) +
    BigInt(fraction.slice(0, decimals).padEnd(decimals, "0"))
  );
};

const getDestinationNativeSymbol = (chainId: number) =>
  chainId === 137 ? "POL"
  : chainId === 100 ? "XDAI"
  : chainId === 42220 ? "CELO"
  : "ETH";

const getSquidRoute = async ({
  amount,
  chainId,
  community,
  communityKey,
  destinationRecipient,
  receiver,
  refundRecipient,
  squidRouter,
}: {
  amount: bigint;
  chainId: number;
  community: Address;
  communityKey: Hex;
  destinationRecipient: Address;
  receiver: Address;
  refundRecipient: Address;
  squidRouter: Address;
}) => {
  const integratorId = process.env.SQUID_INTEGRATOR_ID?.trim();
  if (!integratorId) {
    throw new MarkeeClaimExecutionError(
      "The Squid integrator ID is not configured.",
      503,
    );
  }

  const payoutId = keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "address" }, { type: "uint256" }],
      [communityKey, community, amount],
    ),
  );
  const fallbackToken = SQUID_DESTINATION_ETH_TOKENS[chainId];
  if (fallbackToken == null) {
    throw new MarkeeClaimExecutionError(
      "This destination chain does not have a configured ETH token.",
      503,
    );
  }
  const destinationTokens =
    chainId === GNOSIS_CHAIN_ID ? [fallbackToken, SQUID_NATIVE_TOKEN]
    : SQUID_NATIVE_ETH_CHAIN_IDS.has(chainId) ?
      [SQUID_NATIVE_TOKEN, fallbackToken]
    : [fallbackToken];
  let response: Awaited<ReturnType<typeof fetch>> | undefined;
  let body: SquidRouteResponse = {};
  let selectedDestinationToken: Address | undefined;

  for (const destinationToken of destinationTokens) {
    const usesNativeEth = destinationToken === SQUID_NATIVE_TOKEN;
    const postHookCalls =
      usesNativeEth ?
        [
          {
            callData: encodeFunctionData({
              abi: squidGardensRevenueReceiverABI,
              args: [payoutId, communityKey, community],
              functionName: "receiveSquidRevenue",
            }),
            callType: 2,
            chainType: "evm",
            estimatedGas: "250000",
            payload: { inputPos: 0, tokenAddress: SQUID_NATIVE_TOKEN },
            target: receiver,
            value: "0",
          },
        ]
      : [
          {
            callData: encodeFunctionData({
              abi: erc20ABI,
              args: [receiver, 0n],
              functionName: "approve",
            }),
            callType: 1,
            chainType: "evm",
            estimatedGas: "70000",
            payload: { inputPos: 1, tokenAddress: destinationToken },
            target: destinationToken,
            value: "0",
          },
          {
            callData: encodeFunctionData({
              abi: squidGardensRevenueReceiverABI,
              args: [payoutId, communityKey, community, destinationToken, 0n],
              functionName: "receiveSquidTokenRevenue",
            }),
            callType: 1,
            chainType: "evm",
            estimatedGas: "250000",
            payload: { inputPos: 4, tokenAddress: destinationToken },
            target: receiver,
            value: "0",
          },
        ];
    response = await fetch(SQUID_ROUTE_URL, {
      body: JSON.stringify({
        // Squid encodes fromAddress as the source-chain refund recipient even
        // when another contract submits the route transaction.
        fromAddress: refundRecipient,
        fromAmount: amount.toString(),
        fromChain: MARKEE_BASE_CHAIN_ID.toString(),
        fromToken: SQUID_NATIVE_TOKEN,
        postHook: {
          calls: postHookCalls,
          chainType: "evm",
          description:
            "Send Markee community revenue to the latest council Safe",
          provider: "Gardens",
        },
        quoteOnly: false,
        slippage: 1,
        toAddress: destinationRecipient,
        toChain: chainId.toString(),
        toToken: destinationToken,
      }),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "x-integrator-id": integratorId,
      },
      method: "POST",
      signal: AbortSignal.timeout(20_000),
    });
    body = (await response.json()) as SquidRouteResponse;
    const aggregateSlippage = Number(
      body.route?.estimate?.aggregateSlippage ?? 0,
    );
    const wethSlippageTooHigh =
      chainId === GNOSIS_CHAIN_ID &&
      destinationToken === fallbackToken &&
      response.ok &&
      Number.isFinite(aggregateSlippage) &&
      aggregateSlippage > SQUID_MAX_WETH_SLIPPAGE_PERCENT;
    if (response.ok && !wethSlippageTooHigh) {
      selectedDestinationToken = destinationToken;
      break;
    }
  }

  if (response == null) {
    throw new MarkeeClaimExecutionError(
      "A bridge route is temporarily unavailable. Please try again shortly.",
      502,
    );
  }
  if (!response.ok) {
    const providerMessage = body.message ?? "No provider error message";
    console.error(
      `[Markee claim quote] Squid route request failed: ${providerMessage}`,
      {
        chainId,
        community,
        message: providerMessage,
        requestId: body.requestId ?? null,
        status: response.status,
      },
    );
    throw new MarkeeClaimExecutionError(
      /low liquidity/iu.test(providerMessage) ?
        "No bridge route currently has enough liquidity for this claim. Please try again later."
      : "A bridge route is temporarily unavailable. Please try again shortly.",
      502,
    );
  }

  const estimate = body.route?.estimate;
  const transactionRequest = body.route?.transactionRequest;
  const target = requireAddress(
    transactionRequest?.target ?? transactionRequest?.targetAddress,
    "Squid returned an invalid transaction target.",
  );
  if (target !== squidRouter) {
    throw new MarkeeClaimExecutionError(
      "Squid returned an unexpected transaction target.",
      502,
    );
  }
  if (
    typeof transactionRequest?.data !== "string" ||
    !/^0x[0-9a-fA-F]+$/u.test(transactionRequest.data)
  ) {
    throw new MarkeeClaimExecutionError(
      "Squid returned invalid route calldata.",
      502,
    );
  }
  let executionValue: bigint;
  try {
    executionValue = BigInt(transactionRequest.value ?? "0");
    if (executionValue < amount) {
      throw new MarkeeClaimExecutionError(
        "Squid returned an unexpected transaction value.",
        502,
      );
    }
  } catch (error) {
    if (error instanceof MarkeeClaimExecutionError) throw error;
    throw new MarkeeClaimExecutionError(
      "Squid returned an invalid transaction value.",
      502,
    );
  }

  let expectedAmountOut: bigint;
  try {
    expectedAmountOut = BigInt(
      estimate?.toAmountMin ?? estimate?.toAmount ?? "0",
    );
  } catch {
    expectedAmountOut = 0n;
  }
  if (expectedAmountOut <= 0n) {
    throw new MarkeeClaimExecutionError(
      "Squid returned an invalid output amount.",
      502,
    );
  }

  const fromAmountUsd = parseDecimalToFixed(estimate?.fromAmountUSD ?? "");
  const toAmountUsd = parseDecimalToFixed(estimate?.toAmountUSD ?? "");
  const estimatedRouteDuration = Number(estimate?.estimatedRouteDuration);
  const estimatedRouteDurationSeconds =
    Number.isFinite(estimatedRouteDuration) && estimatedRouteDuration > 0 ?
      Math.ceil(estimatedRouteDuration)
    : undefined;
  const estimatedRouteLoss =
    fromAmountUsd != null && fromAmountUsd > 0n && toAmountUsd != null ?
      (amount *
        (fromAmountUsd > toAmountUsd ? fromAmountUsd - toAmountUsd : 0n) +
        fromAmountUsd -
        1n) /
      fromAmountUsd
    : amount > expectedAmountOut ? amount - expectedAmountOut
    : 0n;

  return {
    destinationSymbol:
      (
        chainId === GNOSIS_CHAIN_ID &&
        selectedDestinationToken === SQUID_NATIVE_TOKEN
      ) ?
        "XDAI"
      : "ETH",
    estimatedFeeAmount: estimatedRouteLoss + executionValue - amount,
    estimatedRouteDurationSeconds,
    executionValue,
    expectedAmountOut,
    routerCalldata: transactionRequest.data as Hex,
  };
};

const getLifiRoute = async ({
  adapter,
  amount,
  chainId,
  community,
  destinationRecipient,
}: {
  adapter: Address;
  amount: bigint;
  chainId: number;
  community: Address;
  destinationRecipient: Address;
}) => {
  const integratorId = process.env.LIFI_INTEGRATOR_ID?.trim();
  if (!integratorId) {
    throw new MarkeeClaimExecutionError(
      "The LI.FI integrator ID is not configured.",
      503,
    );
  }

  const params = new URLSearchParams({
    fromAddress: adapter,
    fromAmount: amount.toString(),
    fromChain: MARKEE_BASE_CHAIN_ID.toString(),
    fromToken: LIFI_NATIVE_TOKEN,
    integrator: integratorId,
    order: "CHEAPEST",
    slippage: "0.01",
    toAddress: destinationRecipient,
    toChain: chainId.toString(),
    toToken: LIFI_NATIVE_TOKEN,
  });
  const apiKey = process.env.LIFI_GARDENS_API_KEY?.trim();
  const response = await fetch(`${LIFI_QUOTE_URL}?${params.toString()}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "Gardens/1.0",
      ...(apiKey ? { "x-lifi-api-key": apiKey } : {}),
    },
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await response.json()) as LifiQuoteResponse;

  if (!response.ok) {
    const providerMessage = body.message ?? "No provider error message";
    console.error(
      `[Markee claim quote] LI.FI route request failed: ${providerMessage}`,
      {
        chainId,
        code: body.code ?? null,
        community,
        message: providerMessage,
        status: response.status,
      },
    );
    throw new MarkeeClaimExecutionError(
      /liquidity|no quote|not found/iu.test(providerMessage) ?
        "No bridge route currently has enough liquidity for this claim. Please try again later."
      : "A bridge route is temporarily unavailable. Please try again shortly.",
      502,
    );
  }

  const transactionRequest = body.transactionRequest;
  const target = requireAddress(
    transactionRequest?.to,
    "LI.FI returned an invalid transaction target.",
  );
  if (target !== LIFI_BASE_DIAMOND) {
    throw new MarkeeClaimExecutionError(
      "LI.FI returned an unexpected transaction target.",
      502,
    );
  }
  if (
    typeof transactionRequest?.data !== "string" ||
    !/^0x[0-9a-fA-F]+$/u.test(transactionRequest.data)
  ) {
    throw new MarkeeClaimExecutionError(
      "LI.FI returned invalid route calldata.",
      502,
    );
  }
  const actionFromAddress =
    body.action?.fromAddress != null && isAddress(body.action.fromAddress) ?
      getAddress(body.action.fromAddress)
    : null;
  const actionToAddress =
    body.action?.toAddress != null && isAddress(body.action.toAddress) ?
      getAddress(body.action.toAddress)
    : null;
  const transactionFromAddress =
    transactionRequest.from != null && isAddress(transactionRequest.from) ?
      getAddress(transactionRequest.from)
    : null;
  if (
    Number(transactionRequest.chainId) !== MARKEE_BASE_CHAIN_ID ||
    Number(body.action?.fromChainId) !== MARKEE_BASE_CHAIN_ID ||
    Number(body.action?.toChainId) !== chainId ||
    actionFromAddress !== adapter ||
    actionToAddress !== destinationRecipient ||
    transactionFromAddress !== adapter ||
    body.action?.fromAmount !== amount.toString()
  ) {
    throw new MarkeeClaimExecutionError(
      "LI.FI returned a route that does not match this claim.",
      502,
    );
  }

  let executionValue: bigint;
  let expectedAmountOut: bigint;
  try {
    executionValue = BigInt(transactionRequest.value ?? "0");
    expectedAmountOut = BigInt(
      body.estimate?.toAmountMin ?? body.estimate?.toAmount ?? "0",
    );
  } catch {
    throw new MarkeeClaimExecutionError(
      "LI.FI returned invalid claim amounts.",
      502,
    );
  }
  if (executionValue < amount || expectedAmountOut <= 0n) {
    throw new MarkeeClaimExecutionError(
      "LI.FI returned invalid claim amounts.",
      502,
    );
  }

  const fromAmountUsd = parseDecimalToFixed(body.estimate?.fromAmountUSD ?? "");
  const toAmountUsd = parseDecimalToFixed(body.estimate?.toAmountUSD ?? "");
  const estimatedRouteLoss =
    fromAmountUsd != null && fromAmountUsd > 0n && toAmountUsd != null ?
      (amount *
        (fromAmountUsd > toAmountUsd ? fromAmountUsd - toAmountUsd : 0n) +
        fromAmountUsd -
        1n) /
      fromAmountUsd
    : 0n;

  return {
    destinationSymbol: getDestinationNativeSymbol(chainId),
    estimatedFeeAmount: estimatedRouteLoss + executionValue - amount,
    executionValue,
    expectedAmountOut,
    routerCalldata: transactionRequest.data as Hex,
  };
};

export const getMarkeeClaimExecutionQuote = async (
  chainId: number,
  community: Address,
  recipient: Address,
  requestedClaimAmount?: bigint,
  gasCost = 0n,
): Promise<MarkeeClaimExecutionQuote> => {
  const revenue = await getCommunityRevenue(chainId, community);
  if (
    requestedClaimAmount != null &&
    (requestedClaimAmount <= 0n ||
      requestedClaimAmount > revenue.claimableAmount)
  ) {
    throw new MarkeeClaimExecutionError(
      "The authorized community revenue is no longer available.",
      409,
    );
  }
  const claimAmount = requestedClaimAmount ?? revenue.claimableAmount;
  if (claimAmount > 0n && gasCost >= claimAmount) {
    throw new MarkeeClaimExecutionError(
      "The estimated network fee is greater than the available community revenue.",
      409,
    );
  }
  const transferAmount = claimAmount - gasCost;
  const markeeChainId = getMarkeeChainId(chainId);
  const router = getMarkeeRouterAddress(chainId);
  if (router == null) {
    throw new MarkeeClaimExecutionError(
      "Markee router is not configured for this environment.",
      503,
    );
  }

  const now = Math.floor(Date.now() / 1000);
  if (claimAmount === 0n) {
    return {
      bridgeProtocol: "none",
      bridged: chainId !== markeeChainId,
      claimAmount: 0n,
      destinationSymbol:
        markeeChainId === MARKEE_BASE_CHAIN_ID ? "ETH" : (
          getDestinationNativeSymbol(chainId)
        ),
      estimatedFeeAmount: 0n,
      executionValue: 0n,
      gasCost: 0n,
      expectedAmountOut: 0n,
      expiresAt: now + 5 * 60,
      markeeChainId,
      minAmountOut: 0n,
      quoteData: "0x",
      recipient,
      router,
      symbol: "ETH",
      transferAmount: 0n,
    };
  }

  if (chainId === markeeChainId) {
    return {
      bridgeProtocol: "none",
      bridged: false,
      claimAmount,
      destinationSymbol: "ETH",
      estimatedFeeAmount: 0n,
      executionValue: 0n,
      gasCost,
      expectedAmountOut: transferAmount,
      expiresAt: now + 5 * 60,
      markeeChainId,
      minAmountOut: 0n,
      quoteData: "0x",
      recipient,
      router,
      symbol: "ETH",
      transferAmount,
    };
  }
  const client = getEnvPublicClient(markeeChainId);
  const [bridgeConfiguration, receiverResult] = await Promise.all([
    getBridgeConfiguration({ chainId, client, router }),
    client.readContract({
      abi: gardensMarkeeRouterABI,
      address: router,
      args: [BigInt(chainId)],
      functionName: "remoteReceivers",
    }),
  ]);
  const { adapter, protocol } = bridgeConfiguration;
  const receiver = requireAddress(
    receiverResult,
    "Markee destination receiver is not configured for this chain.",
  );
  const communityKey = getCommunityKey(chainId, community);

  if (protocol === BRIDGE_PROTOCOL.SQUID) {
    if (revenue.vaultAddress == null) {
      throw new MarkeeClaimExecutionError(
        "The community revenue vault is not configured.",
        503,
      );
    }
    const squidRouter = requireAddress(
      await client.readContract({
        abi: squidBridgeAdapterABI,
        address: adapter,
        functionName: "squidRouter",
      }),
      "The Squid router is not configured.",
    );
    const squidQuote = await getSquidRoute({
      amount: transferAmount,
      chainId,
      community,
      communityKey,
      destinationRecipient: recipient,
      receiver,
      refundRecipient: revenue.vaultAddress,
      squidRouter,
    });

    return {
      bridgeProtocol: "squid",
      bridged: true,
      claimAmount,
      destinationSymbol: squidQuote.destinationSymbol,
      estimatedFeeAmount: squidQuote.estimatedFeeAmount,
      estimatedRouteDurationSeconds: squidQuote.estimatedRouteDurationSeconds,
      executionValue: squidQuote.executionValue,
      gasCost,
      expectedAmountOut: squidQuote.expectedAmountOut,
      expiresAt: now + 3 * 60,
      markeeChainId,
      minAmountOut: squidQuote.expectedAmountOut,
      quoteData: encodeAbiParameters(
        [
          {
            components: [
              { name: "inputAmount", type: "uint256" },
              { name: "expectedAmountOut", type: "uint256" },
              { name: "executionValue", type: "uint256" },
              { name: "routerCalldata", type: "bytes" },
            ],
            type: "tuple",
          },
        ],
        [
          {
            expectedAmountOut: squidQuote.expectedAmountOut,
            executionValue: squidQuote.executionValue,
            inputAmount: transferAmount,
            routerCalldata: squidQuote.routerCalldata,
          },
        ],
      ),
      recipient,
      router,
      symbol: "ETH",
      transferAmount,
    };
  }

  if (protocol === BRIDGE_PROTOCOL.LIFI) {
    const lifiQuote = await getLifiRoute({
      adapter,
      amount: transferAmount,
      chainId,
      community,
      destinationRecipient: recipient,
    });

    return {
      bridgeProtocol: "lifi",
      bridged: true,
      claimAmount,
      destinationSymbol: lifiQuote.destinationSymbol,
      estimatedFeeAmount: lifiQuote.estimatedFeeAmount,
      executionValue: lifiQuote.executionValue,
      gasCost,
      expectedAmountOut: lifiQuote.expectedAmountOut,
      expiresAt: now + 60,
      markeeChainId,
      minAmountOut: lifiQuote.expectedAmountOut,
      quoteData: encodeAbiParameters(
        [
          {
            components: [
              { name: "inputAmount", type: "uint256" },
              { name: "expectedAmountOut", type: "uint256" },
              { name: "executionValue", type: "uint256" },
              { name: "routerCalldata", type: "bytes" },
            ],
            type: "tuple",
          },
        ],
        [
          {
            expectedAmountOut: lifiQuote.expectedAmountOut,
            executionValue: lifiQuote.executionValue,
            inputAmount: transferAmount,
            routerCalldata: lifiQuote.routerCalldata,
          },
        ],
      ),
      recipient,
      router,
      symbol: "ETH",
      transferAmount,
    };
  }

  if (protocol !== BRIDGE_PROTOCOL.ACROSS) {
    throw new MarkeeClaimExecutionError(
      "The configured Markee bridge protocol is not supported.",
      503,
    );
  }

  const [inputTokenResult, outputTokenResult] = await Promise.all([
    client.readContract({
      abi: acrossBridgeAdapterABI,
      address: adapter,
      functionName: "wrappedNativeToken",
    }),
    client.readContract({
      abi: acrossBridgeAdapterABI,
      address: adapter,
      args: [BigInt(chainId)],
      functionName: "destinationTokens",
    }),
  ]);
  const inputToken = requireAddress(
    inputTokenResult,
    "Markee bridge input token is not configured.",
  );
  const outputToken = requireAddress(
    outputTokenResult,
    "Markee bridge output token is not configured for this chain.",
  );
  const acrossQuote = await getAcrossSuggestedFees({
    adapter,
    amount: transferAmount,
    chainId,
    community,
    communityKey,
    inputToken,
    originChainId: markeeChainId,
    outputToken,
    receiver,
  });

  return {
    bridgeProtocol: "across",
    bridged: true,
    claimAmount,
    destinationSymbol: getDestinationNativeSymbol(chainId),
    estimatedFeeAmount: transferAmount - acrossQuote.outputAmount,
    executionValue: transferAmount,
    gasCost,
    expectedAmountOut: acrossQuote.outputAmount,
    expiresAt: acrossQuote.fillDeadline,
    markeeChainId,
    minAmountOut: acrossQuote.outputAmount,
    quoteData: encodeAbiParameters(
      [
        {
          components: [
            { name: "outputAmount", type: "uint256" },
            { name: "fillDeadline", type: "uint32" },
          ],
          type: "tuple",
        },
      ],
      [
        {
          fillDeadline: acrossQuote.fillDeadline,
          outputAmount: acrossQuote.outputAmount,
        },
      ],
    ),
    recipient,
    router,
    symbol: "ETH",
    transferAmount,
  };
};

const estimateKeeperNetworkFee = async (
  chainId: number,
  community: Address,
  quote: MarkeeClaimExecutionQuote,
) => {
  if (quote.claimAmount === 0n) return 0n;

  const privateKey = process.env.KEEPER_WALLET_PK?.trim();
  if (!privateKey || !/^0x[0-9a-fA-F]{64}$/u.test(privateKey)) {
    throw new MarkeeClaimExecutionError(
      "The Markee keeper wallet is not configured.",
      503,
    );
  }

  const account = privateKeyToAccount(privateKey as Hex);
  const estimationAddressValue = (
    quote.markeeChainId === MARKEE_SEPOLIA_CHAIN_ID ?
      process.env.MARKEE_KEEPER_ESTIMATION_ADDRESS_SEPOLIA
    : process.env.MARKEE_KEEPER_ESTIMATION_ADDRESS_BASE)?.trim();
  const estimationAccount =
    estimationAddressValue && isAddress(estimationAddressValue) ?
      getAddress(estimationAddressValue)
    : account;
  const client = getEnvPublicClient(quote.markeeChainId);
  const simulation = await client.simulateContract({
    abi: gardensMarkeeRouterABI,
    account: estimationAccount,
    address: quote.router,
    args: [
      getCommunityKey(chainId, community),
      quote.quoteData,
      quote.minAmountOut,
      quote.gasCost,
    ],
    functionName: "sweep",
    value:
      quote.bridged ? quote.executionValue - quote.transferAmount : undefined,
  });
  const [estimatedGas, gasPrice] = await Promise.all([
    client.estimateContractGas(simulation.request),
    client.getGasPrice(),
  ]);

  return (estimatedGas * gasPrice * 125n + 99n) / 100n;
};

export const executeMarkeeClaim = async ({
  chainId,
  community,
  expectedClaimAmount,
  gasCost,
  maxFeeAmount,
  recipient,
}: {
  chainId: number;
  community: Address;
  expectedClaimAmount: bigint;
  gasCost: bigint;
  maxFeeAmount: bigint;
  recipient: Address;
}) => {
  const quote = await getMarkeeClaimExecutionQuote(
    chainId,
    community,
    recipient,
    chainId === getMarkeeChainId(chainId) ? undefined : expectedClaimAmount,
    gasCost,
  );
  const claimAmountIsInvalid =
    quote.bridged ?
      quote.claimAmount !== expectedClaimAmount
    : quote.claimAmount < expectedClaimAmount;
  if (claimAmountIsInvalid) {
    throw new MarkeeClaimExecutionError(
      "The available community revenue changed. Request a new claim authorization.",
      409,
    );
  }
  if (quote.estimatedFeeAmount > maxFeeAmount) {
    throw new MarkeeClaimExecutionError(
      "Bridge fees increased above the amount authorized by the council member.",
      409,
    );
  }
  if (quote.claimAmount === 0n) {
    throw new MarkeeClaimExecutionError(
      "There is no community revenue available to claim.",
      409,
    );
  }

  const privateKey = process.env.KEEPER_WALLET_PK?.trim();
  if (!privateKey || !/^0x[0-9a-fA-F]{64}$/u.test(privateKey)) {
    throw new MarkeeClaimExecutionError(
      "The Markee keeper wallet is not configured.",
      503,
    );
  }
  const account = privateKeyToAccount(privateKey as Hex);
  const client = getEnvPublicClient(quote.markeeChainId);
  const keeperIsAuthorized = await client.readContract({
    abi: gardensMarkeeRouterABI,
    address: quote.router,
    args: [account.address],
    functionName: "keepers",
  });
  if (!keeperIsAuthorized) {
    throw new MarkeeClaimExecutionError(
      "The configured Markee keeper is not authorized by the router.",
      503,
    );
  }

  const simulation = await client.simulateContract({
    abi: gardensMarkeeRouterABI,
    account,
    address: quote.router,
    args: [
      getCommunityKey(chainId, community),
      quote.quoteData,
      quote.minAmountOut,
      quote.gasCost,
    ],
    functionName: "sweep",
    value:
      quote.bridged ? quote.executionValue - quote.transferAmount : undefined,
  });
  const estimatedGas = await client.estimateContractGas(simulation.request);
  const gas = (estimatedGas * 125n + 99n) / 100n;
  const gasPrice = await client.getGasPrice();
  const bridgeExecutionFee =
    quote.bridged ? quote.executionValue - quote.transferAmount : 0n;
  const requiredKeeperBalance =
    bridgeExecutionFee + (gas * gasPrice * 125n + 99n) / 100n;
  const keeperBalance = await client.getBalance({ address: account.address });
  if (keeperBalance < requiredKeeperBalance) {
    throw new MarkeeClaimExecutionError(
      "The Markee keeper needs more ETH to cover the transaction fee.",
      503,
    );
  }

  const walletClient = createWalletClient({
    account,
    chain: resolveClientChain(quote.markeeChainId),
    transport: http(getRpcUrlForChain(quote.markeeChainId)),
  });
  const transactionHash = await walletClient.writeContract({
    ...simulation.request,
    gas,
  });
  const receipt = await client.waitForTransactionReceipt({
    hash: transactionHash,
  });
  if (receipt.status !== "success") {
    throw new MarkeeClaimExecutionError(
      "The community revenue claim transaction reverted.",
      502,
    );
  }

  const bridgeDetails = getClaimBridgeDetails({
    chainId,
    markeeChainId: quote.markeeChainId,
    protocol: quote.bridgeProtocol,
    transactionHash,
  });

  return {
    ...bridgeDetails,
    bridged: quote.bridged,
    claimAmount: quote.claimAmount,
    estimatedFeeAmount: quote.estimatedFeeAmount,
    estimatedNetworkFeeAmount: quote.gasCost,
    estimatedRouteDurationSeconds: quote.estimatedRouteDurationSeconds,
    expectedAmountOut: quote.expectedAmountOut,
    markeeChainId: quote.markeeChainId,
    transactionHash,
  };
};

const getCommunityLeaderboard = async (
  chainId: number,
  vaultAddress: Address | null,
) => {
  if (vaultAddress == null) return null;

  const factory = getStreamingLeaderboardFactoryAddress(chainId);
  if (factory == null) {
    throw new Error(
      "Markee streaming leaderboard factory is not configured for this environment",
    );
  }

  const client = getEnvPublicClient(getMarkeeChainId(chainId));
  const leaderboardResults = await client.readContract({
    abi: streamingLeaderboardFactoryABI,
    address: factory,
    args: [0n, 1_000n],
    functionName: "getLeaderboards",
  });
  const leaderboards = leaderboardResults.filter(
    (value): value is Address => typeof value === "string" && isAddress(value),
  );

  let leaderboardAddress: Address | null = null;
  for (const candidate of leaderboards) {
    const beneficiary = await client.readContract({
      abi: streamingLeaderboardABI,
      address: candidate,
      functionName: "beneficiaryAddress",
    });
    if (
      typeof beneficiary === "string" &&
      isAddress(beneficiary) &&
      getAddress(beneficiary) === vaultAddress
    ) {
      leaderboardAddress = getAddress(candidate);
      break;
    }
  }

  if (leaderboardAddress == null) return null;

  const minimumMonthlyRate = await client.readContract({
    abi: streamingLeaderboardABI,
    address: leaderboardAddress,
    functionName: "minimumMonthlyRate",
  });
  const maxMessageLength = await client.readContract({
    abi: streamingLeaderboardABI,
    address: leaderboardAddress,
    functionName: "maxMessageLength",
  });
  const maxNameLength = await client.readContract({
    abi: streamingLeaderboardABI,
    address: leaderboardAddress,
    functionName: "maxNameLength",
  });
  const topMarkeeResult = await client.readContract({
    abi: streamingLeaderboardABI,
    address: leaderboardAddress,
    functionName: "topMarkee",
  });
  const topRate = await client.readContract({
    abi: streamingLeaderboardABI,
    address: leaderboardAddress,
    functionName: "topRate",
  });
  const topMarkeeAddress =
    (
      typeof topMarkeeResult === "string" &&
      isAddress(topMarkeeResult) &&
      getAddress(topMarkeeResult) !== zeroAddress
    ) ?
      getAddress(topMarkeeResult)
    : null;
  const [message, name, topMarkeeOwnerResult] =
    topMarkeeAddress == null ?
      (["", "", null] as const)
    : await Promise.all([
        client.readContract({
          abi: markeeABI,
          address: topMarkeeAddress,
          functionName: "message",
        }),
        client.readContract({
          abi: markeeABI,
          address: topMarkeeAddress,
          functionName: "name",
        }),
        client.readContract({
          abi: markeeABI,
          address: topMarkeeAddress,
          functionName: "owner",
        }),
      ]);
  const topMarkeeOwner =
    (
      typeof topMarkeeOwnerResult === "string" &&
      isAddress(topMarkeeOwnerResult)
    ) ?
      getAddress(topMarkeeOwnerResult)
    : null;

  return {
    address: leaderboardAddress,
    maxMessageLength,
    maxNameLength,
    message,
    name,
    minimumMonthlyRate,
    topMarkeeAddress,
    topMarkeeOwner,
    topRate,
  };
};

export const markeeAdapter = {
  async getCommunityIntegration(chainId: number, community: Address) {
    const revenue = await getCommunityRevenue(chainId, community);
    const leaderboard = await getCommunityLeaderboard(
      chainId,
      revenue.vaultAddress,
    );

    return {
      integration: {
        leaderboardAddress: leaderboard?.address ?? null,
        status:
          leaderboard == null ?
            ("not_integrated" as const)
          : ("active" as const),
        vaultAddress: revenue.vaultAddress,
      },
      leaderboard: {
        maxMessageLength: (leaderboard?.maxMessageLength ?? 0n).toString(),
        maxNameLength: (leaderboard?.maxNameLength ?? 0n).toString(),
        message: leaderboard?.message ?? "",
        name: leaderboard?.name ?? "",
        minimumMonthlyRate: (leaderboard?.minimumMonthlyRate ?? 0n).toString(),
        topMarkeeAddress: leaderboard?.topMarkeeAddress ?? null,
        topMarkeeOwner: leaderboard?.topMarkeeOwner ?? null,
        topRate: (leaderboard?.topRate ?? 0n).toString(),
      },
      markeeChainId: getMarkeeChainId(chainId),
      preview: leaderboard == null,
      revenue: {
        claimableAmount: revenue.claimableAmount.toString(),
        symbol: "ETH" as const,
      },
    };
  },

  async getClaimQuote(chainId: number, community: Address, recipient: Address) {
    const preliminaryQuote = await getMarkeeClaimExecutionQuote(
      chainId,
      community,
      recipient,
    );
    let estimatedNetworkFeeAmount = await estimateKeeperNetworkFee(
      chainId,
      community,
      preliminaryQuote,
    );
    let quote =
      (
        preliminaryQuote.claimAmount > 0n &&
        estimatedNetworkFeeAmount < preliminaryQuote.claimAmount
      ) ?
        await getMarkeeClaimExecutionQuote(
          chainId,
          community,
          recipient,
          preliminaryQuote.claimAmount,
          estimatedNetworkFeeAmount,
        )
      : { ...preliminaryQuote, expectedAmountOut: 0n };

    // The preliminary zero-cost simulation skips the router's keeper payment.
    // Refine the estimate once with that branch active, then rebuild the route
    // so only the source-chain gas reimbursement is removed before bridging.
    if (quote.gasCost > 0n) {
      estimatedNetworkFeeAmount = await estimateKeeperNetworkFee(
        chainId,
        community,
        quote,
      );
      quote =
        estimatedNetworkFeeAmount < preliminaryQuote.claimAmount ?
          await getMarkeeClaimExecutionQuote(
            chainId,
            community,
            recipient,
            preliminaryQuote.claimAmount,
            estimatedNetworkFeeAmount,
          )
        : { ...preliminaryQuote, expectedAmountOut: 0n };
    }

    return {
      bridgeProtocol: quote.bridgeProtocol,
      bridged: quote.bridged,
      claimAmount: quote.claimAmount,
      destinationSymbol: quote.destinationSymbol,
      estimatedFeeAmount: quote.estimatedFeeAmount,
      estimatedRouteDurationSeconds: quote.estimatedRouteDurationSeconds,
      estimatedNetworkFeeAmount,
      expectedAmountOut: quote.expectedAmountOut,
      expiresAt: quote.expiresAt,
      markeeChainId: quote.markeeChainId,
      recipient: quote.recipient,
      symbol: quote.symbol,
    };
  },
};

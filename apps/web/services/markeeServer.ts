import {
  Address,
  createWalletClient,
  encodeAbiParameters,
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
const GARDENS_TESTNET_CHAIN_IDS = new Set([421614, 11155420, 11155111]);

const isTestnetCommunity = (chainId?: number) =>
  chainId != null && GARDENS_TESTNET_CHAIN_IDS.has(chainId);

export const getMarkeeChainId = (communityChainId?: number) =>
  isTestnetCommunity(communityChainId) ? MARKEE_SEPOLIA_CHAIN_ID
  : process.env.NEXT_PUBLIC_ENV_GARDENS === "prod" ? MARKEE_BASE_CHAIN_ID
  : MARKEE_SEPOLIA_CHAIN_ID;

const gardensMarkeeRouterABI = parseAbi([
  "function communityVault(bytes32 communityKey) view returns (address vault)",
  "function bridgeAdapter() view returns (address)",
  "function keepers(address keeper) view returns (bool)",
  "function remoteReceivers(uint256 chainId) view returns (address)",
  "function sweep(bytes32 communityKey, bytes quoteData, uint256 minAmountOut)",
]);

const acrossBridgeAdapterABI = parseAbi([
  "function wrappedNativeToken() view returns (address)",
  "function destinationTokens(uint256 chainId) view returns (address)",
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

export type MarkeeClaimExecutionQuote = {
  bridged: boolean;
  claimAmount: bigint;
  estimatedFeeAmount: bigint;
  expiresAt: number;
  markeeChainId: number;
  minAmountOut: bigint;
  quoteData: Hex;
  recipient: Address;
  router: Address;
  symbol: "ETH";
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

const getAcrossSuggestedFees = async ({
  adapter,
  amount,
  chainId,
  community,
  communityKey,
  inputToken,
  outputToken,
  receiver,
}: {
  adapter: Address;
  amount: bigint;
  chainId: number;
  community: Address;
  communityKey: Hex;
  inputToken: Address;
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
    originChainId: MARKEE_SEPOLIA_CHAIN_ID.toString(),
    outputToken,
    recipient: receiver,
  });
  const response = await fetch(
    `https://testnet.across.to/api/suggested-fees?${params.toString()}`,
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

export const getMarkeeClaimExecutionQuote = async (
  chainId: number,
  community: Address,
  recipient: Address,
): Promise<MarkeeClaimExecutionQuote> => {
  const revenue = await getCommunityRevenue(chainId, community);
  const markeeChainId = getMarkeeChainId(chainId);
  const router = getMarkeeRouterAddress(chainId);
  if (router == null) {
    throw new MarkeeClaimExecutionError(
      "Markee router is not configured for this environment.",
      503,
    );
  }

  const now = Math.floor(Date.now() / 1000);
  if (revenue.claimableAmount === 0n) {
    return {
      bridged: chainId !== markeeChainId,
      claimAmount: 0n,
      estimatedFeeAmount: 0n,
      expiresAt: now + 5 * 60,
      markeeChainId,
      minAmountOut: 0n,
      quoteData: "0x",
      recipient,
      router,
      symbol: "ETH",
    };
  }

  if (chainId === markeeChainId) {
    return {
      bridged: false,
      claimAmount: revenue.claimableAmount,
      estimatedFeeAmount: 0n,
      expiresAt: now + 5 * 60,
      markeeChainId,
      minAmountOut: 0n,
      quoteData: "0x",
      recipient,
      router,
      symbol: "ETH",
    };
  }
  if (markeeChainId !== MARKEE_SEPOLIA_CHAIN_ID) {
    throw new MarkeeClaimExecutionError(
      "Production Markee bridge execution is not configured yet.",
      503,
    );
  }

  const client = getEnvPublicClient(markeeChainId);
  const [adapterResult, receiverResult] = await Promise.all([
    client.readContract({
      abi: gardensMarkeeRouterABI,
      address: router,
      functionName: "bridgeAdapter",
    }),
    client.readContract({
      abi: gardensMarkeeRouterABI,
      address: router,
      args: [BigInt(chainId)],
      functionName: "remoteReceivers",
    }),
  ]);
  const adapter = requireAddress(
    adapterResult,
    "Markee bridge adapter is not configured.",
  );
  const receiver = requireAddress(
    receiverResult,
    "Markee destination receiver is not configured for this chain.",
  );
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
  const communityKey = getCommunityKey(chainId, community);
  const acrossQuote = await getAcrossSuggestedFees({
    adapter,
    amount: revenue.claimableAmount,
    chainId,
    community,
    communityKey,
    inputToken,
    outputToken,
    receiver,
  });

  return {
    bridged: true,
    claimAmount: revenue.claimableAmount,
    estimatedFeeAmount: revenue.claimableAmount - acrossQuote.outputAmount,
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
    ],
    functionName: "sweep",
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
  maxFeeAmount,
  recipient,
}: {
  chainId: number;
  community: Address;
  expectedClaimAmount: bigint;
  maxFeeAmount: bigint;
  recipient: Address;
}) => {
  const quote = await getMarkeeClaimExecutionQuote(
    chainId,
    community,
    recipient,
  );
  if (quote.claimAmount !== expectedClaimAmount) {
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
    ],
    functionName: "sweep",
  });
  const estimatedGas = await client.estimateContractGas(simulation.request);
  const gas = (estimatedGas * 125n + 99n) / 100n;
  const gasPrice = await client.getGasPrice();
  const requiredKeeperBalance = (gas * gasPrice * 125n + 99n) / 100n;
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

  return {
    bridged: quote.bridged,
    claimAmount: quote.claimAmount,
    estimatedFeeAmount: quote.estimatedFeeAmount,
    expectedAmountOut: quote.claimAmount - quote.estimatedFeeAmount,
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
    const quote = await getMarkeeClaimExecutionQuote(
      chainId,
      community,
      recipient,
    );
    const estimatedNetworkFeeAmount = await estimateKeeperNetworkFee(
      chainId,
      community,
      quote,
    );

    return {
      bridged: quote.bridged,
      claimAmount: quote.claimAmount,
      estimatedFeeAmount: quote.estimatedFeeAmount,
      estimatedNetworkFeeAmount,
      expiresAt: quote.expiresAt,
      markeeChainId: quote.markeeChainId,
      recipient: quote.recipient,
      symbol: quote.symbol,
    };
  },
};

import {
  Address,
  getAddress,
  Hex,
  isAddress,
  parseAbi,
  zeroAddress,
} from "viem";
import { getEnvPublicClient } from "@/utils/publicClient";

export const GNOSIS_WETH = getAddress(
  "0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1",
);
export const erc20ABI = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);
export const deliveryABI = parseAbi([
  "function registryCommunity() view returns (address)",
  "function token() view returns (address)",
  "function deliver() returns (uint256)",
  "function totalDelivered() view returns (uint256)",
]);
export const relayAdapterABI = parseAbi([
  "function communityVaults(bytes32) view returns (address)",
  "event RelayRouteStarted(bytes32 indexed orderId, bytes32 indexed communityKey, address indexed vault, uint256 amountOut)",
]);

export function getDeliveryAdapter(): Address | null {
  const value = process.env.MARKEE_LIFI_DELIVERY_ADAPTER_BASE?.trim();
  return value && isAddress(value) && value !== zeroAddress ?
      getAddress(value)
    : null;
}

export async function getCommunityDeliveryVault(
  adapter: Address,
  communityKey: Hex,
  community: Address,
): Promise<Address> {
  const vault = getAddress(
    await getEnvPublicClient(8453).readContract({
      address: adapter,
      abi: relayAdapterABI,
      functionName: "communityVaults",
      args: [communityKey],
    }),
  );
  if (vault === zeroAddress)
    throw new Error("The community delivery vault is not configured.");
  const client = getEnvPublicClient(100);
  const [boundCommunity, token] = await Promise.all([
    client.readContract({
      address: vault,
      abi: deliveryABI,
      functionName: "registryCommunity",
    }),
    client.readContract({
      address: vault,
      abi: deliveryABI,
      functionName: "token",
    }),
  ]);
  if (
    getAddress(boundCommunity) !== getAddress(community) ||
    getAddress(token) !== GNOSIS_WETH
  )
    throw new Error(
      "The delivery vault does not match this community and token.",
    );
  return vault;
}

/** Does not submit transactions. The adapter validates the actual executable route again. */
export async function requestRelayQuote({
  adapter,
  vault,
  amount,
  signal,
}: {
  adapter: Address;
  vault: Address;
  amount: bigint;
  signal?: AbortSignal;
}) {
  const params = new URLSearchParams({
    fromChain: "8453",
    toChain: "100",
    fromToken: zeroAddress,
    toToken: GNOSIS_WETH,
    fromAddress: adapter,
    toAddress: vault,
    fromAmount: amount.toString(),
    integrator: "gardens",
    allowBridges: "relaydepository",
    slippage: "0.01",
    order: "CHEAPEST",
  });
  const response = await fetch(`https://li.quest/v1/quote?${params}`, {
    cache: "no-store",
    signal,
    headers: {
      Accept: "application/json",
      ...(process.env.LIFI_GARDENS_API_KEY ?
        { "x-lifi-api-key": process.env.LIFI_GARDENS_API_KEY.trim() }
      : {}),
    },
  });
  const body = await response.json();
  if (!response.ok) return { response, body };
  const tx = body.transactionRequest;
  if (
    body.tool !== "relaydepository" ||
    Number(body.action?.fromChainId) !== 8453 ||
    Number(body.action?.toChainId) !== 100 ||
    String(body.action?.fromAddress).toLowerCase() !== adapter.toLowerCase() ||
    String(body.action?.toAddress).toLowerCase() !== vault.toLowerCase() ||
    String(body.action?.fromToken?.address).toLowerCase() !== zeroAddress ||
    String(body.action?.toToken?.address).toLowerCase() !==
      GNOSIS_WETH.toLowerCase() ||
    Number(tx?.chainId) !== 8453 ||
    String(tx?.from).toLowerCase() !== adapter.toLowerCase() ||
    String(tx?.to).toLowerCase() !==
      "0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae" ||
    !/^0xa3443faa[0-9a-f]+$/iu.test(tx?.data ?? "")
  )
    throw new Error(
      "LI.FI returned a route that does not match the community delivery vault.",
    );
  const input = BigInt(body.action.fromAmount);
  const output = BigInt(body.estimate?.toAmountMin ?? "0");
  if (
    input !== amount ||
    BigInt(tx.value) !== amount ||
    output < 1_000_000_000_000n ||
    output > amount
  )
    throw new Error(
      "LI.FI returned invalid delivery amounts or an output below the automatic delivery minimum (0.000001 WETH).",
    );
  return {
    response,
    body,
    quote: {
      inputAmount: amount,
      executionValue: amount,
      expectedAmountOut: output,
      estimatedFeeAmount: amount - output,
      destinationSymbol: "WETH",
      routerCalldata: tx.data as Hex,
    },
  };
}

export async function deliveryBalance(vault: Address, blockNumber?: bigint) {
  return getEnvPublicClient(100).readContract({
    address: GNOSIS_WETH,
    abi: erc20ABI,
    functionName: "balanceOf",
    args: [vault],
    blockNumber,
  });
}

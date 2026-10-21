import {
  Address,
  decodeEventLog,
  encodeAbiParameters,
  getAddress,
  Hex,
  isHex,
  keccak256,
} from "viem";
import type { MarkeeClaimBridgeStatusResponse } from "./markee";
import {
  deliveryABI,
  erc20ABI,
  GNOSIS_WETH,
  getCommunityDeliveryVault,
  getDeliveryAdapter,
  relayAdapterABI,
} from "./markeeDelivery";
import { getEnvPublicClient } from "@/utils/publicClient";

/** Read-only: provider completion alone never proves community delivery. */
export async function getMarkeeDeliveryStatus(
  community: Address,
  hash: Hex,
): Promise<MarkeeClaimBridgeStatusResponse> {
  const result: MarkeeClaimBridgeStatusResponse = {
    status: "ongoing",
    axelarTransactionUrl: null,
    destinationTransactionUrl: null,
    elapsedTimeSeconds: null,
    sourceTransactionUrl: `https://basescan.org/tx/${hash}`,
  };
  const adapter = getDeliveryAdapter();
  if (!adapter) return { ...result, status: "unknown" };
  const base = getEnvPublicClient(8453);
  const source = await base.getTransactionReceipt({ hash });
  if (source.status !== "success") return { ...result, status: "unknown" };
  if ((await base.getBlockNumber()) < source.blockNumber + 1n) return result;
  const key = keccak256(
    encodeAbiParameters(
      [{ type: "uint256" }, { type: "address" }],
      [100n, community],
    ),
  );
  const vault = await getCommunityDeliveryVault(adapter, key, community);
  const starts = source.logs.flatMap((log) => {
    if (getAddress(log.address) !== adapter) return [];
    try {
      const event = decodeEventLog({
        abi: relayAdapterABI,
        eventName: "RelayRouteStarted",
        data: log.data,
        topics: log.topics,
      });
      return (
          event.args.communityKey === key &&
            getAddress(event.args.vault) === vault
        ) ?
          [event.args]
        : [];
    } catch {
      return [];
    }
  });
  if (starts.length !== 1) return { ...result, status: "unknown" };
  const params = new URLSearchParams({
    txHash: hash,
    fromChain: "8453",
    toChain: "100",
    bridge: "relaydepository",
  });
  const response = await fetch(`https://li.quest/v1/status?${params}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("Bridge status provider unavailable.");
  const body = await response.json();
  if (
    body.sending?.txHash &&
    String(body.sending.txHash).toLowerCase() !== hash.toLowerCase()
  )
    throw new Error("Bridge status refers to a different source transaction.");
  if (body.status === "PENDING" || body.status === "NOT_FOUND") return result;
  if (body.status !== "DONE") return { ...result, status: "unknown" };
  if (body.substatus === "REFUNDED") return { ...result, status: "refund" };
  if (body.substatus !== "COMPLETED")
    return { ...result, status: "partial_success" };
  const destinationHash = body.receiving?.txHash;
  if (
    Number(body.receiving?.chainId) !== 100 ||
    !isHex(destinationHash) ||
    destinationHash.length !== 66
  )
    throw new Error("Invalid bridge delivery receipt.");
  const gnosis = getEnvPublicClient(100);
  const receipt = await gnosis.getTransactionReceipt({ hash: destinationHash });
  const confirmedBlock = (await gnosis.getBlockNumber()) - 1n;
  if (receipt.status !== "success" || confirmedBlock < receipt.blockNumber)
    return result;
  const received = receipt.logs.reduce((sum, log) => {
    if (getAddress(log.address) !== GNOSIS_WETH) return sum;
    try {
      const event = decodeEventLog({
        abi: erc20ABI,
        eventName: "Transfer",
        data: log.data,
        topics: log.topics,
      });
      return getAddress(event.args.to) === vault ? sum + event.args.value : sum;
    } catch {
      return sum;
    }
  }, 0n);
  if (received < starts[0].amountOut)
    throw new Error(
      "Bridge receipt does not prove arrival in the community vault.",
    );
  // Cumulative accounting also handles multiple arrivals and delivery in the
  // same block. A later deposit cannot make an older delivery look incomplete.
  const [deliveredAtArrival, remainingAtArrival, deliveredNow] =
    await Promise.all([
      gnosis.readContract({
        address: vault,
        abi: deliveryABI,
        functionName: "totalDelivered",
        blockNumber: receipt.blockNumber,
      }),
      gnosis.readContract({
        address: GNOSIS_WETH,
        abi: erc20ABI,
        functionName: "balanceOf",
        args: [vault],
        blockNumber: receipt.blockNumber,
      }),
      gnosis.readContract({
        address: vault,
        abi: deliveryABI,
        functionName: "totalDelivered",
        blockNumber: confirmedBlock,
      }),
    ]);
  return {
    ...result,
    destinationTransactionUrl: `https://gnosisscan.io/tx/${destinationHash}`,
    status:
      deliveredNow >= deliveredAtArrival + remainingAtArrival ?
        "success"
      : "awaiting_delivery",
  };
}

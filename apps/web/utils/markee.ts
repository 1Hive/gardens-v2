import { Address, createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { chainConfigMap } from "@/configs/chains";

export const GARDENS_LEADERBOARD =
  "0x2768BC6e90266248BD8bCF5401C36D8049CdF671" as Address;

export const MarkeeNetwork = base;

export type MarkeeEntry = {
  id: string;
  address: string; // individual markee contract address — used as the views key
  message: string;
  name: string;
  totalFundsAdded: string;
};

const LEADERBOARD_ABI = [
  {
    inputs: [{ name: "limit", type: "uint256" }],
    name: "getTopMarkees",
    outputs: [
      { name: "topAddresses", type: "address[]" },
      { name: "topFunds", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "minimumPrice",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const MARKEE_READ_ABI = [
  {
    inputs: [],
    name: "message",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalFundsAdded",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const rpc = chainConfigMap[MarkeeNetwork.id].rpcUrl;
const client = createPublicClient({ chain: base, transport: http(rpc) });

export async function fetchMarkeeSignData(leaderboardAddress: Address) {
  const [addresses, funds] = await client.readContract({
    address: leaderboardAddress,
    abi: LEADERBOARD_ABI,
    functionName: "getTopMarkees",
    args: [1n],
  });

  const minimumPrice = await client.readContract({
    address: leaderboardAddress,
    abi: LEADERBOARD_ABI,
    functionName: "minimumPrice",
  });

  if (!addresses[0]) {
    return { minimumPrice: minimumPrice.toString(), markees: [] };
  }

  const topAddr = addresses[0];
  const results = await client.multicall({
    contracts: [
      { address: topAddr, abi: MARKEE_READ_ABI, functionName: "message" },
      { address: topAddr, abi: MARKEE_READ_ABI, functionName: "name" },
    ],
    allowFailure: true,
  });

  const message = results[0].status === "success" ? results[0].result : "";
  const name = results[1].status === "success" ? results[1].result : "";

  return {
    minimumPrice: minimumPrice.toString(),
    markees: [
      {
        id: topAddr.toLowerCase(),
        address: topAddr.toLowerCase(),
        message,
        name,
        totalFundsAdded: (funds[0] ?? 0n).toString(),
      },
    ] as MarkeeEntry[],
  };
}

export async function fetchMarkeeLeaderboard(leaderboardAddress: Address) {
  const [addresses, funds] = await client.readContract({
    address: leaderboardAddress,
    abi: LEADERBOARD_ABI,
    functionName: "getTopMarkees",
    args: [10n],
  });

  if (!addresses.length) return [];

  const markeeCalls = addresses.flatMap((addr) => [
    { address: addr, abi: MARKEE_READ_ABI, functionName: "message" as const },
    { address: addr, abi: MARKEE_READ_ABI, functionName: "name" as const },
  ]);

  const results = await client.multicall({
    contracts: markeeCalls,
    allowFailure: true,
  });

  return addresses
    .map((addr, i) => ({
      id: addr.toLowerCase(),
      address: addr.toLowerCase(),
      message:
        results[i * 2].status === "success" ? results[i * 2].result ?? "" : "",
      name:
        results[i * 2 + 1].status === "success" ?
          results[i * 2 + 1].result ?? ""
        : "",
      totalFundsAdded: (funds[i] ?? 0n).toString(),
    }))
    .filter((entry) => entry.message.trim() !== "");
}

// ─── View Tracking ────────────────────────────────────────────────────────────
// Centralized on markee.xyz. Views are keyed by individual markee contract
// address (markee.address), not the leaderboard address — matching markee.xyz.

const MARKEE_VIEWS_URL = "https://www.markee.xyz/api/views";

/**
 * Record a view for an individual markee contract address + current message.
 * Pass markee.address (the individual markee contract), not the leaderboard address.
 * Fire-and-forget safe — errors are swallowed by the caller.
 */
export async function recordMarkeeView(
  markeeAddress: string,
  message: string,
): Promise<{ totalViews: number; messageViews: number; counted: boolean }> {
  const res = await fetch(MARKEE_VIEWS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: markeeAddress, message }),
  });
  return res.json();
}

/**
 * Fetch total view counts for one or more individual markee contract addresses.
 * Returns a map of address → { totalViews }.
 */
export async function fetchMarkeeViews(
  markeeAddresses: string[],
): Promise<Record<string, { totalViews: number }>> {
  if (markeeAddresses.length === 0) return {};
  const param = markeeAddresses.map((a) => a.toLowerCase()).join(",");
  const res = await fetch(`${MARKEE_VIEWS_URL}?addresses=${param}`);
  return res.json();
}

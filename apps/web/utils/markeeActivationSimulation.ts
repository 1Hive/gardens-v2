import { Address, parseAbi } from "viem";
import { getEnvPublicClient } from "@/utils/publicClient";

// Public Base deployment addresses from pkg/contracts/config/networks.json and
// pkg/contracts/script/DeployGardensMarkeeRouter.s.sol. This is an eth_call only.
const BASE_CHAIN_ID = 8453;
const BASE_ROUTER: Address = "0xa9d9b3a9CE7edA7000A4baD8Af0863F716eA9d30";
const BASE_KEEPER: Address = "0xb5f2B971878dD2Bc8A0c53635f33280F34C41F2A";
const createLeaderboardABI = parseAbi([
  "function createCommunityLeaderboard(uint256 communityChainId, address registryCommunity, string leaderboardName, string platformId) returns (address vault, address leaderboard, address seedMarkee)",
]);

export async function simulateCommunityMarkeeActivation({
  chainId,
  community,
  markeeChainId,
}: {
  chainId: number;
  community: Address;
  markeeChainId: number;
}) {
  if (markeeChainId !== BASE_CHAIN_ID) {
    throw new Error("Activation simulation is available when Markee runs on Base.");
  }

  const client = getEnvPublicClient(markeeChainId);
  const { result } = await client.simulateContract({
    abi: createLeaderboardABI,
    account: BASE_KEEPER,
    address: BASE_ROUTER,
    args: [BigInt(chainId), community, "Gardens Community", "Gardens"],
    functionName: "createCommunityLeaderboard",
  });

  return {
    chainId: markeeChainId,
    router: BASE_ROUTER,
    executor: BASE_KEEPER,
    vault: result[0],
    leaderboard: result[1],
    seedMarkee: result[2],
  };
}

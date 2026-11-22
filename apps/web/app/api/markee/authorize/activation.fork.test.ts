import { createPublicClient, http, parseAbi } from "viem";
import { base, celo } from "viem/chains";
import { describe, expect, it } from "vitest";

// Start two Anvil forks with network access, then opt in with:
// MARKEE_CELO_FORK_RPC=http://127.0.0.1:8557
// MARKEE_BASE_FORK_RPC=http://127.0.0.1:8558
// pnpm exec vitest run app/api/markee/authorize/activation.fork.test.ts
// Only reads and eth_call simulations; no signed or broadcast transactions.
const celoRpc = process.env.MARKEE_CELO_FORK_RPC;
const baseRpc = process.env.MARKEE_BASE_FORK_RPC;
const community = "0x215b9ed0182d200563921f46ecbcb86111e9ad6b";
const council = "0x705a58f9c33d0a5be425b87dc34b157c508fe467";
const router = "0xa9d9b3a9CE7edA7000A4baD8Af0863F716eA9d30";
const keeper = "0xb5f2B971878dD2Bc8A0c53635f33280F34C41F2A";

describe.skipIf(!celoRpc || !baseRpc)(
  "GoodDollar activation on Celo and Base forks",
  () => {
    it("resolves the live council and owners, then simulates leaderboard creation", async () => {
      for (const rpc of [celoRpc!, baseRpc!]) {
        expect(rpc).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/u);
        const response = await fetch(rpc, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "web3_clientVersion",
            params: [],
          }),
        });
        expect((await response.json()).result).toMatch(/anvil/iu);
      }
      const communityClient = createPublicClient({
        chain: celo,
        transport: http(celoRpc!),
      });
      const markeeClient = createPublicClient({
        chain: base,
        transport: http(baseRpc!),
      });
      expect(await communityClient.getChainId()).toBe(celo.id);
      expect(await markeeClient.getChainId()).toBe(base.id);
      expect(
        (
          await communityClient.readContract({
            address: community,
            abi: parseAbi(["function councilSafe() view returns (address)"]),
            functionName: "councilSafe",
          })
        ).toLowerCase(),
      ).toBe(council);
      const safeAbi = parseAbi([
        "function getOwners() view returns (address[])",
        "function getThreshold() view returns (uint256)",
        "function isOwner(address) view returns (bool)",
      ]);
      expect(
        await communityClient.readContract({
          address: council,
          abi: safeAbi,
          functionName: "getThreshold",
        }),
      ).toBe(1n);
      const owners = await communityClient.readContract({
        address: council,
        abi: safeAbi,
        functionName: "getOwners",
      });
      expect(owners.length).toBeGreaterThan(0);
      for (const owner of owners) {
        expect(
          await communityClient.readContract({
            address: council,
            abi: safeAbi,
            functionName: "isOwner",
            args: [owner],
          }),
        ).toBe(true);
      }
      const { result } = await markeeClient.simulateContract({
        account: keeper,
        address: router,
        abi: parseAbi([
          "function createCommunityLeaderboard(uint256,address,string,string) returns (address vault,address leaderboard,address seedMarkee)",
        ]),
        functionName: "createCommunityLeaderboard",
        args: [BigInt(celo.id), community, "Gardens Community", "Gardens"],
      });
      for (const address of result)
        expect(address).not.toBe("0x0000000000000000000000000000000000000000");
    }, 60_000);
  },
);

import { afterEach, describe, expect, it, vi } from "vitest";
import { getEnvPublicClient } from "@/utils/publicClient";
import { simulateCommunityMarkeeActivation } from "./markeeActivationSimulation";

vi.mock("@/utils/publicClient", () => ({ getEnvPublicClient: vi.fn() }));

const community = "0x215b9ed0182d200563921f46ecbcb86111e9ad6b";
const keeper = "0xb5f2B971878dD2Bc8A0c53635f33280F34C41F2A";
const router = "0xa9d9b3a9CE7edA7000A4baD8Af0863F716eA9d30";
const result = [
  "0x374c871CF6a61C125c362072F3631834939b8eF1",
  "0x0964EEf07615bEF191A210dd6e43b26d9F36c8eB",
  "0x1CF2aD8A8c873A4A2D6Cc0d36A9b4d943778D72d",
] as const;

describe("simulated Markee activation", () => {
  const simulateContract = vi.fn();
  afterEach(() => vi.clearAllMocks());

  it("uses the Base keeper and the same creation arguments as activation", async () => {
    simulateContract.mockResolvedValue({ result });
    vi.mocked(getEnvPublicClient).mockReturnValue({ simulateContract } as never);

    const simulation = await simulateCommunityMarkeeActivation({
      chainId: 42220,
      community,
      markeeChainId: 8453,
    });

    expect(getEnvPublicClient).toHaveBeenCalledWith(8453);
    expect(simulateContract).toHaveBeenCalledWith(
      expect.objectContaining({
        account: keeper,
        address: router,
        args: [42220n, community, "Gardens Community", "Gardens"],
        functionName: "createCommunityLeaderboard",
      }),
    );
    expect(simulation).toMatchObject({
      executor: keeper,
      router,
      vault: result[0],
      leaderboard: result[1],
      seedMarkee: result[2],
    });
  });

  it("does not attempt a call on an unconfigured Markee chain", async () => {
    await expect(
      simulateCommunityMarkeeActivation({
        chainId: 11155111,
        community,
        markeeChainId: 11155111,
      }),
    ).rejects.toThrow("Markee runs on Base");
    expect(getEnvPublicClient).not.toHaveBeenCalled();
  });
});

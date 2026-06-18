import { describe, expect, it } from "vitest";
import { PendingIndexedPublish } from "@/contexts/pubsub.context";
import { createMemberOptimisticProjector } from "./optimisticMembers";

const baseRecord = (
  overrides: Partial<PendingIndexedPublish>,
): PendingIndexedPublish => ({
  txHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
  blockNumber: "100",
  chainId: 42220,
  createdAt: 1,
  publishPayload: {
    topic: "member",
    type: "update",
    containerId: "0xcommunity",
    chainId: 42220,
  },
  ...overrides,
});

describe("optimistic member projector", () => {
  it("adds a pending community membership to member and community views", () => {
    const apply = createMemberOptimisticProjector({
      communityId: "0xcommunity",
      memberAddress: "0xmember",
    });

    const result: any = apply(
      {
        member: null,
        registryCommunity: {
          id: "0xcommunity",
          membersCount: "0",
          members: [],
        },
      },
      [
        baseRecord({
          optimistic: {
            kind: "community-member",
            communityId: "0xcommunity",
            memberAddress: "0xmember",
            isRegistered: true,
            stakedTokens: "100",
          },
        }),
      ],
    );

    expect(result?.member?.memberCommunity[0]).toMatchObject({
      isRegistered: true,
      stakedTokens: "100",
      registryCommunity: { id: "0xcommunity" },
    });
    expect(result?.registryCommunity.members).toEqual([
      {
        id: "0xmember",
        memberAddress: "0xmember",
        stakedTokens: "100",
      },
    ]);
    expect(result?.registryCommunity.membersCount).toBe("1");
  });

  it("removes a pending unregistered member from community member lists", () => {
    const apply = createMemberOptimisticProjector({
      communityId: "0xcommunity",
      memberAddress: "0xmember",
    });

    const result: any = apply(
      {
        member: {
          id: "0xmember",
          memberCommunity: [
            {
              isRegistered: true,
              stakedTokens: "100",
              registryCommunity: { id: "0xcommunity" },
            },
          ],
        },
        registryCommunity: {
          id: "0xcommunity",
          membersCount: "1",
          members: [
            {
              id: "0xmember",
              memberAddress: "0xmember",
              stakedTokens: "100",
            },
          ],
        },
      },
      [
        baseRecord({
          optimistic: {
            kind: "community-member",
            communityId: "0xcommunity",
            memberAddress: "0xmember",
            isRegistered: false,
            stakedTokens: "0",
          },
        }),
      ],
    );

    expect(result?.member?.memberCommunity[0]).toMatchObject({
      isRegistered: false,
      stakedTokens: "0",
    });
    expect(result?.registryCommunity.members).toEqual([]);
    expect(result?.registryCommunity.membersCount).toBe("0");
  });

  it("overlays a pending stake target without patching nonmatching members", () => {
    const apply = createMemberOptimisticProjector({
      communityId: "0xcommunity",
      memberAddress: "0xmember",
    });

    const result: any = apply(
      {
        registryCommunity: {
          id: "0xcommunity",
          members: [
            {
              id: "0xother",
              memberAddress: "0xother",
              stakedTokens: "50",
            },
          ],
        },
        unrelated: [],
      },
      [
        baseRecord({
          optimistic: {
            kind: "community-member",
            communityId: "0xcommunity",
            memberAddress: "0xmember",
            isRegistered: true,
            stakedTokens: "150",
          },
        }),
      ],
    );

    expect(result?.registryCommunity.members).toEqual([
      {
        id: "0xmember",
        memberAddress: "0xmember",
        stakedTokens: "150",
      },
      {
        id: "0xother",
        memberAddress: "0xother",
        stakedTokens: "50",
      },
    ]);
    expect(result?.unrelated).toEqual([]);
  });

  it("overlays pool governance activation and deactivation", () => {
    const apply = createMemberOptimisticProjector({
      strategyId: "0xstrategy",
      memberAddress: "0xmember",
    });

    const activated: any = apply(
      {
        memberStrategy: null,
        memberStrategies: [],
      },
      [
        baseRecord({
          optimistic: {
            kind: "pool-governance",
            strategyId: "0xstrategy",
            memberAddress: "0xmember",
            isActivated: true,
            activatedPoints: "77",
          },
        }),
      ],
    );

    expect(activated?.memberStrategy?.activatedPoints).toBe("77");
    expect(activated?.memberStrategies[0]).toMatchObject({
      id: "0xmember-0xstrategy",
      activatedPoints: "77",
      member: { id: "0xmember" },
    });

    const deactivated: any = apply(activated, [
      baseRecord({
        createdAt: 2,
        optimistic: {
          kind: "pool-governance",
          strategyId: "0xstrategy",
          memberAddress: "0xmember",
          isActivated: false,
          activatedPoints: "0",
        },
      }),
    ]);

    expect(deactivated?.memberStrategy?.activatedPoints).toBe("0");
    expect(deactivated?.memberStrategies[0].activatedPoints).toBe("0");
  });
});

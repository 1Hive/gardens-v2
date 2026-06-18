import { describe, expect, it } from "vitest";
import { PendingIndexedPublish } from "@/contexts/pubsub.context";
import {
  createProposalOptimisticProjector,
  getLatestProposalCreation,
} from "./optimisticProposals";

const baseRecord = (
  overrides: Partial<PendingIndexedPublish>,
): PendingIndexedPublish => ({
  txHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
  blockNumber: "100",
  chainId: 42220,
  createdAt: 1,
  publishPayload: {
    topic: "proposal",
    type: "update",
    containerId: "0xstrategy",
    chainId: 42220,
  },
  ...overrides,
});

describe("optimistic proposal projector", () => {
  it("overlays proposal status on nested proposal lists", () => {
    const apply = createProposalOptimisticProjector({
      strategyId: "0xstrategy",
    });

    const data = {
      cvstrategies: [
        {
          id: "0xstrategy",
          proposals: [
            {
              id: "0xstrategy-7",
              proposalNumber: 7,
              proposalStatus: 1,
              strategy: { id: "0xstrategy" },
            },
          ],
        },
      ],
    };

    const result = apply(data, [
      baseRecord({
        optimistic: {
          kind: "proposal-status",
          strategyId: "0xstrategy",
          proposalId: "0xstrategy-7",
          proposalNumber: "7",
          status: "cancelled",
        },
      }),
    ]);

    expect(result?.cvstrategies[0].proposals[0].proposalStatus).toBe(3);
  });

  it("overlays allocation targets on member stake data", () => {
    const apply = createProposalOptimisticProjector({
      strategyId: "0xstrategy",
      allocator: "0xallocator",
    });

    const data = {
      member: {
        id: "0xallocator",
        stakes: [
          {
            amount: "10",
            proposal: {
              id: "0xstrategy-1",
              proposalNumber: 1,
              proposalStatus: 1,
              strategy: { id: "0xstrategy" },
            },
          },
        ],
      },
    };

    const result = apply(data, [
      baseRecord({
        optimistic: {
          kind: "proposal-allocation",
          strategyId: "0xstrategy",
          allocator: "0xallocator",
          targets: [
            {
              proposalId: "0xstrategy-1",
              proposalNumber: "1",
              amount: "42",
            },
          ],
          deltas: [
            {
              proposalNumber: "1",
              deltaSupport: "32",
            },
          ],
        },
      }),
    ]);

    expect(result?.member?.stakes[0].amount).toBe("42");
  });

  it("adds missing member stake rows for pending allocation targets", () => {
    const apply = createProposalOptimisticProjector({
      strategyId: "0xstrategy",
      allocator: "0xallocator",
    });

    const data = {
      member: {
        id: "0xallocator",
        stakes: [],
      },
    };

    const result = apply(data, [
      baseRecord({
        optimistic: {
          kind: "proposal-allocation",
          strategyId: "0xstrategy",
          allocator: "0xallocator",
          targets: [
            {
              proposalId: "0xstrategy-2",
              proposalNumber: "2",
              amount: "1000",
            },
          ],
          deltas: [
            {
              proposalNumber: "2",
              deltaSupport: "1000",
            },
          ],
        },
      }),
    ]);

    expect(result?.member?.stakes[0]).toMatchObject({
      amount: "1000",
      proposal: {
        id: "0xstrategy-2",
        proposalNumber: 2,
        proposalStatus: 1,
        strategy: {
          id: "0xstrategy",
        },
      },
    });
  });

  it("does not treat the same proposal number in another strategy as an existing allocation target", () => {
    const apply = createProposalOptimisticProjector({
      strategyId: "0xstrategy",
      allocator: "0xallocator",
    });

    const data = {
      member: {
        id: "0xallocator",
        stakes: [
          {
            id: "0xallocator-0xother-2",
            amount: "0",
            proposal: {
              id: "0xother-2",
              proposalNumber: 2,
              proposalStatus: 1,
              strategy: { id: "0xother" },
            },
          },
        ],
      },
    };

    const result = apply(data, [
      baseRecord({
        optimistic: {
          kind: "proposal-allocation",
          strategyId: "0xstrategy",
          allocator: "0xallocator",
          targets: [
            {
              proposalId: "0xstrategy-2",
              proposalNumber: "2",
              amount: "1000",
            },
          ],
          deltas: [
            {
              proposalNumber: "2",
              deltaSupport: "1000",
            },
          ],
        },
      }),
    ]);

    expect(result?.member?.stakes).toEqual([
      expect.objectContaining({
        amount: "1000",
        proposal: expect.objectContaining({
          id: "0xstrategy-2",
          strategy: { id: "0xstrategy" },
        }),
      }),
      data.member.stakes[0],
    ]);
  });

  it("applies the latest pending allocation amount to a synthetic member stake", () => {
    const apply = createProposalOptimisticProjector({
      strategyId: "0xstrategy",
      allocator: "0xallocator",
    });

    const data = {
      member: {
        id: "0xallocator",
        stakes: [],
      },
    };

    const result = apply(data, [
      baseRecord({
        createdAt: 1,
        optimistic: {
          kind: "proposal-allocation",
          strategyId: "0xstrategy",
          allocator: "0xallocator",
          targets: [
            {
              proposalId: "0xstrategy-2",
              proposalNumber: "2",
              amount: "1000",
            },
          ],
          deltas: [
            {
              proposalNumber: "2",
              deltaSupport: "1000",
            },
          ],
        },
      }),
      baseRecord({
        txHash:
          "0x2222222222222222222222222222222222222222222222222222222222222222",
        createdAt: 2,
        optimistic: {
          kind: "proposal-allocation",
          strategyId: "0xstrategy",
          allocator: "0xallocator",
          targets: [
            {
              proposalId: "0xstrategy-2",
              proposalNumber: "2",
              amount: "500",
            },
          ],
          deltas: [
            {
              proposalNumber: "2",
              deltaSupport: "-500",
            },
          ],
        },
      }),
    ]);

    expect(result?.member?.stakes).toHaveLength(1);
    expect(result?.member?.stakes[0]).toMatchObject({
      amount: "500",
      proposal: {
        id: "0xstrategy-2",
        proposalNumber: 2,
      },
    });
  });

  it("adds pending created proposals with metadata hash but no stored metadata content", () => {
    const apply = createProposalOptimisticProjector({
      strategyId: "0xstrategy",
    });
    const record = baseRecord({
      optimistic: {
        kind: "proposal-created",
        strategyId: "0xstrategy",
        proposalId: "0xstrategy-9",
        proposalNumber: "9",
        metadataHash: "bafyproposal",
        beneficiary: "0xbeneficiary",
        requestedAmount: "123",
        proposalType: "1",
      },
    });

    const result = apply(
      {
        cvstrategies: [
          {
            id: "0xstrategy",
            proposals: [],
          },
        ],
      },
      [record],
    );

    const proposal = result?.cvstrategies[0].proposals[0];
    expect(proposal).toMatchObject({
      id: "0xstrategy-9",
      proposalNumber: 9,
      metadataHash: "bafyproposal",
      metadata: null,
    });
    expect(proposal).not.toHaveProperty("title");
    expect(proposal).not.toHaveProperty("description");
    expect(
      getLatestProposalCreation([record], {
        strategyId: "0xstrategy",
        proposalNumber: "9",
      }),
    ).toBe(record);
  });

  it("does not insert pending created proposals into empty non-proposal arrays", () => {
    const apply = createProposalOptimisticProjector({
      strategyId: "0xstrategy",
    });

    const result = apply(
      {
        cvstrategies: [],
        allos: [],
      },
      [
        baseRecord({
          optimistic: {
            kind: "proposal-created",
            strategyId: "0xstrategy",
            proposalId: "0xstrategy-9",
            proposalNumber: "9",
            metadataHash: "bafyproposal",
            beneficiary: "0xbeneficiary",
            requestedAmount: "123",
            proposalType: "1",
          },
        }),
      ],
    );

    expect(result).toEqual({
      cvstrategies: [],
      allos: [],
    });
  });

  it("adds pending created proposals with parent strategy fields required by proposal UI", () => {
    const apply = createProposalOptimisticProjector({
      strategyId: "0xab40bcfcfe2d742a7e4eeb9c6d0a66bf322177de",
    });

    const result = apply(
      {
        cvstrategies: [
          {
            id: "0xab40bcfcfe2d742a7e4eeb9c6d0a66bf322177de",
            maxCVSupply: "100000000000000000000",
            totalEffectiveActivePoints: "1000000",
            proposals: [],
          },
        ],
      },
      [
        baseRecord({
          txHash:
            "0xd7ebc77324d72e3d2d4811ce79529e9609ee33387675968124c1f6650ec55f20",
          blockNumber: "69844990",
          chainId: 42220,
          createdAt: 1781745748851,
          publishPayload: {
            topic: "proposal",
            type: "update",
            function: "registerRecipient",
            containerId: "0xab40bcfcfe2d742a7e4eeb9c6d0a66bf322177de",
            id: "1",
            chainId: 42220,
          },
          optimistic: {
            kind: "proposal-created",
            strategyId: "0xab40bcfcfe2d742a7e4eeb9c6d0a66bf322177de",
            proposalId: "0xab40bcfcfe2d742a7e4eeb9c6d0a66bf322177de-1",
            proposalNumber: "1",
            metadataHash: "QmTHcBK6KapoUddRwr3XvcBUZcJfvVpywAtN4dyFQEmKru",
            beneficiary: "0x07AD02e0C1FA0b09fC945ff197E18e9C256838c6",
            requestedAmount: "1000000",
            proposalType: "1",
            submitter: "0x07AD02e0C1FA0b09fC945ff197E18e9C256838c6",
          },
        }),
      ],
    );

    expect(result?.cvstrategies[0].proposals[0]).toMatchObject({
      id: "0xab40bcfcfe2d742a7e4eeb9c6d0a66bf322177de-1",
      proposalNumber: 1,
      metadataHash: "QmTHcBK6KapoUddRwr3XvcBUZcJfvVpywAtN4dyFQEmKru",
      strategy: {
        id: "0xab40bcfcfe2d742a7e4eeb9c6d0a66bf322177de",
        maxCVSupply: "100000000000000000000",
        totalEffectiveActivePoints: "1000000",
      },
    });
  });

  it("applies pending allocation support to a pending created proposal", () => {
    const apply = createProposalOptimisticProjector({
      strategyId: "0xstrategy",
      allocator: "0xallocator",
    });

    const result = apply(
      {
        cvstrategies: [
          {
            id: "0xstrategy",
            maxCVSupply: "100000",
            totalEffectiveActivePoints: "1000",
            proposals: [],
          },
        ],
      },
      [
        baseRecord({
          createdAt: 1,
          optimistic: {
            kind: "proposal-created",
            strategyId: "0xstrategy",
            proposalId: "0xstrategy-2",
            proposalNumber: "2",
            metadataHash: "bafyproposal",
            beneficiary: "0xbeneficiary",
            requestedAmount: "1000000",
            proposalType: "1",
          },
        }),
        baseRecord({
          txHash:
            "0x2222222222222222222222222222222222222222222222222222222222222222",
          createdAt: 2,
          optimistic: {
            kind: "proposal-allocation",
            strategyId: "0xstrategy",
            allocator: "0xallocator",
            targets: [
              {
                proposalId: "0xstrategy-2",
                proposalNumber: "2",
                amount: "1000",
              },
            ],
            deltas: [
              {
                proposalNumber: "2",
                deltaSupport: "1000",
              },
            ],
          },
        }),
      ],
    );

    expect(result?.cvstrategies[0].proposals[0]).toMatchObject({
      id: "0xstrategy-2",
      proposalNumber: 2,
      stakedAmount: "1000",
      strategy: {
        id: "0xstrategy",
        maxCVSupply: "100000",
        totalEffectiveActivePoints: "1000",
      },
    });
  });

  it("removes deactivated pool governance support from proposal totals and member stakes", () => {
    const apply = createProposalOptimisticProjector({
      strategyId: "0xstrategy",
      allocator: "0xmember",
    });

    const result = apply(
      {
        cvstrategies: [
          {
            id: "0xstrategy",
            proposals: [
              {
                id: "0xstrategy-1",
                proposalNumber: 1,
                stakedAmount: "125",
                strategy: { id: "0xstrategy" },
              },
              {
                id: "0xstrategy-2",
                proposalNumber: 2,
                stakedAmount: "70",
                strategy: { id: "0xstrategy" },
              },
            ],
          },
        ],
        member: {
          id: "0xmember",
          stakes: [
            {
              amount: "25",
              proposal: {
                id: "0xstrategy-1",
                proposalNumber: 1,
                strategy: { id: "0xstrategy" },
              },
            },
            {
              amount: "10",
              proposal: {
                id: "0xother-1",
                proposalNumber: 1,
                strategy: { id: "0xother" },
              },
            },
          ],
        },
      },
      [
        baseRecord({
          optimistic: {
            kind: "pool-governance",
            strategyId: "0xstrategy",
            memberAddress: "0xmember",
            isActivated: false,
            activatedPoints: "0",
            supportSnapshot: [
              {
                proposalId: "0xstrategy-1",
                proposalNumber: "1",
                amount: "25",
              },
              {
                proposalId: "0xstrategy-2",
                proposalNumber: "2",
                amount: "70",
              },
            ],
          },
        }),
      ],
    );

    expect(result?.cvstrategies[0].proposals).toEqual([
      expect.objectContaining({
        id: "0xstrategy-1",
        stakedAmount: "100",
      }),
      expect.objectContaining({
        id: "0xstrategy-2",
        stakedAmount: "0",
      }),
    ]);
    expect(result?.member.stakes).toEqual([
      expect.objectContaining({
        amount: "10",
        proposal: expect.objectContaining({
          id: "0xother-1",
        }),
      }),
    ]);
  });

  it("removes deactivated members from proposal supporter lists without strategy fields", () => {
    const apply = createProposalOptimisticProjector({
      strategyId: "0xstrategy",
      allocator: "0xmember",
    });

    const result = apply(
      {
        members: [
          {
            id: "0xmember",
            stakes: [
              {
                amount: "25",
                proposal: {
                  id: "0xstrategy-1",
                  proposalNumber: 1,
                },
              },
            ],
          },
          {
            id: "0xother",
            stakes: [
              {
                amount: "50",
                proposal: {
                  id: "0xstrategy-1",
                  proposalNumber: 1,
                },
              },
            ],
          },
        ],
      },
      [
        baseRecord({
          optimistic: {
            kind: "pool-governance",
            strategyId: "0xstrategy",
            memberAddress: "0xmember",
            isActivated: false,
            activatedPoints: "0",
            supportSnapshot: [
              {
                proposalId: "0xstrategy-1",
                proposalNumber: "1",
                amount: "25",
              },
            ],
          },
        }),
      ],
    );

    expect(result?.members).toEqual([
      expect.objectContaining({
        id: "0xmember",
        stakes: [],
      }),
      expect.objectContaining({
        id: "0xother",
        stakes: [
          expect.objectContaining({
            amount: "50",
          }),
        ],
      }),
    ]);
  });
});

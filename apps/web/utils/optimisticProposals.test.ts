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
});

import { describe, expect, it, vi } from "vitest";
import type { PendingIndexedPublish } from "./pubsub.context";
import {
  normalizePendingIndexedPublishRecord,
  releaseIndexedPendingPublishes,
} from "../utils/pendingIndexedPublishes";

const baseStoredRecord: PendingIndexedPublish = {
  txHash: "0x3333333333333333333333333333333333333333333333333333333333333333",
  blockNumber: "123",
  chainId: 42220,
  createdAt: 1000,
  publishPayload: {
    topic: "proposal",
    type: "update",
    containerId: "0xstrategy",
    chainId: 42220,
  },
};

describe("pending indexed publish normalization", () => {
  it("keeps old records without optimistic metadata", () => {
    expect(normalizePendingIndexedPublishRecord(baseStoredRecord)).toEqual(
      baseStoredRecord,
    );
  });

  it("keeps valid optimistic metadata", () => {
    const record = {
      ...baseStoredRecord,
      optimistic: {
        kind: "proposal-status",
        strategyId: "0xstrategy",
        proposalNumber: "1",
        status: "cancelled",
      },
    };

    expect(normalizePendingIndexedPublishRecord(record)?.optimistic).toEqual(
      record.optimistic,
    );
  });

  it("keeps a pending proposal title for optimistic breadcrumbs", () => {
    const record = {
      ...baseStoredRecord,
      optimistic: {
        kind: "proposal-created",
        strategyId: "0xstrategy",
        proposalNumber: "1",
        metadataHash: "ipfs-hash",
        proposalTitle: "Fund community garden",
      },
    };

    expect(normalizePendingIndexedPublishRecord(record)?.optimistic).toEqual(
      record.optimistic,
    );
  });

  it("keeps pool governance support snapshots for pending deactivations", () => {
    const record = {
      ...baseStoredRecord,
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
            amount: "100",
          },
        ],
      },
    };

    expect(normalizePendingIndexedPublishRecord(record)?.optimistic).toEqual(
      record.optimistic,
    );
  });

  it("drops malformed optimistic metadata without dropping the record", () => {
    const normalized = normalizePendingIndexedPublishRecord({
      ...baseStoredRecord,
      optimistic: {
        kind: "proposal-created",
        strategyId: "0xstrategy",
      },
    });

    expect(normalized).toMatchObject({
      txHash: baseStoredRecord.txHash,
      blockNumber: baseStoredRecord.blockNumber,
      chainId: baseStoredRecord.chainId,
    });
    expect(normalized?.optimistic).toBeUndefined();
  });
});

describe("indexed optimistic publish release", () => {
  it("keeps the release pending until subscribers finish refreshing", async () => {
    let finishRefresh: (() => void) | undefined;
    const refresh = new Promise<void>((resolve) => {
      finishRefresh = resolve;
    });
    const releaseEvents: string[] = [];

    const releasePromise = releaseIndexedPendingPublishes(
      [baseStoredRecord],
      new Map([
        [baseStoredRecord.chainId, BigInt(baseStoredRecord.blockNumber)],
      ]),
      async () => {
        releaseEvents.push("refresh-started");
        await refresh;
        releaseEvents.push("refresh-finished");
      },
    );

    await Promise.resolve();
    expect(releaseEvents).toEqual(["refresh-started"]);

    finishRefresh?.();
    const released = await releasePromise;

    expect(releaseEvents).toEqual(["refresh-started", "refresh-finished"]);
    expect(released).toEqual([baseStoredRecord]);
  });

  it("does not release records from chains that have not indexed them", async () => {
    const release = vi.fn();
    const released = await releaseIndexedPendingPublishes(
      [baseStoredRecord],
      new Map([[baseStoredRecord.chainId, 122n]]),
      release,
    );

    expect(release).not.toHaveBeenCalled();
    expect(released).toEqual([]);
  });
});

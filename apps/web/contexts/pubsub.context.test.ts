import { describe, expect, it } from "vitest";
import type { PendingIndexedPublish } from "./pubsub.context";
import { normalizePendingIndexedPublishRecord } from "../utils/pendingIndexedPublishes";

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

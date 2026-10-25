import { describe, expect, it } from "vitest";

import {
  createNotionSyncProgress,
  markNotionSyncComplete,
  markNotionSyncFailed,
  markNotionWalletProcessed,
} from "./notion-sync-progress";

describe("Notion sync progress", () => {
  it("distinguishes the failed wallet from 940 outstanding incident wallets", () => {
    const progress = createNotionSyncProgress(1_228);
    progress.attempted = true;
    for (let index = 0; index < 288; index += 1) {
      markNotionWalletProcessed(progress, { skipped: index < 43 });
    }
    markNotionSyncFailed(
      progress,
      {
        message: "Bad Gateway",
        code: "notionhq_client_response_error",
        status: 502,
      },
      "wallet",
    );

    expect(progress).toEqual({
      attempted: true,
      success: false,
      processed: 288,
      failed: 1,
      skipped: 43,
      remaining: 940,
      error: {
        message: "Bad Gateway",
        code: "notionhq_client_response_error",
        status: 502,
      },
      failurePhase: "wallet",
    });
  });

  it("does not count preparation or existing-page scan errors as wallet failures", () => {
    const progress = createNotionSyncProgress(10);
    progress.attempted = true;
    markNotionSyncFailed(progress, new Error("Page scan failed"), "prepare");

    expect(progress).toMatchObject({
      processed: 0,
      failed: 0,
      remaining: 10,
      success: false,
      failurePhase: "prepare",
      error: { message: "Page scan failed", code: null, status: null },
    });
  });

  it("keeps cleanup failures unsuccessful even after all wallets are processed", () => {
    const progress = createNotionSyncProgress(1);
    progress.attempted = true;
    markNotionWalletProcessed(progress, { skipped: false });
    markNotionSyncFailed(progress, new Error("Archive failed"), "cleanup");
    markNotionSyncComplete(progress);

    expect(progress).toMatchObject({
      processed: 1,
      failed: 0,
      remaining: 0,
      success: false,
      failurePhase: "cleanup",
    });
  });

  it("does not count a deadline rejection before a request as a failed wallet", () => {
    const progress = createNotionSyncProgress(10);
    progress.attempted = true;
    markNotionSyncFailed(progress, new Error("Deadline reached"), "wallet", {
      requestNotAttempted: true,
    });

    expect(progress).toMatchObject({
      processed: 0,
      failed: 0,
      remaining: 10,
      success: false,
      failurePhase: "wallet",
    });
  });

  it("completes a pass with checksum skips included in processed", () => {
    const progress = createNotionSyncProgress(2);
    progress.attempted = true;
    markNotionWalletProcessed(progress, { skipped: true });
    markNotionSyncComplete(progress);
    expect(progress.success).toBe(false);

    markNotionWalletProcessed(progress, { skipped: false });
    markNotionSyncComplete(progress);
    expect(progress).toMatchObject({
      processed: 2,
      skipped: 1,
      failed: 0,
      remaining: 0,
      success: true,
      error: null,
      failurePhase: null,
    });
  });

  it("serializes thrown non-Error values without inventing a status or code", () => {
    const progress = createNotionSyncProgress(0);
    markNotionSyncFailed(progress, "Schema unavailable", "prepare");
    markNotionSyncComplete(progress);

    expect(progress.error).toEqual({
      message: "Schema unavailable",
      code: null,
      status: null,
    });
    expect(progress.success).toBe(false);
  });
});

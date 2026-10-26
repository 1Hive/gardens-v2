export type NotionSyncFailurePhase = "prepare" | "wallet" | "cleanup";

// Duplicate cleanup can run inside the wallet loop (even on checksum skips).
// Keep its failure separate from an attempted wallet upsert.
export class NotionSyncCleanupError extends Error {
  constructor(cause: unknown) {
    super("Notion page cleanup failed", { cause });
    this.name = "NotionSyncCleanupError";
  }
}

type NotionSyncError = {
  message: string;
  code: string | null;
  status: number | null;
};

export type NotionSyncProgress = {
  attempted: boolean;
  success: boolean;
  processed: number;
  failed: number;
  skipped: number;
  // Outstanding wallets, including an attempted wallet that failed.
  remaining: number;
  error: NotionSyncError | null;
  failurePhase: NotionSyncFailurePhase | null;
};

export const createNotionSyncProgress = (
  total: number,
): NotionSyncProgress => ({
  attempted: false,
  success: false,
  processed: 0,
  failed: 0,
  skipped: 0,
  remaining: total,
  error: null,
  failurePhase: null,
});

export const markNotionWalletProcessed = (
  state: NotionSyncProgress,
  { skipped }: { skipped: boolean },
) => {
  state.processed += 1;
  if (skipped) state.skipped += 1;
  state.remaining -= 1;
};

export const markNotionSyncFailed = (
  state: NotionSyncProgress,
  error: unknown,
  phase: NotionSyncFailurePhase,
  { requestNotAttempted = false }: { requestNotAttempted?: boolean } = {},
) => {
  const isCleanup = error instanceof NotionSyncCleanupError;
  const failurePhase = isCleanup ? "cleanup" : phase;
  const originalError = isCleanup ? error.cause : error;
  const details =
    originalError && typeof originalError === "object" ?
      (originalError as Record<string, unknown>)
    : null;
  state.error = {
    message:
      typeof details?.message === "string" ?
        details.message
      : String(originalError),
    code: typeof details?.code === "string" ? details.code : null,
    status: typeof details?.status === "number" ? details.status : null,
  };
  state.failurePhase = failurePhase;
  state.success = false;
  // A stopped pass has not attempted every remaining wallet. Preparation and
  // cleanup errors also do not represent failed wallet writes.
  if (failurePhase === "wallet" && !requestNotAttempted) state.failed += 1;
};

export const markNotionSyncComplete = (state: NotionSyncProgress) => {
  state.success = state.error === null && state.remaining === 0;
};

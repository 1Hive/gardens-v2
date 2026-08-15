import { describe, expect, it, vi } from "vitest";
import { publishGovernanceChangeBeforeClosing } from "./governanceConfirmation";

describe("governance confirmation lifecycle", () => {
  it("publishes optimistic state before closing the transaction surface", () => {
    const publishOptimisticChange = vi.fn();
    const closeTransactionSurface = vi.fn();

    publishGovernanceChangeBeforeClosing(
      publishOptimisticChange,
      closeTransactionSurface,
    );

    expect(publishOptimisticChange).toHaveBeenCalledOnce();
    expect(closeTransactionSurface).toHaveBeenCalledOnce();
    expect(publishOptimisticChange.mock.invocationCallOrder[0]).toBeLessThan(
      closeTransactionSurface.mock.invocationCallOrder[0],
    );
  });
});

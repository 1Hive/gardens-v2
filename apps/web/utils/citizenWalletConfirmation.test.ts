import { describe, expect, it, vi } from "vitest";
import {
  getCitizenSubmittedAction,
  waitForCitizenActionConfirmation,
} from "./citizenWalletConfirmation";

describe("Citizen Wallet native action confirmation", () => {
  it("confirms approval from allowance instead of a transaction receipt", async () => {
    const readAllowance = vi
      .fn<() => Promise<bigint>>()
      .mockResolvedValueOnce(0n)
      .mockResolvedValueOnce(10n);
    const readIsMember = vi.fn<() => Promise<boolean>>();

    await waitForCitizenActionConfirmation({
      action: "approval-submitted",
      registrationCost: 10n,
      readAllowance,
      readIsMember,
      attempts: 2,
      intervalMs: 0,
    });

    expect(readAllowance).toHaveBeenCalledTimes(2);
    expect(readIsMember).not.toHaveBeenCalled();
  });

  it("confirms registration from membership state", async () => {
    const readAllowance = vi.fn<() => Promise<bigint>>();
    const readIsMember = vi
      .fn<() => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await waitForCitizenActionConfirmation({
      action: "registration-submitted",
      registrationCost: 10n,
      readAllowance,
      readIsMember,
      attempts: 2,
      intervalMs: 0,
    });

    expect(readIsMember).toHaveBeenCalledTimes(2);
    expect(readAllowance).not.toHaveBeenCalled();
  });

  it("fails after the expected state remains unchanged", async () => {
    await expect(
      waitForCitizenActionConfirmation({
        action: "registration-submitted",
        registrationCost: 10n,
        readAllowance: vi.fn(),
        readIsMember: vi.fn().mockResolvedValue(false),
        attempts: 2,
        intervalMs: 0,
      }),
    ).rejects.toThrow(
      "Citizen Wallet registration was submitted, but its on-chain state was not confirmed.",
    );
  });

  it("retries a transient RPC read error", async () => {
    const readAllowance = vi
      .fn<() => Promise<bigint>>()
      .mockRejectedValueOnce(new Error("RPC unavailable"))
      .mockResolvedValueOnce(10n);

    await waitForCitizenActionConfirmation({
      action: "approval-submitted",
      registrationCost: 10n,
      readAllowance,
      readIsMember: vi.fn(),
      attempts: 2,
      intervalMs: 0,
    });

    expect(readAllowance).toHaveBeenCalledTimes(2);
  });

  it("accepts only known submitted action markers", () => {
    expect(getCitizenSubmittedAction("approval-submitted")).toBe(
      "approval-submitted",
    );
    expect(getCitizenSubmittedAction(["registration-submitted"])).toBe(
      "registration-submitted",
    );
    expect(getCitizenSubmittedAction("unknown")).toBeUndefined();
    expect(getCitizenSubmittedAction(undefined)).toBeUndefined();
  });
});

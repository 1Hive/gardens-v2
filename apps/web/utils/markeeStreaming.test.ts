import { decodeErrorResult, getAddress, parseEther, parseUnits } from "viem";
import { describe, expect, it, vi } from "vitest";
import {
  buildMarkeeOpenStreamOperations,
  getBufferedMarkeeGasEstimate,
  getMarkeeFundingMonths,
  getMarkeeMonthlyAmountForFundingValue,
  getMarkeeRequiredNativeBalance,
  getMarkeeRunwaySeconds,
  getMarkeeStreamAmounts,
  getMarkeeStreamFunding,
  getMarkeeWithdrawableDeposit,
  MARKEE_BUFFER_PERIOD,
  MARKEE_SECONDS_IN_MONTH,
  superfluidHostABI,
  waitForMarkeeRegistration,
} from "./markeeStreaming";

const address = (suffix: string) => getAddress(`0x${suffix.padStart(40, "0")}`);

describe("Markee streaming transaction builder", () => {
  it("decodes a nested UnknownMarkee batch revert", () => {
    expect(
      decodeErrorResult({ abi: superfluidHostABI, data: "0x6663ccf3" })
        .errorName,
    ).toBe("UnknownMarkee");
  });

  it("retries until a newly created Markee is visible", async () => {
    let attempts = 0;
    const registered = await waitForMarkeeRegistration({
      isRegistered: async () => {
        attempts += 1;
        return attempts === 3;
      },
      retryDelayMs: 0,
    });

    expect(registered).toBe(true);
    expect(attempts).toBe(3);
  });

  it("stops waiting when a new Markee remains unavailable", async () => {
    const isRegistered = vi.fn().mockResolvedValue(false);

    await expect(
      waitForMarkeeRegistration({
        isRegistered,
        maxAttempts: 2,
        retryDelayMs: 0,
      }),
    ).resolves.toBe(false);
    expect(isRegistered).toHaveBeenCalledTimes(2);
  });

  it("calculates the prefund, buffer, and non-zero per-second rate", () => {
    const amounts = getMarkeeStreamAmounts(
      parseEther("0.001"),
      parseUnits("1", 18),
    );

    expect(amounts.prefund).toBe(parseEther("0.001"));
    expect(amounts.ratePerSecond).toBeGreaterThan(0n);
    expect(amounts.buffer).toBe(amounts.ratePerSecond * 14_400n);
    expect(amounts.value).toBe(amounts.prefund + amounts.buffer);
  });

  it("calculates stream runway from the live ETHx balance", () => {
    expect(getMarkeeRunwaySeconds(86_400n, 1n)).toBe(86_400n);
    expect(getMarkeeRunwaySeconds(86_400n, 0n)).toBe(0n);
  });

  it("only exposes stream deposits that are not required as buffer", () => {
    const ratePerSecond = 10n;
    const requiredDeposit = ratePerSecond * MARKEE_BUFFER_PERIOD;

    expect(
      getMarkeeWithdrawableDeposit(requiredDeposit + 5n, ratePerSecond),
    ).toBe(5n);
    expect(getMarkeeWithdrawableDeposit(requiredDeposit, ratePerSecond)).toBe(
      0n,
    );
    expect(getMarkeeWithdrawableDeposit(requiredDeposit, 0n)).toBe(
      requiredDeposit,
    );
  });

  it("converts funding durations to fixed-point months", () => {
    expect(getMarkeeFundingMonths("1", "hour")).toBe(
      (parseUnits("1", 18) * 3_600n) / MARKEE_SECONDS_IN_MONTH,
    );
    expect(getMarkeeFundingMonths("1", "day")).toBe(
      (parseUnits("1", 18) * 86_400n) / MARKEE_SECONDS_IN_MONTH,
    );
    expect(getMarkeeFundingMonths("1", "month")).toBe(parseUnits("1", 18));
    expect(getMarkeeFundingMonths("1", "year")).toBe(parseUnits("12", 18));
  });

  it("derives the monthly rate from a total funding amount and duration", () => {
    const months = getMarkeeFundingMonths("5", "hour");
    const originalMonthlyAmount = parseEther("0.007");
    const fundingValue = getMarkeeStreamAmounts(
      originalMonthlyAmount,
      months,
    ).value;
    const derivedMonthlyAmount = getMarkeeMonthlyAmountForFundingValue(
      fundingValue,
      months,
    );

    expect(
      getMarkeeStreamAmounts(derivedMonthlyAmount, months).value,
    ).toBeLessThanOrEqual(fundingValue);
    expect(
      getMarkeeStreamAmounts(derivedMonthlyAmount + 1n, months).value,
    ).toBeGreaterThan(fundingValue);
  });

  it("reuses an existing stream deposit when deriving the maximum rate", () => {
    const months = getMarkeeFundingMonths("1", "month");
    const originalMonthlyAmount = parseEther("0.01");
    const originalAmounts = getMarkeeStreamAmounts(
      originalMonthlyAmount,
      months,
    );
    const fundingValue = originalAmounts.prefund;
    const derivedMonthlyAmount = getMarkeeMonthlyAmountForFundingValue(
      fundingValue,
      months,
      originalAmounts.buffer,
    );
    const requiredFunding = (monthlyAmount: bigint) => {
      const amounts = getMarkeeStreamAmounts(monthlyAmount, months);
      const depositTopUp =
        amounts.buffer > originalAmounts.buffer ?
          amounts.buffer - originalAmounts.buffer
        : 0n;
      return amounts.prefund + depositTopUp;
    };

    expect(requiredFunding(derivedMonthlyAmount)).toBeLessThanOrEqual(
      fundingValue,
    );
    expect(requiredFunding(derivedMonthlyAmount + 1n)).toBeGreaterThan(
      fundingValue,
    );
  });

  it("builds wrap, approval, deposit, flow, and pool-connect operations", () => {
    const operations = buildMarkeeOpenStreamOperations({
      approvalAmount: 10n,
      backer: address("1"),
      board: address("2"),
      buffer: 10n,
      cfaAgreement: address("3"),
      ethx: address("4"),
      gdaAgreement: address("5"),
      markee: address("6"),
      pool: address("7"),
      ratePerSecond: 8n,
      wrapValue: 18n,
    });

    expect(operations.map(({ operationType }) => operationType)).toEqual([
      301, 1, 301, 201, 201,
    ]);
    expect(operations).toHaveLength(5);
  });

  it("omits wrapping when the wallet already holds enough ETHx", () => {
    const operations = buildMarkeeOpenStreamOperations({
      backer: address("1"),
      board: address("2"),
      buffer: 10n,
      cfaAgreement: address("3"),
      ethx: address("4"),
      gdaAgreement: address("5"),
      markee: address("6"),
      pool: address("7"),
      ratePerSecond: 8n,
      wrapValue: 0n,
    });

    expect(operations.map(({ operationType }) => operationType)).toEqual([
      301, 201, 201,
    ]);
    expect(operations).toHaveLength(3);
  });

  it("updates an existing stream when it already targets this Markee", () => {
    const operations = buildMarkeeOpenStreamOperations({
      backer: address("1"),
      board: address("2"),
      buffer: 0n,
      cfaAgreement: address("3"),
      ethx: address("4"),
      existingMarkee: address("6"),
      gdaAgreement: address("5"),
      markee: address("6"),
      pool: address("7"),
      ratePerSecond: 8n,
      wrapValue: 18n,
    });

    expect(operations.map(({ operationType }) => operationType)).toEqual([
      301, 201, 201,
    ]);
  });

  it("always connects the refund pool when the Markee and rate are unchanged", () => {
    const operations = buildMarkeeOpenStreamOperations({
      backer: address("1"),
      board: address("2"),
      buffer: 0n,
      cfaAgreement: address("3"),
      ethx: address("4"),
      existingMarkee: address("6"),
      existingRatePerSecond: 8n,
      gdaAgreement: address("5"),
      markee: address("6"),
      pool: address("7"),
      ratePerSecond: 8n,
      wrapValue: 0n,
    });

    expect(operations.map(({ operationType }) => operationType)).toEqual([201]);
  });

  it("replaces an existing stream when it targets another Markee", () => {
    const operations = buildMarkeeOpenStreamOperations({
      backer: address("1"),
      board: address("2"),
      buffer: 0n,
      cfaAgreement: address("3"),
      ethx: address("4"),
      existingMarkee: address("8"),
      gdaAgreement: address("5"),
      markee: address("6"),
      pool: address("7"),
      ratePerSecond: 8n,
      wrapValue: 18n,
    });

    expect(operations.map(({ operationType }) => operationType)).toEqual([
      301, 201, 201, 201,
    ]);
  });

  it("reuses ETHx and skips approval only when the existing allowance covers the buffer", () => {
    expect(
      getMarkeeStreamFunding({
        ethxAllowance: 10n,
        ethxBalance: 18n,
        requiredBuffer: 10n,
        totalRequired: 18n,
      }),
    ).toEqual({ requiresApproval: false, wrapValue: 0n });

    expect(
      getMarkeeStreamFunding({
        ethxAllowance: 10n,
        ethxBalance: 6n,
        requiredBuffer: 10n,
        totalRequired: 18n,
      }),
    ).toEqual({ requiresApproval: false, wrapValue: 12n });

    expect(
      getMarkeeStreamFunding({
        ethxAllowance: 9n,
        ethxBalance: 18n,
        requiredBuffer: 10n,
        totalRequired: 18n,
      }),
    ).toEqual({ requiresApproval: true, wrapValue: 0n });
  });

  it("adds a 25% gas buffer to the required native balance", () => {
    expect(getBufferedMarkeeGasEstimate(100_001n)).toBe(125_002n);
    expect(
      getMarkeeRequiredNativeBalance({
        gasEstimate: 100_000n,
        gasPrice: 2n,
        wrapValue: 50n,
      }),
    ).toEqual({
      bufferedGas: 125_000n,
      estimatedGasCost: 250_000n,
      requiredBalance: 250_050n,
    });
  });
});

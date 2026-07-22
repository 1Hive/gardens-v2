import {
  decodeAbiParameters,
  decodeFunctionData,
  parseAbiParameters,
} from "viem";
import { describe, expect, it } from "vitest";
import {
  buildUpgradeAndStreamBatch,
  getStreamFundingAmounts,
  shouldBatchUpgradeAndStream,
  SUPERFLUID_BATCH_OPERATION,
  superfluidCfaV1Abi,
} from "./superfluidBatch";

const superToken = "0x0000000000000000000000000000000000000001";
const cfaV1 = "0x0000000000000000000000000000000000000002";
const receiver = "0x0000000000000000000000000000000000000003";

describe("buildUpgradeAndStreamBatch", () => {
  it("uses only the raw portion of a mixed balance for upgrade and allowance", () => {
    expect(
      getStreamFundingAmounts({
        requestedAmount: 10_487_000000000000000000n,
        availableSuperTokenBalance: 2_425_527442921011032304n,
        superTokenDecimals: 18,
        underlyingTokenDecimals: 18,
      }),
    ).toEqual({
      upgradeAmount: 8_061_472557078988967696n,
      allowanceAmount: 8_061_472557078988967696n,
    });
  });

  it("does not request an allowance when the Super Token balance is enough", () => {
    expect(
      getStreamFundingAmounts({
        requestedAmount: 100n,
        availableSuperTokenBalance: 120n,
        superTokenDecimals: 18,
        underlyingTokenDecimals: 18,
      }),
    ).toEqual({ upgradeAmount: -20n, allowanceAmount: 0n });
  });

  it("rounds only the underlying allowance up when token decimals differ", () => {
    expect(
      getStreamFundingAmounts({
        requestedAmount: 1_000000000001n,
        availableSuperTokenBalance: 0n,
        superTokenDecimals: 12,
        underlyingTokenDecimals: 6,
      }),
    ).toEqual({
      upgradeAmount: 1_000000000001n,
      allowanceAmount: 1_000001n,
    });
  });

  it("never batches an upgrade for a pure native Super Token", () => {
    expect(
      shouldBatchUpgradeAndStream({
        sameAsUnderlying: true,
        upgradeAmount: 100n,
      }),
    ).toBe(false);
  });

  it("only batches wrapper Super Tokens with a positive upgrade amount", () => {
    expect(
      shouldBatchUpgradeAndStream({
        sameAsUnderlying: false,
        upgradeAmount: 100n,
      }),
    ).toBe(true);
    expect(
      shouldBatchUpgradeAndStream({
        sameAsUnderlying: false,
        upgradeAmount: 0n,
      }),
    ).toBe(false);
  });

  it.each([
    [false, "createFlow"],
    [true, "updateFlow"],
  ] as const)(
    "encodes upgrade and %s agreement operations",
    (isUpdate, functionName) => {
      const operations = buildUpgradeAndStreamBatch({
        superToken,
        cfaV1,
        receiver,
        upgradeAmount: 100n,
        flowRate: 5n,
        isUpdate,
      });

      expect(operations).toHaveLength(2);
      expect(operations[0]).toMatchObject({
        operationType: SUPERFLUID_BATCH_OPERATION.superTokenUpgrade,
        target: superToken,
      });
      expect(
        decodeAbiParameters(
          parseAbiParameters("uint256 amount"),
          operations[0].data,
        ),
      ).toEqual([100n]);

      expect(operations[1]).toMatchObject({
        operationType: SUPERFLUID_BATCH_OPERATION.callAgreement,
        target: cfaV1,
      });
      const [callData, userData] = decodeAbiParameters(
        parseAbiParameters("bytes callData, bytes userData"),
        operations[1].data,
      );
      expect(userData).toBe("0x");
      expect(
        decodeFunctionData({ abi: superfluidCfaV1Abi, data: callData }),
      ).toEqual({
        functionName,
        args: [superToken, receiver, 5n, "0x"],
      });
    },
  );
});

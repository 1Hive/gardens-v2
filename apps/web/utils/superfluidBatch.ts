import {
  Address,
  encodeAbiParameters,
  encodeFunctionData,
  Hex,
  parseAbi,
  parseAbiParameters,
} from "viem";
import { scaleDownRoundUp } from "./numbers";

export const superfluidHostBatchAbi = parseAbi([
  "function batchCall((uint32 operationType,address target,bytes data)[] operations) payable",
]);

export const superfluidCfaV1Abi = parseAbi([
  "function createFlow(address token,address receiver,int96 flowRate,bytes ctx) returns (bytes newCtx)",
  "function updateFlow(address token,address receiver,int96 flowRate,bytes ctx) returns (bytes newCtx)",
]);

export const SUPERFLUID_BATCH_OPERATION = {
  superTokenUpgrade: 101,
  callAgreement: 201,
} as const;

export const MAX_STREAM_SIGNING_BUFFER_SECONDS = 60n;

type SuperfluidBatchOperation = {
  operationType: number;
  target: Address;
  data: Hex;
};

export const getStreamFundingAmounts = ({
  requestedAmount,
  availableSuperTokenBalance,
  superTokenDecimals,
  underlyingTokenDecimals,
}: {
  requestedAmount: bigint;
  availableSuperTokenBalance: bigint;
  superTokenDecimals: number;
  underlyingTokenDecimals: number;
}) => {
  const upgradeAmount = requestedAmount - availableSuperTokenBalance;
  const allowanceAmount =
    upgradeAmount > 0n ?
      scaleDownRoundUp(
        upgradeAmount,
        superTokenDecimals,
        underlyingTokenDecimals,
      )
    : 0n;

  return { upgradeAmount, allowanceAmount };
};

export const getBufferedMaxStreamAmount = ({
  availableBalance,
  duration,
  bufferDuration,
}: {
  availableBalance: bigint;
  duration: bigint;
  bufferDuration: bigint;
}) => {
  if (availableBalance <= 0n || duration <= 0n || bufferDuration < 0n) {
    return 0n;
  }

  return (availableBalance * duration) / (duration + bufferDuration);
};

export const shouldBatchUpgradeAndStream = ({
  sameAsUnderlying,
  upgradeAmount,
}: {
  sameAsUnderlying?: boolean;
  upgradeAmount?: bigint;
}) => sameAsUnderlying !== true && upgradeAmount != null && upgradeAmount > 0n;

export const buildUpgradeAndStreamBatch = ({
  superToken,
  cfaV1,
  receiver,
  upgradeAmount,
  flowRate,
  isUpdate,
}: {
  superToken: Address;
  cfaV1: Address;
  receiver: Address;
  upgradeAmount: bigint;
  flowRate: bigint;
  isUpdate: boolean;
}): SuperfluidBatchOperation[] => {
  const agreementCall = encodeFunctionData({
    abi: superfluidCfaV1Abi,
    functionName: isUpdate ? "updateFlow" : "createFlow",
    args: [superToken, receiver, flowRate, "0x"],
  });

  return [
    {
      operationType: SUPERFLUID_BATCH_OPERATION.superTokenUpgrade,
      target: superToken,
      data: encodeAbiParameters(parseAbiParameters("uint256 amount"), [
        upgradeAmount,
      ]),
    },
    {
      operationType: SUPERFLUID_BATCH_OPERATION.callAgreement,
      target: cfaV1,
      data: encodeAbiParameters(
        parseAbiParameters("bytes callData, bytes userData"),
        [agreementCall, "0x"],
      ),
    },
  ];
};

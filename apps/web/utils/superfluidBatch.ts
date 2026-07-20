import {
  Address,
  encodeAbiParameters,
  encodeFunctionData,
  Hex,
  parseAbi,
  parseAbiParameters,
} from "viem";

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

type SuperfluidBatchOperation = {
  operationType: number;
  target: Address;
  data: Hex;
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

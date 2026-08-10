import {
  Address,
  encodeAbiParameters,
  encodeFunctionData,
  Hex,
  keccak256,
  parseAbi,
  parseUnits,
  toBytes,
  zeroAddress,
} from "viem";

export const MARKEE_SECONDS_IN_MONTH = 2_628_000n;
export const MARKEE_BUFFER_PERIOD = 14_400n;
export const MARKEE_GAS_BUFFER_BPS = 12_500n;

export type MarkeeFundingUnit = "hour" | "day" | "month" | "year";

const MARKEE_FUNDING_UNIT_SECONDS: Record<MarkeeFundingUnit, bigint> = {
  day: 86_400n,
  hour: 3_600n,
  month: MARKEE_SECONDS_IN_MONTH,
  year: MARKEE_SECONDS_IN_MONTH * 12n,
};

const OP_ERC20_APPROVE = 1;
const OP_CALL_AGREEMENT = 201;
const OP_SIMPLE_FORWARD_CALL = 301;

export const CFA_AGREEMENT_ID = keccak256(
  toBytes("org.superfluid-finance.agreements.ConstantFlowAgreement.v1"),
);
export const GDA_AGREEMENT_ID = keccak256(
  toBytes("org.superfluid-finance.agreements.GeneralDistributionAgreement.v1"),
);
export const CFA_V1_FORWARDER_ADDRESS =
  "0xcfA132E353cB4E398080B9700609bb008eceB125" as Address;

export const streamingLeaderboardRuntimeABI = parseAbi([
  "function ETHX() view returns (address)",
  "function HOST() view returns (address)",
  "function backerDeposit(address backer) view returns (uint256)",
  "function backerMarkee(address backer) view returns (address)",
  "function createMarkee(string message, string name) returns (address markeeAddress)",
  "function getTopMarkees(uint256 limit) view returns (address[] topAddresses, uint256[] topRates)",
  "function getMarkees(uint256 offset, uint256 limit) view returns (address[] result)",
  "function markeeCount() view returns (uint256)",
  "function maxNameLength() view returns (uint256)",
  "function poolOf(address markee) view returns (address)",
  "function updateMessage(address markee, string newMessage)",
  "function updateName(address markee, string newName)",
  "event MarkeeCreated(address indexed markeeAddress, address indexed owner, string message, string name)",
]);

export const markeeOwnerABI = parseAbi([
  "function message() view returns (string)",
  "function name() view returns (string)",
  "function owner() view returns (address)",
]);

export const superfluidHostABI = parseAbi([
  "function batchCall((uint32 operationType,address target,bytes data)[] operations) payable",
  "function getAgreementClass(bytes32 agreementType) view returns (address)",
]);

export const ethxApproveABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
]);

export const cfaV1ForwarderABI = parseAbi([
  "function getFlowrate(address token, address sender, address receiver) view returns (int96)",
  "function setFlowrate(address token, address receiver, int96 flowrate) returns (bool)",
]);

const ethxUpgradeABI = parseAbi([
  "function upgradeByETHTo(address to) payable",
]);
const depositBufferABI = parseAbi([
  "function depositBuffer(address backer, uint256 amount)",
]);
const cfaCreateFlowABI = parseAbi([
  "function createFlow(address token, address receiver, int96 flowRate, bytes ctx) returns (bytes)",
]);
const cfaUpdateFlowABI = parseAbi([
  "function updateFlow(address token, address receiver, int96 flowRate, bytes ctx) returns (bytes)",
]);
const cfaDeleteFlowABI = parseAbi([
  "function deleteFlow(address token, address sender, address receiver, bytes ctx) returns (bytes)",
]);
const gdaConnectPoolABI = parseAbi([
  "function connectPool(address pool, bytes ctx) returns (bytes)",
]);

export type MarkeeStreamOperation = {
  data: Hex;
  operationType: number;
  target: Address;
};

export function getMarkeeStreamAmounts(
  monthlyWei: bigint,
  monthsFixed18: bigint,
) {
  const ratePerSecond =
    (monthlyWei + MARKEE_SECONDS_IN_MONTH - 1n) / MARKEE_SECONDS_IN_MONTH;
  const buffer = ratePerSecond * MARKEE_BUFFER_PERIOD;
  const prefund = (monthlyWei * monthsFixed18) / 10n ** 18n;

  return {
    buffer,
    prefund,
    ratePerSecond,
    value: buffer + prefund,
  };
}

export function getMarkeeMonthlyAmountForFundingValue(
  fundingValue: bigint,
  monthsFixed18: bigint,
) {
  if (fundingValue <= 0n || monthsFixed18 <= 0n) return 0n;

  let lowerBound = 0n;
  let upperBound = (fundingValue * 10n ** 18n) / monthsFixed18 + 1n;

  while (lowerBound < upperBound) {
    const candidate = (lowerBound + upperBound + 1n) / 2n;
    if (
      getMarkeeStreamAmounts(candidate, monthsFixed18).value <= fundingValue
    ) {
      lowerBound = candidate;
    } else {
      upperBound = candidate - 1n;
    }
  }

  return lowerBound;
}

export function getMarkeeFundingMonths(
  duration: string,
  unit: MarkeeFundingUnit,
) {
  return (
    (parseUnits(duration, 18) * MARKEE_FUNDING_UNIT_SECONDS[unit]) /
    MARKEE_SECONDS_IN_MONTH
  );
}

export function getMarkeeStreamFunding({
  ethxAllowance,
  ethxBalance,
  requiredBuffer,
  totalRequired,
}: {
  ethxAllowance: bigint;
  ethxBalance: bigint;
  requiredBuffer: bigint;
  totalRequired: bigint;
}) {
  return {
    requiresApproval: ethxAllowance < requiredBuffer,
    wrapValue: ethxBalance < totalRequired ? totalRequired - ethxBalance : 0n,
  };
}

export function getBufferedMarkeeGasEstimate(gasEstimate: bigint) {
  return (gasEstimate * MARKEE_GAS_BUFFER_BPS + 9_999n) / 10_000n;
}

export function getMarkeeRequiredNativeBalance({
  gasEstimate,
  gasPrice,
  wrapValue,
}: {
  gasEstimate: bigint;
  gasPrice: bigint;
  wrapValue: bigint;
}) {
  const bufferedGas = getBufferedMarkeeGasEstimate(gasEstimate);

  return {
    bufferedGas,
    estimatedGasCost: bufferedGas * gasPrice,
    requiredBalance: wrapValue + bufferedGas * gasPrice,
  };
}

export function buildMarkeeOpenStreamOperations({
  approvalAmount = 0n,
  backer,
  board,
  buffer,
  cfaAgreement,
  ethx,
  gdaAgreement,
  existingMarkee,
  existingRatePerSecond,
  markee,
  pool,
  ratePerSecond,
  wrapValue,
}: {
  approvalAmount?: bigint;
  backer: Address;
  board: Address;
  buffer: bigint;
  cfaAgreement: Address;
  ethx: Address;
  gdaAgreement: Address;
  existingMarkee?: Address;
  existingRatePerSecond?: bigint;
  markee: Address;
  pool: Address;
  ratePerSecond: bigint;
  wrapValue: bigint;
}): MarkeeStreamOperation[] {
  const hasExistingFlow =
    existingMarkee != null && existingMarkee !== zeroAddress;
  const updatesExistingMarkee =
    hasExistingFlow && existingMarkee.toLowerCase() === markee.toLowerCase();
  const changesExistingRate =
    !updatesExistingMarkee || existingRatePerSecond !== ratePerSecond;
  const connectPoolCall = encodeFunctionData({
    abi: gdaConnectPoolABI,
    args: [pool, "0x"],
    functionName: "connectPool",
  });

  const operations: MarkeeStreamOperation[] = [];

  if (wrapValue > 0n) {
    operations.push({
      data: encodeFunctionData({
        abi: ethxUpgradeABI,
        args: [backer],
        functionName: "upgradeByETHTo",
      }),
      operationType: OP_SIMPLE_FORWARD_CALL,
      target: ethx,
    });
  }

  if (approvalAmount > 0n) {
    operations.push({
      data: encodeAbiParameters(
        [{ type: "address" }, { type: "uint256" }],
        [board, approvalAmount],
      ),
      operationType: OP_ERC20_APPROVE,
      target: ethx,
    });
  }

  if (buffer > 0n) {
    operations.push({
      data: encodeFunctionData({
        abi: depositBufferABI,
        args: [backer, buffer],
        functionName: "depositBuffer",
      }),
      operationType: OP_SIMPLE_FORWARD_CALL,
      target: board,
    });
  }

  if (hasExistingFlow && !updatesExistingMarkee) {
    const deleteFlowCall = encodeFunctionData({
      abi: cfaDeleteFlowABI,
      args: [ethx, backer, board, "0x"],
      functionName: "deleteFlow",
    });
    operations.push({
      data: encodeAbiParameters(
        [{ type: "bytes" }, { type: "bytes" }],
        [deleteFlowCall, "0x"],
      ),
      operationType: OP_CALL_AGREEMENT,
      target: cfaAgreement,
    });
  }

  if (changesExistingRate) {
    const flowCall = encodeFunctionData({
      abi: updatesExistingMarkee ? cfaUpdateFlowABI : cfaCreateFlowABI,
      args: [ethx, board, ratePerSecond, "0x"],
      functionName: updatesExistingMarkee ? "updateFlow" : "createFlow",
    });
    operations.push({
      data: encodeAbiParameters(
        [{ type: "bytes" }, { type: "bytes" }],
        [
          flowCall,
          updatesExistingMarkee ? "0x" : (
            encodeAbiParameters([{ type: "address" }], [markee])
          ),
        ],
      ),
      operationType: OP_CALL_AGREEMENT,
      target: cfaAgreement,
    });
  }

  operations.push({
    data: encodeAbiParameters(
      [{ type: "bytes" }, { type: "bytes" }],
      [connectPoolCall, "0x"],
    ),
    operationType: OP_CALL_AGREEMENT,
    target: gdaAgreement,
  });

  return operations;
}

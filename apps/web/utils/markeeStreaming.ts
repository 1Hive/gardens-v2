import {
  Address,
  encodeAbiParameters,
  encodeFunctionData,
  formatUnits,
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
export const MARKEE_AUTO_FUNDING_MONTHS = 3n;
export const MARKEE_ETH_GAS_RESERVE = 10n ** 15n;
export const MARKEE_SMALL_BALANCE_THRESHOLD = 2n * 10n ** 15n;
export const MARKEE_SMALL_BALANCE_WRAP_PERCENT = 90n;
const MARKEE_THOUSANDTH_ETH = 10n ** 15n;

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

const MARKEE_ETHX_BY_CHAIN_ID: Record<number, Address> = {
  8453: "0x46fd5cfB4c12D87acD3a13e92BAa53240C661D93",
  11155111: "0x30a6933Ca9230361972E413a15dC8114c952414e",
};

export const getMarkeeEthxAddress = (chainId: number | undefined) =>
  chainId == null ? undefined : MARKEE_ETHX_BY_CHAIN_ID[chainId];

export const streamingLeaderboardRuntimeABI = parseAbi([
  "error UnknownMarkee()",
  "function ETHX() view returns (address)",
  "function HOST() view returns (address)",
  "function backerDeposit(address backer) view returns (uint256)",
  "function backerMarkee(address backer) view returns (address)",
  "function aggregateRate(address markee) view returns (uint256)",
  "function beneficiaryAddress() view returns (address)",
  "function createMarkee(string message, string name) returns (address markeeAddress)",
  "function getTopMarkees(uint256 limit) view returns (address[] topAddresses, uint256[] topRates)",
  "function getMarkees(uint256 offset, uint256 limit) view returns (address[] result)",
  "function isMarkeeOnLeaderboard(address markee) view returns (bool)",
  "function markeeCount() view returns (uint256)",
  "function maxNameLength() view returns (uint256)",
  "function pendingSettlement(address backer) view returns (uint256)",
  "function percentToPlatformFeeReceiver() view returns (uint256)",
  "function poolOf(address markee) view returns (address)",
  "function revNetEnabled() view returns (bool)",
  "function topRate() view returns (uint256)",
  "function updateMessage(address markee, string newMessage)",
  "function updateName(address markee, string newName)",
  "function withdrawDeposit()",
  "event MarkeeCreated(address indexed markeeAddress, address indexed owner, string message, string name)",
  "event MarkeeRegistered(address indexed markeeAddress, address indexed pool)",
]);

export const markeeOwnerABI = parseAbi([
  "function message() view returns (string)",
  "function name() view returns (string)",
  "function owner() view returns (address)",
]);

export const superfluidHostABI = parseAbi([
  "error SF_TOKEN_MOVE_INSUFFICIENT_BALANCE()",
  "error UnknownMarkee()",
  "function batchCall((uint32 operationType,address target,bytes data)[] operations) payable",
  "function getAgreementClass(bytes32 agreementType) view returns (address)",
]);

export const ethxApproveABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function downgradeToETH(uint256 wad)",
  "function realtimeBalanceOfNow(address account) view returns (int256 availableBalance, uint256 deposit, uint256 owedDeposit, uint256 timestamp)",
  "function upgradeByETHTo(address to) payable",
]);

export const cfaV1ForwarderABI = parseAbi([
  "function getFlowrate(address token, address sender, address receiver) view returns (int96)",
  "function setFlowrate(address token, address receiver, int96 flowrate) returns (bool)",
]);

export const markeeSuperfluidPoolABI = parseAbi([
  "function getUnits(address member) view returns (uint128)",
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

export async function waitForMarkeeRegistration({
  isRegistered,
  maxAttempts = 5,
  retryDelayMs = 500,
}: {
  isRegistered: () => Promise<boolean>;
  maxAttempts?: number;
  retryDelayMs?: number;
}) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      if (await isRegistered()) return true;
    } catch {
      // A newly mined block may not be visible on every RPC backend yet.
    }

    if (attempt + 1 < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  return false;
}

export function getMarkeeStreamAmounts(
  monthlyWei: bigint,
  monthsFixed18: bigint,
  minimumMonthlyRate?: bigint,
) {
  const floorRatePerSecond = monthlyWei / MARKEE_SECONDS_IN_MONTH;
  const ratePerSecond =
    (
      minimumMonthlyRate != null &&
      floorRatePerSecond * MARKEE_SECONDS_IN_MONTH >= minimumMonthlyRate
    ) ?
      floorRatePerSecond
    : (monthlyWei + MARKEE_SECONDS_IN_MONTH - 1n) / MARKEE_SECONDS_IN_MONTH;
  const buffer = ratePerSecond * MARKEE_BUFFER_PERIOD;
  const prefund = (monthlyWei * monthsFixed18) / 10n ** 18n;

  return {
    buffer,
    prefund,
    ratePerSecond,
    value: buffer + prefund,
  };
}

export function roundUpMarkeeMonthlyMinimum(monthlyWei: bigint) {
  if (monthlyWei <= 0n) return 0n;
  return (
    ((monthlyWei + MARKEE_THOUSANDTH_ETH - 1n) / MARKEE_THOUSANDTH_ETH) *
    MARKEE_THOUSANDTH_ETH
  );
}

export function getMarkeeMonthlyAmountForFundingValue(
  fundingValue: bigint,
  monthsFixed18: bigint,
  existingDeposit = 0n,
) {
  if (fundingValue <= 0n || monthsFixed18 <= 0n) return 0n;

  let lowerBound = 0n;
  let upperBound =
    ((fundingValue + existingDeposit) * 10n ** 18n) / monthsFixed18 + 1n;

  while (lowerBound < upperBound) {
    const candidate = (lowerBound + upperBound + 1n) / 2n;
    const amounts = getMarkeeStreamAmounts(candidate, monthsFixed18);
    const depositTopUp =
      amounts.buffer > existingDeposit ? amounts.buffer - existingDeposit : 0n;
    if (amounts.prefund + depositTopUp <= fundingValue) {
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
  ethxAvailableBalance,
  requiredBuffer,
  totalRequired,
}: {
  ethxAllowance: bigint;
  ethxAvailableBalance: bigint;
  requiredBuffer: bigint;
  totalRequired: bigint;
}) {
  return {
    requiresApproval: ethxAllowance < requiredBuffer,
    wrapValue:
      ethxAvailableBalance < totalRequired ?
        totalRequired - ethxAvailableBalance
      : 0n,
  };
}

export function getMarkeeWithdrawableDeposit(
  deposit: bigint,
  ratePerSecond: bigint,
) {
  const requiredDeposit =
    ratePerSecond > 0n ? ratePerSecond * MARKEE_BUFFER_PERIOD : 0n;

  return deposit > requiredDeposit ? deposit - requiredDeposit : 0n;
}

export function getMarkeeRunwaySeconds(
  ethxBalance: bigint,
  ratePerSecond: bigint,
) {
  return ratePerSecond > 0n ? ethxBalance / ratePerSecond : 0n;
}

export function formatMarkeeRunway(seconds: bigint) {
  const safeSeconds = seconds > 0n ? seconds : 0n;
  const months = safeSeconds / MARKEE_SECONDS_IN_MONTH;
  const days = (safeSeconds % MARKEE_SECONDS_IN_MONTH) / 86_400n;
  const hours = (safeSeconds % 86_400n) / 3_600n;
  const minutes = (safeSeconds % 3_600n) / 60n;
  const remainingSeconds = safeSeconds % 60n;
  const pad = (value: bigint) => value.toString().padStart(2, "0");
  const parts: string[] = [];

  if (months > 0n) parts.push(`${months}mo`);
  if (months > 0n || days > 0n) parts.push(`${days}d`);
  parts.push(`${pad(hours)}h`, `${pad(minutes)}m`, `${pad(remainingSeconds)}s`);
  return parts.join(" ");
}

export function formatMarkeeRunwayShort(seconds: bigint) {
  const safeSeconds = seconds > 0n ? seconds : 0n;
  const months = safeSeconds / MARKEE_SECONDS_IN_MONTH;
  const days = (safeSeconds % MARKEE_SECONDS_IN_MONTH) / 86_400n;
  const hours = (safeSeconds % 86_400n) / 3_600n;
  return `${months}mo ${days}d ${hours}h`;
}

export function formatMarkeeEthxBalance(value: bigint) {
  const amount = Number(formatUnits(value, 18));
  return amount.toFixed(amount < 0.001 ? 4 : 3);
}

export function getMarkeeRunwayProgress(seconds: bigint) {
  const cap = MARKEE_SECONDS_IN_MONTH * MARKEE_AUTO_FUNDING_MONTHS;
  if (seconds <= 0n) return 0;
  if (seconds >= cap) return 100;
  return Number((seconds * 100n) / cap);
}

export function getMarkeeAutoFunding({
  ethxAvailableBalance,
  existingDeposit = 0n,
  nativeBalance,
  nativeReserve = MARKEE_ETH_GAS_RESERVE,
  ratePerSecond,
}: {
  ethxAvailableBalance: bigint;
  existingDeposit?: bigint;
  nativeBalance: bigint;
  nativeReserve?: bigint;
  ratePerSecond: bigint;
}) {
  if (ratePerSecond <= 0n) {
    return {
      depositTopUp: 0n,
      insufficientEth: false,
      prefund: 0n,
      runwaySeconds: 0n,
      wrapValue: 0n,
    };
  }

  const buffer = ratePerSecond * MARKEE_BUFFER_PERIOD;
  const depositTopUp = buffer > existingDeposit ? buffer - existingDeposit : 0n;
  const availableBalance =
    ethxAvailableBalance > 0n ? ethxAvailableBalance : 0n;
  const balanceAfterDeposit =
    availableBalance > depositTopUp ? availableBalance - depositTopUp : 0n;

  // Match Markee's automatic funding policy: keep existing ETHx when it can
  // clear the board deposit and the sender-side Superfluid buffer. Otherwise,
  // wrap up to three months of runway while preserving native ETH for gas.
  if (balanceAfterDeposit > buffer) {
    return {
      depositTopUp,
      insufficientEth: false,
      prefund: balanceAfterDeposit,
      runwaySeconds: balanceAfterDeposit / ratePerSecond,
      wrapValue: 0n,
    };
  }

  const affordable =
    nativeBalance < MARKEE_SMALL_BALANCE_THRESHOLD ?
      (nativeBalance * MARKEE_SMALL_BALANCE_WRAP_PERCENT) / 100n
    : nativeBalance > nativeReserve ? nativeBalance - nativeReserve
    : 0n;
  const targetWrap =
    ratePerSecond * MARKEE_SECONDS_IN_MONTH * MARKEE_AUTO_FUNDING_MONTHS;
  const wrapValue = targetWrap < affordable ? targetWrap : affordable;
  const fundedBalance = availableBalance + wrapValue;
  const prefund =
    fundedBalance > depositTopUp ? fundedBalance - depositTopUp : 0n;

  return {
    depositTopUp,
    insufficientEth: prefund <= buffer,
    prefund,
    runwaySeconds: prefund > 0n ? prefund / ratePerSecond : 0n,
    wrapValue,
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

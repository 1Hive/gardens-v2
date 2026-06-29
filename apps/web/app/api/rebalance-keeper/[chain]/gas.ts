export const DEFAULT_REBALANCE_GAS_BUFFER_BPS = 14_000n;
export const MIN_REBALANCE_GAS_BUFFER_BPS = 10_000n;
export const MAX_REBALANCE_GAS_BUFFER_BPS = 20_000n;
export const DEFAULT_REBALANCE_BLOCK_GAS_CAP_BPS = 9_000n;
export const MIN_REBALANCE_BLOCK_GAS_CAP_BPS = 1n;
export const MAX_REBALANCE_BLOCK_GAS_CAP_BPS = 10_000n;

const parseBpsEnv = ({
  value,
  fallback,
  min,
  max,
}: {
  value: string | undefined;
  fallback: bigint;
  min: bigint;
  max: bigint;
}) => {
  if (value == null || value.trim() === "") return fallback;

  try {
    const parsed = BigInt(value);
    if (parsed < min || parsed > max) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
};

export const getRebalanceGasBufferBps = () =>
  parseBpsEnv({
    value: process.env.STREAMING_REBALANCE_GAS_BUFFER_BPS,
    fallback: DEFAULT_REBALANCE_GAS_BUFFER_BPS,
    min: MIN_REBALANCE_GAS_BUFFER_BPS,
    max: MAX_REBALANCE_GAS_BUFFER_BPS,
  });

export const getRebalanceBlockGasCapBps = () =>
  parseBpsEnv({
    value: process.env.STREAMING_REBALANCE_BLOCK_GAS_CAP_BPS,
    fallback: DEFAULT_REBALANCE_BLOCK_GAS_CAP_BPS,
    min: MIN_REBALANCE_BLOCK_GAS_CAP_BPS,
    max: MAX_REBALANCE_BLOCK_GAS_CAP_BPS,
  });

export const applyRebalanceGasBuffer = ({
  estimatedGas,
  blockGasLimit,
  bufferBps = getRebalanceGasBufferBps(),
  blockGasCapBps = getRebalanceBlockGasCapBps(),
}: {
  estimatedGas: bigint;
  blockGasLimit?: bigint;
  bufferBps?: bigint;
  blockGasCapBps?: bigint;
}) => {
  const bufferedGas = (estimatedGas * bufferBps + 9_999n) / 10_000n;
  if (blockGasLimit == null || blockGasLimit <= 0n) return bufferedGas;

  const blockGasCap = (blockGasLimit * blockGasCapBps) / 10_000n;
  if (blockGasCap <= 0n) return bufferedGas;

  return bufferedGas > blockGasCap ? blockGasCap : bufferedGas;
};

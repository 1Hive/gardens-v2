type ReceiverStream = {
  sender: { id: string };
  currentFlowRate: bigint | string;
};

export const getCurrentSenderFlowRate = (
  receiverStreams: ReceiverStream[],
  sender?: string,
) => {
  if (!sender) return null;

  const normalizedSender = sender.toLowerCase();
  const flowRate = receiverStreams.reduce(
    (total, stream) =>
      stream.sender.id.toLowerCase() === normalizedSender ?
        total + BigInt(stream.currentFlowRate)
      : total,
    0n,
  );

  return flowRate || null;
};

export const getDisplayedIncomingFlowRate = (
  directFlowRate: bigint | null | undefined,
  aggregateFlowRate: bigint | null,
) =>
  directFlowRate != null && directFlowRate > 0n ?
    directFlowRate
  : aggregateFlowRate;

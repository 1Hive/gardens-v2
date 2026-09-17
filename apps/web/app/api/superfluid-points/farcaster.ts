type FarcasterPaginationResponse = {
  next?: { cursor?: string };
  result?: { next?: { cursor?: string } };
};

type FarcasterWalletLabel = {
  label?: unknown;
  labels?: unknown;
};

export const getFarcasterNextCursor = (response: FarcasterPaginationResponse) =>
  response.next?.cursor ?? response.result?.next?.cursor;

export const hasPrimaryWalletLabel = ({
  label,
  labels,
}: FarcasterWalletLabel) =>
  Array.isArray(labels) ?
    labels.some(
      (value) =>
        typeof value === "string" && value.toLowerCase().includes("primary"),
    )
  : typeof label === "string" && label.toLowerCase().includes("primary");

const ERROR_SIGNATURE_LOOKUP_URL =
  "https://api.4byte.sourcify.dev/signature-database/v1/lookup";

const ERROR_SELECTOR_PATTERN = /^0x[a-fA-F0-9]{8}$/;
const UNKNOWN_ERROR_MESSAGE_PATTERN =
  /(?:encoded error )?signature\s+["']?(0x[a-fA-F0-9]{8})["']?\s+not found on (?:the )?abi/i;

export type ErrorSignatureCandidate = {
  name: string;
  filtered?: boolean;
  hasVerifiedContract?: boolean;
};

export type ErrorSignatureLookup = {
  provider: "sourcify-4byte";
  selector: `0x${string}`;
  candidates: ErrorSignatureCandidate[];
};

type ErrorLike = {
  name?: unknown;
  message?: unknown;
  signature?: unknown;
  cause?: unknown;
};

const lookupCache = new Map<string, Promise<ErrorSignatureLookup>>();

export function getUnknownErrorSelector(
  error: unknown,
): `0x${string}` | undefined {
  let current = error;
  let depth = 0;

  while (current != null && depth < 8) {
    if (typeof current !== "object") return undefined;

    const errorLike = current as ErrorLike;
    const name = typeof errorLike.name === "string" ? errorLike.name : "";
    const message =
      typeof errorLike.message === "string" ? errorLike.message : "";
    const isUnknownAbiError =
      name === "AbiErrorSignatureNotFoundError" ||
      UNKNOWN_ERROR_MESSAGE_PATTERN.test(message);

    if (isUnknownAbiError) {
      if (
        typeof errorLike.signature === "string" &&
        ERROR_SELECTOR_PATTERN.test(errorLike.signature)
      ) {
        return errorLike.signature.toLowerCase() as `0x${string}`;
      }

      const selector = message.match(UNKNOWN_ERROR_MESSAGE_PATTERN)?.[1];
      if (selector) return selector.toLowerCase() as `0x${string}`;
    }

    current = errorLike.cause;
    depth++;
  }

  return undefined;
}

export function lookupErrorSignature(
  selector: `0x${string}`,
): Promise<ErrorSignatureLookup> {
  const normalizedSelector = selector.toLowerCase() as `0x${string}`;
  const cached = lookupCache.get(normalizedSelector);
  if (cached) return cached;

  const lookup = fetch(
    `${ERROR_SIGNATURE_LOOKUP_URL}?function=${encodeURIComponent(normalizedSelector)}`,
  ).then(async (response) => {
    if (!response.ok) {
      throw new Error(
        `Error signature lookup failed with status ${response.status}`,
      );
    }

    const payload = (await response.json()) as {
      result?: {
        function?: Record<string, ErrorSignatureCandidate[]>;
      };
    };

    return {
      provider: "sourcify-4byte" as const,
      selector: normalizedSelector,
      candidates: payload.result?.function?.[normalizedSelector] ?? [],
    };
  });

  lookupCache.set(normalizedSelector, lookup);
  lookup.catch(() => lookupCache.delete(normalizedSelector));
  return lookup;
}

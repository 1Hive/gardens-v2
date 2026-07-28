import { Address } from "viem";

export type CovenantSignature = `0x${string}` | "";

export const COVENANT_SIGNATURES_STORAGE_KEY = "covenantSignatures";

type CovenantSignatures = Record<string, CovenantSignature>;

export const getCovenantSignatureKey = ({
  chainId,
  communityAddress,
  covenant,
}: {
  chainId: number;
  communityAddress: Address;
  covenant: string;
}) => `${chainId}-${communityAddress.toLowerCase()}-${covenant}`;

const readCovenantSignatures = (): CovenantSignatures => {
  if (typeof window === "undefined") return {};

  try {
    const storedValue = window.localStorage.getItem(
      COVENANT_SIGNATURES_STORAGE_KEY,
    );
    if (storedValue == null) return {};

    const parsedValue: unknown = JSON.parse(storedValue);
    if (
      parsedValue == null ||
      typeof parsedValue !== "object" ||
      Array.isArray(parsedValue)
    ) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedValue).filter(
        (entry): entry is [string, CovenantSignature] =>
          typeof entry[1] === "string" &&
          (entry[1] === "" || entry[1].startsWith("0x")),
      ),
    );
  } catch {
    return {};
  }
};

export const getCovenantSignature = (
  key: string,
): { found: boolean; signature?: CovenantSignature } => {
  const signatures = readCovenantSignatures();
  if (!Object.prototype.hasOwnProperty.call(signatures, key)) {
    return { found: false };
  }

  return { found: true, signature: signatures[key] };
};

export const setCovenantSignature = (
  key: string,
  signature: CovenantSignature,
) => {
  if (typeof window === "undefined") return;

  const signatures = readCovenantSignatures();
  window.localStorage.setItem(
    COVENANT_SIGNATURES_STORAGE_KEY,
    JSON.stringify({ ...signatures, [key]: signature }),
  );
};

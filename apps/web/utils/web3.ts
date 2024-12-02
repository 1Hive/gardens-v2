import { Chain } from "viem";
import { isAddress } from "viem";
import * as chains from "viem/chains";
import { ChainId } from "@/types";

/**
 * Gets the Viem chain configuration for a given chain ID
 * @param chainId The chain ID to look up
 * @returns The Chain configuration object
 * @throws Error if chain ID is not found
 */
export function getViemChain(chainId: ChainId): Chain {
  for (const chain of Object.values(chains)) {
    if ("id" in chain) {
      if (chain.id == chainId) {
        return chain;
      }
    }
  }

  throw new Error(`Chain with id ${chainId} not found`);
}

/**
 * Validates if a string is a valid ENS name
 * Follows ENS naming standards:
 * - Must end with .eth
 * - Min 3 characters, max 255 characters
 * - Can contain lowercase letters, numbers, and hyphens
 * - Cannot start or end with a hyphen
 * - Cannot have consecutive hyphens
 * @param address The string to validate
 * @returns boolean indicating if the string is a valid ENS name
 */
export const isENS = (address = ""): boolean => {
  // Basic ENS validation
  const ensRegex =
    /^(?:[a-z0-9][a-z0-9-]{0,61}[a-z0-9]\.)*[a-z0-9][a-z0-9-]{0,61}[a-z0-9]\.eth$/i;

  // Additional length validation
  const withoutEth = address.replace(/\.eth$/i, "");
  const isValidLength = withoutEth.length >= 3 && withoutEth.length <= 255;

  return ensRegex.test(address) && isValidLength;
};

/**
 * Validates if a string is either a valid Ethereum address or ENS name
 * @param value The string to validate
 * @returns boolean indicating if the string is a valid Ethereum address or ENS name
 */
export const isValidEthereumAddressOrENS = (value = ""): boolean => {
  return isAddress(value) || isENS(value);
};

/**
 * Checks if a string matches the format of an Ethereum address (0x followed by 40 hex characters)
 * Note: This does not validate checksum. Use isAddress from viem for full validation
 * @param value The string to validate
 * @returns boolean indicating if the string matches Ethereum address format
 */
export const hasEthereumAddressFormat = (value = ""): boolean => {
  return /^0x[a-fA-F0-9]{40}$/i.test(value);
};

/**
 * Normalizes an Ethereum address or ENS name for consistent comparison
 * @param value The address or ENS name to normalize
 * @returns The normalized value (lowercase for ENS, unchanged for addresses)
 */
export const normalizeAddressOrENS = (value = ""): string => {
  if (isENS(value)) {
    return value.toLowerCase();
  }
  return value;
};

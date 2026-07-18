"use client";

import { useEffect, useMemo, useState } from "react";
import { Address, isAddress } from "viem";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { usePreferredReadClient } from "@/hooks/usePreferredReadClient";
import { cvStrategyABI } from "@/src/generated";

type CVStrategyCacheEntry =
  | { isCVStrategy: true; registryCommunity: Address }
  | { isCVStrategy: false };

const STORAGE_KEY = "gardens.cvStrategyAddress";
const LEGACY_STORAGE_PREFIX = "gardens.cvStrategyAddress.v";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const cache = new Map<string, CVStrategyCacheEntry>();
const pendingChecks = new Map<string, Promise<CVStrategyCacheEntry>>();
let didCleanupLegacyStorage = false;

type CacheStorage = Record<string, Record<string, unknown>>;

const getCacheKey = (chainId: number, address: Address) =>
  `${chainId}.${address.toLowerCase()}`;

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value != null && !Array.isArray(value);

const isValidEntry = (value: unknown): value is CVStrategyCacheEntry => {
  if (!isObjectRecord(value) || !("isCVStrategy" in value)) return false;
  if (value.isCVStrategy === false) return true;
  return (
    value.isCVStrategy === true &&
    typeof value.registryCommunity === "string" &&
    isAddress(value.registryCommunity) &&
    value.registryCommunity.toLowerCase() !== ZERO_ADDRESS
  );
};

const isCacheStorage = (value: unknown): value is CacheStorage =>
  isObjectRecord(value) && Object.values(value).every(isObjectRecord);

const readStorage = (): CacheStorage | undefined => {
  try {
    if (!didCleanupLegacyStorage) {
      Array.from({ length: window.localStorage.length }, (_, index) =>
        window.localStorage.key(index),
      )
        .filter(
          (key): key is string =>
            key?.startsWith(LEGACY_STORAGE_PREFIX) ?? false,
        )
        .forEach((key) => window.localStorage.removeItem(key));
      didCleanupLegacyStorage = true;
    }

    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) return undefined;
    const parsed = JSON.parse(storedValue) as unknown;
    if (!isCacheStorage(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return undefined;
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return undefined;
  }
};

const readCachedEntry = (chainId: number, address: Address) => {
  const cacheKey = getCacheKey(chainId, address);
  const memoryEntry = cache.get(cacheKey);
  if (memoryEntry) return memoryEntry;

  const storedEntry = readStorage()?.[String(chainId)]?.[address.toLowerCase()];
  if (!isValidEntry(storedEntry)) return undefined;
  cache.set(cacheKey, storedEntry);
  return storedEntry;
};

const writeCachedEntry = (
  chainId: number,
  address: Address,
  entry: CVStrategyCacheEntry,
) => {
  cache.set(getCacheKey(chainId, address), entry);
  try {
    const storage = readStorage() ?? {};
    const storedChain = storage[String(chainId)];
    const chainStorage = isObjectRecord(storedChain) ? storedChain : {};
    chainStorage[address.toLowerCase()] = entry;
    storage[String(chainId)] = chainStorage;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch {
    // The in-memory cache still deduplicates checks when storage is unavailable.
  }
};

export function usePoolLink(address?: string) {
  const chain = useChainFromPath();
  const readClient = usePreferredReadClient(chain?.id);
  const normalizedAddress = useMemo(
    () =>
      address && isAddress(address) ?
        (address.toLowerCase() as Address)
      : undefined,
    [address],
  );
  const [entry, setEntry] = useState<CVStrategyCacheEntry>();

  useEffect(() => {
    if (!normalizedAddress || chain?.id == null) {
      setEntry(undefined);
      return;
    }

    const cachedEntry = readCachedEntry(chain.id, normalizedAddress);
    if (cachedEntry) {
      setEntry(cachedEntry);
      return;
    }

    setEntry(undefined);
    let cancelled = false;
    const cacheKey = getCacheKey(chain.id, normalizedAddress);
    const pendingCheck =
      pendingChecks.get(cacheKey) ??
      (async () => {
        const bytecode = await readClient.getBytecode({
          address: normalizedAddress,
        });
        if (!bytecode || bytecode === "0x") {
          return { isCVStrategy: false } satisfies CVStrategyCacheEntry;
        }

        const registryCommunity = await readClient
          .readContract({
            address: normalizedAddress,
            abi: cvStrategyABI,
            functionName: "registryCommunity",
          })
          .catch(() => undefined);

        return (
            registryCommunity != null &&
              isAddress(registryCommunity) &&
              registryCommunity.toLowerCase() !== ZERO_ADDRESS
          ) ?
            {
              isCVStrategy: true,
              registryCommunity: registryCommunity.toLowerCase() as Address,
            }
          : ({ isCVStrategy: false } satisfies CVStrategyCacheEntry);
      })();

    pendingChecks.set(cacheKey, pendingCheck);
    pendingCheck
      .then((result) => {
        writeCachedEntry(chain.id, normalizedAddress, result);
        if (!cancelled) setEntry(result);
      })
      .catch((error) => {
        if (process.env.NODE_ENV === "development") {
          console.debug("Unable to detect CVStrategy address", {
            address: normalizedAddress,
            chainId: chain.id,
            error,
          });
        }
        if (!cancelled) setEntry(undefined);
      })
      .finally(() => {
        if (pendingChecks.get(cacheKey) === pendingCheck) {
          pendingChecks.delete(cacheKey);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chain?.id, normalizedAddress, readClient]);

  return (
      entry?.isCVStrategy === true && normalizedAddress && chain?.id != null
    ) ?
      `/gardens/${chain.id}/${entry.registryCommunity}/${normalizedAddress}`
    : undefined;
}

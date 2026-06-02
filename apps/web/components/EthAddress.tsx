"use client";

import React from "react";
import { Addreth } from "addreth/no-wagmi";
import Image from "next/image";
import Link from "next/link";
import { Address, isAddress } from "viem";
import { useEnsName, useEnsAvatar } from "wagmi";
import { LoadingSpinner } from "./LoadingSpinner";
import { isSafeAvatarUrl } from "@/app/api/utils";
import { newLogo } from "@/assets";
import { getExplorerUrl } from "@/configs/chains";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useExplorerPreference } from "@/hooks/useExplorerPreference";
import { usePreferredReadClient } from "@/hooks/usePreferredReadClient";
import { useTheme } from "@/providers/ThemeProvider";
import { cvStrategyABI } from "@/src/generated";
import { shortenAddress as shortenAddressFn } from "@/utils/text";

type EthAddressProps = {
  address?: Address;
  actions?: "all" | "copy" | "explorer" | "none";
  icon?: false | "ens" | "identicon" | ((address: Address) => string);
  shortenAddress?: boolean;
  label?: React.ReactNode;
  showPopup?: boolean;
  textColor?: string;
  explorer?: "explorer" | "louper";
};

type CVStrategyCacheEntry =
  | {
      isCVStrategy: true;
      registryCommunity: Address;
    }
  | {
      isCVStrategy: false;
    };

const CV_STRATEGY_ADDRESS_STORAGE_KEY = "gardens.cvStrategyAddress";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const cvStrategyAddressCache = new Map<string, CVStrategyCacheEntry>();
const pendingCVStrategyChecks = new Map<
  string,
  Promise<CVStrategyCacheEntry>
>();

type CVStrategyCacheStorage = Record<
  string,
  Record<string, CVStrategyCacheEntry>
>;

const getCVStrategyCacheKey = (chainId: number, address: Address) =>
  `${chainId}.${address.toLowerCase()}`;

const readCVStrategyStorage = (): CVStrategyCacheStorage | undefined => {
  try {
    const cachedValue = window.localStorage.getItem(
      CV_STRATEGY_ADDRESS_STORAGE_KEY,
    );
    if (!cachedValue) return undefined;

    const parsed = JSON.parse(cachedValue) as CVStrategyCacheStorage;
    return typeof parsed === "object" && parsed != null ? parsed : undefined;
  } catch {
    window.localStorage.removeItem(CV_STRATEGY_ADDRESS_STORAGE_KEY);
    return undefined;
  }
};

const getStoredCVStrategyEntry = (
  storage: CVStrategyCacheStorage,
  chainId: number,
  address: Address,
) => storage[String(chainId)]?.[address.toLowerCase()];

const readCachedCVStrategyAddress = (
  chainId: number,
  address: Address,
): CVStrategyCacheEntry | undefined => {
  const cacheKey = getCVStrategyCacheKey(chainId, address);
  const memoryEntry = cvStrategyAddressCache.get(cacheKey);
  if (memoryEntry) return memoryEntry;

  try {
    const storage = readCVStrategyStorage();
    const parsed =
      storage ? getStoredCVStrategyEntry(storage, chainId, address) : undefined;
    if (!parsed) return undefined;

    if (
      parsed.isCVStrategy === true &&
      isAddress(parsed.registryCommunity) &&
      parsed.registryCommunity.toLowerCase() !== ZERO_ADDRESS
    ) {
      cvStrategyAddressCache.set(cacheKey, parsed);
      return parsed;
    }

    if (parsed.isCVStrategy === false) {
      cvStrategyAddressCache.set(cacheKey, parsed);
      return parsed;
    }
  } catch {
    window.localStorage.removeItem(CV_STRATEGY_ADDRESS_STORAGE_KEY);
  }

  return undefined;
};

const writeCachedCVStrategyAddress = (
  chainId: number,
  address: Address,
  entry: CVStrategyCacheEntry,
) => {
  const cacheKey = getCVStrategyCacheKey(chainId, address);
  cvStrategyAddressCache.set(cacheKey, entry);

  try {
    const storage = readCVStrategyStorage() ?? {};
    const chainStorage = storage[String(chainId)] ?? {};
    chainStorage[address.toLowerCase()] = entry;
    storage[String(chainId)] = chainStorage;
    window.localStorage.setItem(
      CV_STRATEGY_ADDRESS_STORAGE_KEY,
      JSON.stringify(storage),
    );
  } catch {
    // localStorage can be unavailable or full; memory cache still dedupes this session.
  }
};

//TODO: handle theme change by create a theme object and pass it to Addre

//docs: https://github.com/bpierre/addreth?tab=readme-ov-file

export const EthAddress = ({
  address,
  actions = "all",
  icon = "identicon",
  shortenAddress = true,
  showPopup = true,
  label,
  textColor = "var(--color-green-500)",
  explorer = "explorer",
}: EthAddressProps) => {
  const divParentRef = React.useRef<HTMLDivElement>(null);
  const chain = useChainFromPath();
  const readClient = usePreferredReadClient(chain?.id);
  const { explorerPreference } = useExplorerPreference();
  const { resolvedTheme } = useTheme();
  const explorerUrl = getExplorerUrl(chain?.id, explorerPreference);
  const normalizedAddress = React.useMemo(
    () =>
      address && isAddress(address) ?
        (address.toLowerCase() as Address)
      : undefined,
    [address],
  );
  const [cvStrategyEntry, setCVStrategyEntry] = React.useState<
    CVStrategyCacheEntry | undefined
  >(undefined);

  const { data: ensName } = useEnsName({
    address: address as Address,
    enabled: isAddress(address ?? ""),
    chainId: 1,
    cacheTime: 30_000,
  });

  const { data: avatarUrl } = useEnsAvatar({
    name: ensName,
    enabled: Boolean(ensName),
    chainId: 1,
    cacheTime: 30_000,
  });

  React.useEffect(() => {
    if (!normalizedAddress || chain?.id == null) {
      setCVStrategyEntry(undefined);
      return;
    }

    const cachedEntry = readCachedCVStrategyAddress(
      chain.id,
      normalizedAddress,
    );
    if (cachedEntry) {
      setCVStrategyEntry(cachedEntry);
      return;
    }

    let cancelled = false;
    const cacheKey = getCVStrategyCacheKey(chain.id, normalizedAddress);
    const pendingCheck =
      pendingCVStrategyChecks.get(cacheKey) ??
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

    pendingCVStrategyChecks.set(cacheKey, pendingCheck);

    pendingCheck
      .then((entry) => {
        writeCachedCVStrategyAddress(chain.id, normalizedAddress, entry);
        if (!cancelled) {
          setCVStrategyEntry(entry);
        }
      })
      .catch((error) => {
        if (process.env.NODE_ENV === "development") {
          console.debug("Unable to detect CVStrategy address", {
            address: normalizedAddress,
            chainId: chain.id,
            error,
          });
        }
        if (!cancelled) {
          setCVStrategyEntry(undefined);
        }
      })
      .finally(() => {
        if (pendingCVStrategyChecks.get(cacheKey) === pendingCheck) {
          pendingCVStrategyChecks.delete(cacheKey);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chain?.id, normalizedAddress, readClient]);

  const poolHref =
    (
      cvStrategyEntry?.isCVStrategy === true &&
      normalizedAddress != null &&
      chain?.id != null
    ) ?
      `/gardens/${chain.id}/${cvStrategyEntry.registryCommunity}/${normalizedAddress}`
    : undefined;
  const showCVStrategyLink = poolHref != null && icon !== false;
  const addrethIcon =
    showCVStrategyLink ? false
    : isSafeAvatarUrl(avatarUrl) ?
      () => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="rounded-full"
          height={20}
          width={20}
          loading="lazy"
          src={avatarUrl!}
          alt="ENS Avatar"
        />
      )
    : icon;

  return address && chain?.id != null ?
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events
      <div
        ref={divParentRef}
        onClick={(e) => {
          // check if ancestors has a form element
          const formElement = divParentRef.current?.closest("form");
          if (formElement) {
            // Prevent Addreth click to propagate a form submit
            e.preventDefault();
          }
        }}
        className="inline-flex items-center gap-1"
      >
        {showCVStrategyLink && (
          <Link
            href={poolHref}
            aria-label="Open pool page"
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-primary hover:opacity-80"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={newLogo}
              alt=""
              height={20}
              width={20}
              className="h-5 w-5"
              loading="lazy"
            />
          </Link>
        )}
        <Addreth
          // theme={theme}
          theme={{
            base: `simple-${resolvedTheme === "lightTheme" ? "light" : "dark"}`,
            textColor: textColor,
            badgeIconRadius: 12,
            badgeHeight: 32,
            fontSize: 14,
          }}
          fontMono={"monospace"}
          label={() => (
            <>
              {label ??
                ensName ??
                (shortenAddress ? shortenAddressFn(address) : address)}
            </>
          )}
          // shortenAddress={shortenAddress}
          actions={actions}
          icon={addrethIcon}
          address={address as Address}
          popupNode={showPopup ? undefined : document.createElement("div")}
          explorer={(addr: string) => ({
            name: explorer === "explorer" ? "Explorer" : "Louper",
            url: `${explorerUrl}/address/${addr}`,
            // : `https://louper.dev/diamond/${addr}?network=${encodeURIComponent(louperNetworkSlug ?? "")}`,
            accountUrl: `${explorerUrl}/address/${addr}`,
            // : `https://louper.dev/diamond/${addr}?network=${encodeURIComponent(louperNetworkSlug ?? "")}`,
          })}
        />
      </div>
    : <LoadingSpinner />;
};

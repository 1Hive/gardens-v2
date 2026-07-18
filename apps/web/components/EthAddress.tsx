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
import { usePoolLink } from "@/hooks/usePoolLink";
import { useTheme } from "@/providers/ThemeProvider";
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
  const poolHref = usePoolLink(address);
  const { explorerPreference } = useExplorerPreference();
  const { resolvedTheme } = useTheme();
  const explorerUrl = getExplorerUrl(chain?.id, explorerPreference);
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

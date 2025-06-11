"use client";

import React from "react";
import { Addreth } from "addreth/no-wagmi";
import { Address, isAddress } from "viem";
import { useEnsName, useEnsAvatar } from "wagmi";
import { LoadingSpinner } from "./LoadingSpinner";
import { isSafeAvatarUrl } from "@/app/api/utils";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { shortenAddress as shortenAddressFn } from "@/utils/text";

type EthAddressProps = {
  address?: Address;
  actions?: "all" | "copy" | "explorer" | "none";
  icon?: false | "ens" | "identicon" | ((address: Address) => string);
  shortenAddress?: boolean;
  label?: React.ReactNode;
  showPopup?: boolean;
  textColor?: string;
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
}: EthAddressProps) => {
  const divParentRef = React.useRef<HTMLDivElement>(null);
  const chain = useChainFromPath();
  // const topLayerNode = document.getElementById("dialog");
  // const theme: ThemeDeclaration = {
  //   textColor: "black",
  //   // secondaryColor: "black",
  //   focusColor: "black",
  //   fontSize: 12,
  //   badgeHeight: 12,
  //   badgeGap: 12,
  //   badgeRadius: 12,
  //   badgeBackground: "black",
  //   badgePadding: 12,
  //   badgeLabelPadding: 12,
  //   popupBackground: "black",
  //   popupRadius: 12,
  //   popupShadow: "black",
  // };

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

  return address && chain?.id ?
      <div ref={divParentRef}>
        <Addreth
          // theme={theme}
          theme={{
            base: "simple-light",
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
          icon={
            isSafeAvatarUrl(avatarUrl) ?
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
            : icon
          }
          address={address as Address}
          popupNode={showPopup ? undefined : document.createElement("div")}
          explorer={(addr: string) => ({
            name: chain.name,
            url: `${chain.explorer}/address/${addr}`,
            accountUrl: `${chain.explorer}/address/${addr}`,
          })}
        />
      </div>
    : <LoadingSpinner />;
};

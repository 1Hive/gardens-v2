"use client";

import React, { useCallback } from "react";
import { Addreth } from "addreth";
import { blo } from "blo";
import { Address } from "viem";
import { useEnsName, mainnet, useEnsAvatar } from "wagmi";
import { LoadingSpinner } from "./LoadingSpinner";
import { chainDataMap } from "@/configs/chainServer";
import { useChainFromPath } from "@/hooks/useChainFromPath";

type EthAddressProps = {
  address?: Address;
  actions?: "all" | "copy" | "explorer" | "none";
  icon?: false | "ens" | "identicon" | ((address: Address) => string);
  mode?: "short" | "full" | "icon-only";
};

//TODO: handle theme change by create a theme object and pass it to Addre

//docs: https://github.com/bpierre/addreth?tab=readme-ov-file

export const EthAddress = ({
  address,
  actions = "all",
  icon = false,
  mode = "full",
}: EthAddressProps) => {
  const chain = useChainFromPath();
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
    address: address,
    chainId: mainnet.id,
    enabled: !!address,
  });

  const { data: avatarUrl } = useEnsAvatar({
    name: ensName,
    chainId: mainnet.id,
    enabled: !!ensName,
  });

  const generateIcon = useCallback(() => {
    if (!address) {
      return <></>;
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className={"!rounded-full mx-2"}
        src={avatarUrl ? avatarUrl : blo(address)}
        width="25"
        height="25"
      />
    );
  }, [avatarUrl, address]);

  return address && chain ?
      <div className="icon-only">
        <Addreth
          // theme={theme}
          theme={{
            base: "simple-light",
            textColor: "var(--color-green-500)",
            badgeIconRadius: 12,
            badgeHeight: 32,
            fontSize: 16,
          }}
          actions={actions}
          icon={generateIcon}
          address={address as Address}
          explorer={(addr) => ({
            name: chainDataMap[chain.id].name,
            url: `${chainDataMap[chain.id].explorer}${addr}`,
            accountUrl: `${chainDataMap[chain.id].explorer}${addr}`,
          })}
          shortenAddress={mode === "short" ? 4 : false}
          externalCss={true}
        />
      </div>
    : <LoadingSpinner />;
};

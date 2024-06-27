"use client";
import React from "react";
import { Addreth, ThemeDeclaration, Theme } from "addreth";
import { Address } from "viem";
import { chainDataMap } from "@/configs/chainServer";
import { getChainIdFromPath } from "@/utils/path";

type EthAddressProps = {
  address: Address;
  actions?: "all" | "copy" | "explorer" | "none";
  icon?: false | "ens" | "identicon" | ((address: Address) => string);
};

//TODO: handle theme change by create a theme object and pass it to Addre

//docs: https://github.com/bpierre/addreth?tab=readme-ov-file

export const EthAddress = ({
  address,
  actions = "all",
  icon = false,
}: EthAddressProps) => {
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
  const chainId = getChainIdFromPath();

  return (
    <Addreth
      // theme={theme}
      theme={{
        base: "simple-light",
        badgeIconRadius: 12,
        badgeHeight: 32,
        fontSize: 16,
      }}
      actions={actions}
      icon={icon}
      address={address}
      explorer={(address) => ({
        name: chainDataMap[chainId].name,
        url: `${chainDataMap[chainId].explorer}${address}`,
        accountUrl: `${chainDataMap[chainId].explorer}${address}`,
      })}
    />
  );
};

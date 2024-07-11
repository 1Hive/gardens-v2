"use client";
import React from "react";
import { Addreth } from "addreth";
import { Address } from "viem";
import LoadingSpinner from "./LoadingSpinner";
import { chainDataMap } from "@/configs/chainServer";
import useChainFromPath from "@/hooks/useChainFromPath";

type EthAddressProps = {
  address?: Address;
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

  return address && chain ?
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
        icon={icon}
        address={address as Address}
        explorer={(address) => ({
          name: chainDataMap[chain.id].name,
          url: `${chainDataMap[chain.id].explorer}${address}`,
          accountUrl: `${chainDataMap[chain.id].explorer}${address}`,
        })}
        ens={!chain?.testnet}
      />
    : <LoadingSpinner />;
};

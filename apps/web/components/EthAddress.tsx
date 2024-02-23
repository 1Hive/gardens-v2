"use client";
import React from "react";
import { Addreth } from "addreth";
import { Address } from "viem";

type EthAddressProps = {
  address: Address;
  actions?: "all" | "copy" | "explorer" | "none";
  icon?: false | "ens" | "identicon" | ((address: Address) => string);
};

//TODO: handle if more than one chain is used
//TODO: handle theme change

export const EthAddress = ({
  address,
  actions = "all",
  icon = false,
}: EthAddressProps) => {
  return (
    <Addreth
      actions={actions}
      icon={icon}
      address={address}
      explorer={(address) => ({
        name: "Base",
        url: `https://sepolia.arbiscan.io/address/${address}`,
        accountUrl: `https://sepolia.arbiscan.io/address/${address}`,
      })}
    />
  );
};

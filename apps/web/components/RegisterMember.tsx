"use client";
import React, { useEffect, useState } from "react";
import {
  useContractReads,
  useContractWrite,
  useAccount,
  useChainId,
  useContractRead,
  Address,
} from "wagmi";
import { Button } from "./Button";
import { toast } from "react-toastify";
import useErrorDetails from "@/utils/getErrorName";
import {
  confirmationsRequired,
  getContractsAddrByChain,
} from "@/constants/contracts";
import { useViemClient } from "@/hooks/useViemClient";
import { erc20ABI, registryCommunityABI } from "@/src/generated";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { getBuiltGraphSDK } from "#/subgraph/.graphclient";
import { WriteContractResult } from "wagmi/actions";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
import { useConnectModal } from "@rainbow-me/rainbowkit";

export function RegisterMember({
  communityAddress,
  // isMember,
  registerToken,
  registerStakeAmount,
}: {
  communityAddress: Address;
  // isMember: boolean;
  registerToken: Address;
  registerStakeAmount: number;
}) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { openConnectModal } = useConnectModal();

  // const [isMember, setIsMember] = useState();

  // const sdk = getBuiltGraphSDK();

  // const getIsMember = async () =>
  //   sdk.getMembers({
  //     me: address as `0x${string}`,
  //     comm: contractsAddresses?.registryCommunity as `0x${string}`,
  //   });

  const registryContractCallConfig = {
    address: communityAddress,
    abi: abiWithErrors(registryCommunityABI),
  };

  const {
    data: isMember,
    error,
    isSuccess,
  } = useContractRead({
    ...registryContractCallConfig,
    functionName: "isMember",
    args: [address || "0x"],
    watch: true,
  });

  const {
    data: registerMemberData,
    write: writeRegisterMember,
    error: registerMemberError,
    status: registerMemberStatus,
  } = useContractWrite({
    ...registryContractCallConfig,
    functionName: "stakeAndRegisterMember",
  });

  const {
    data: unregisterMemberData,
    write: writeUnregisterMember,
    error: unregisterMemberError,
    status: unregisterMemberStatus,
  } = useContractWrite({
    ...registryContractCallConfig,
    functionName: "unregisterMember",
  });

  const {
    data: allowTokenData,
    write: writeAllowToken,
    error: allowTokenError,
    status: allowTokenStatus,
  } = useContractWrite({
    address: registerToken,
    abi: abiWithErrors(erc20ABI),
    args: [communityAddress, BigInt(registerStakeAmount)], // allowed spender address, amount
    functionName: "approve",
  });

  useErrorDetails(registerMemberError, "stakeAndRegisterMember");
  useErrorDetails(unregisterMemberError, "unregisterMember");
  // useErrorDetails(errorMemberRegistered, "isMember");
  useErrorDetails(allowTokenError, "approve");
  // useErrorDetails(errorGardenToken, "gardenToken");

  async function handleChange() {
    if (address) {
      isMember ? writeUnregisterMember() : writeAllowToken();
    } else {
      openConnectModal?.();
    }
  }

  const { updateTransactionStatus: updateAllowTokenTransactionStatus } =
    useTransactionNotification(allowTokenData);

  const { updateTransactionStatus: updateRegisterMemberTransactionStatus } =
    useTransactionNotification(registerMemberData);

  const { updateTransactionStatus: updateUnregisterMemberTransactionStatus } =
    useTransactionNotification(unregisterMemberData);

  useEffect(() => {
    updateAllowTokenTransactionStatus(allowTokenStatus);
    if (allowTokenStatus === "success") {
      writeRegisterMember();
    }
  }, [allowTokenStatus]);

  useEffect(() => {
    updateRegisterMemberTransactionStatus(registerMemberStatus);
  }, [registerMemberStatus]);

  useEffect(() => {
    updateUnregisterMemberTransactionStatus(unregisterMemberStatus);
  }, [unregisterMemberStatus]);

  return (
    <Button onClick={handleChange} className="w-fit bg-primary">
      {address
        ? isMember
          ? "Leave community"
          : "Register in community"
        : "Connect Wallet"}
    </Button>
  );
}

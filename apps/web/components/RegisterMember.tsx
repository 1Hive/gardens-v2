"use client";
import React, { useEffect, useState } from "react";
import {
  useContractReads,
  useContractWrite,
  useAccount,
  useChainId,
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

export function RegisterMember({
  communityAddress,
  isMember,
  registerToken,
  registerStakeAmount,
}: {
  communityAddress: Address;
  isMember: boolean;
  registerToken: Address;
  registerStakeAmount: number;
}) {
  const viemClient = useViemClient();

  const registryContractCallConfig = {
    address: communityAddress,
    abi: abiWithErrors(registryCommunityABI),
  };

  const {
    data: registerMemberData,
    write: writeRegisterMember,
    error: errorRegisterMember,
    isSuccess: isSuccessRegisterMember,
  } = useContractWrite({
    ...registryContractCallConfig,
    functionName: "stakeAndRegisterMember",
  });

  const {
    data: unregisterMemberData,
    write: writeUnregisterMember,
    error: errorUnregisterMember,
    isSuccess: isSuccessUnregisterMember,
  } = useContractWrite({
    ...registryContractCallConfig,
    functionName: "unregisterMember",
  });

  const {
    data: allowTokenData,
    write: writeAllowToken,
    error: errorAllowToken,
    isSuccess: isSuccessAllowToken,
  } = useContractWrite({
    address: registerToken,
    abi: abiWithErrors(erc20ABI),
    args: [communityAddress, BigInt(registerStakeAmount)], // allowed spender address, amount
    functionName: "approve",
  });

  useErrorDetails(errorRegisterMember, "stakeAndRegisterMember");
  useErrorDetails(errorUnregisterMember, "unregisterMember");
  // useErrorDetails(errorMemberRegistered, "isMember");
  // useErrorDetails(errorAmount, "approve");
  // useErrorDetails(errorGardenToken, "gardenToken");

  const transactionReceipt = async () =>
    await viemClient.waitForTransactionReceipt({
      confirmations: confirmationsRequired,
      hash: isMember
        ? unregisterMemberData?.hash || "0x"
        : registerMemberData?.hash || "0x",
    });

  async function handleChange() {
    isMember ? writeUnregisterMember?.() : registerMember();
  }

  const registerMember = () => {
    writeAllowToken?.();
  };

  useEffect(() => {
    if (isSuccessAllowToken) {
      writeRegisterMember?.();
    }
  }, [allowTokenData]);

  useEffect(() => {
    if (isSuccessRegisterMember || isSuccessUnregisterMember) {
      const receipt = transactionReceipt();
      toast
        .promise(receipt, {
          pending: "Transaction in progress",
          success: "Transaction Success",
          error: "Something went wrong",
        })
        .then((data) => {
          console.log(data);
        })
        .catch((error: any) => {
          console.error(`Tx failure: ${error}`);
        });
    }
  }, [isSuccessRegisterMember, isSuccessUnregisterMember]);

  if (isMember === undefined) return;
  return (
    <Button onClick={handleChange} className="w-fit bg-primary">
      {isMember ? "Leave community" : "Register in community"}
    </Button>
  );
}

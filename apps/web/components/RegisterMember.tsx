"use client";
import React, { useEffect } from "react";
import { useContractRead, useContractWrite, useAccount } from "wagmi";
import { Button } from "./Button";
import { toast } from "react-toastify";
import useErrorDetails from "@/utils/getErrorName";
import {
  confirmationsRequired,
  contractsAddresses,
} from "@/constants/contracts";
import { useViemClient } from "@/hooks/useViemClient";
import { erc20ABI, registryCommunityABI } from "@/src/generated";
import { abiWithErrors } from "@/utils/abiWithErrors";

export function RegisterMember() {
  const { address } = useAccount();
  const viemClient = useViemClient();

  const {
    data: isMemberRegistered,
    error: errorMemberRegistered,
    status: isMemberStatus,
  } = useContractRead({
    address: contractsAddresses.registryCommunity,
    abi: abiWithErrors(registryCommunityABI),
    functionName: "isMember",
    args: [address || "0x"],
    watch: true,
  });

  console.log(contractsAddresses.registryCommunity);
  
  const {
    data: gardenTokenAddress,
    error: errorGardenToken,
    status: gardenTokenStatus,
  } = useContractRead({
    address: contractsAddresses.registryCommunity,
    abi: abiWithErrors(registryCommunityABI),
    functionName: "gardenToken",
    watch: true,
  });

  const {
    data: amountData,
    error: errorAmount,
    status: amountStatus,
  } = useContractRead({
    address: contractsAddresses.registryCommunity,
    abi: abiWithErrors(registryCommunityABI),
    functionName: "registerStakeAmount",
    watch: true,
  });
console.log(amountData)
  const {
    data: registerMemberData,
    write: writeRegisterMember,
    error: errorRegisterMember,
    isSuccess: isSuccessRegisterMember,
  } = useContractWrite({
    address: contractsAddresses.registryCommunity,
    abi: abiWithErrors(registryCommunityABI),
    functionName: "stakeAndRegisterMember",
  });

  const {
    data: unregisterMemberData,
    write: writeUnregisterMember,
    error: errorUnregisterMember,
    isSuccess: isSuccessUnregisterMember,
  } = useContractWrite({
    address: contractsAddresses.registryCommunity,
    abi: abiWithErrors(registryCommunityABI),
    functionName: "unregisterMember",
  });

  const {
    data: allowTokenData,
    write: writeAllowToken,
    error: errorAllowToken,
    isSuccess: isSuccessAllowToken,
  } = useContractWrite({
    address: gardenTokenAddress as `0x${string}`,
    abi: abiWithErrors(erc20ABI),
    args: [contractsAddresses.registryCommunity, amountData], // allowed spender address, amount
    functionName: "approve",
  });

  useErrorDetails(errorRegisterMember, "stakeAndRegisterMember");
  useErrorDetails(errorUnregisterMember, "unregisterMember");
  useErrorDetails(errorMemberRegistered, "isMember");
  useErrorDetails(errorAmount, "approve");
  useErrorDetails(errorGardenToken, "gardenToken");

  const transactionReceipt = async () =>
    await viemClient.waitForTransactionReceipt({
      confirmations: confirmationsRequired,
      hash: isMemberRegistered
        ? unregisterMemberData?.hash || "0x"
        : registerMemberData?.hash || "0x",
    });

  async function handleChange() {
    isMemberRegistered ? writeUnregisterMember?.() : registerMember();
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

  if (isMemberRegistered === undefined) return;
  return (
    <Button onClick={handleChange} className="w-fit bg-primary">
      {isMemberRegistered
        ? "Unregister from community"
        : "Register in community"}
    </Button>
  );
}

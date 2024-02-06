"use client";
import React, { useEffect, useState } from "react";
import {
  useContractReads,
  useContractWrite,
  useAccount,
  useChainId,
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

export function RegisterMember() {
  const { address } = useAccount();
  const viemClient = useViemClient();
  const chainId = useChainId();
  const contractsAddresses = getContractsAddrByChain(chainId);
  const [isMemberRegistered, setIsMemberRegistered] = useState<
    boolean | undefined
  >(undefined);
  const [registerStakeAmount, setRegisterStakeAmount] = useState<number>(0);
  const [gardenToken, setGardenToken] = useState<`0x${string}` | undefined>(
    undefined,
  );

  const registryContractCallConfig = {
    address: contractsAddresses?.registryCommunity,
    abi: abiWithErrors(registryCommunityABI),
  };

  const {
    data: contractsData,
    error,
    isSuccess,
  } = useContractReads({
    contracts: [
      {
        ...registryContractCallConfig,
        functionName: "isMember",
        args: [address || "0x"],
      },
      {
        ...registryContractCallConfig,
        functionName: "registerStakeAmount",
      },
      {
        ...registryContractCallConfig,
        functionName: "gardenToken",
      },
    ],
  });

  useEffect(() => {
    if (isSuccess && contractsData !== undefined) {
      if (contractsData[0]?.status === "success") {
        setIsMemberRegistered(contractsData[0]?.result as boolean);
      }
      if (contractsData[1]?.status === "success") {
        setRegisterStakeAmount(Number(contractsData[1]?.result as BigInt));
      }
      if (contractsData[2]?.status === "success") {
        setGardenToken(contractsData[2]?.result as `0x${string}`);
      }
    }
  }, [contractsData]);

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
    address: gardenToken as `0x${string}`,
    abi: abiWithErrors(erc20ABI),
    args: [contractsAddresses?.registryCommunity, BigInt(registerStakeAmount)], // allowed spender address, amount
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

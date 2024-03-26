import { registryCommunityABI } from "@/src/generated";
import { abiWithErrors } from "@/utils/abiWithErrors";
import React from "react";
import { Address, useContractWrite } from "wagmi";
import { Button } from "./Button";

type IncreasePowerProps = {
  communityAddress: string;
};

export const IncreasePower = ({ communityAddress }: IncreasePowerProps) => {
  const {
    data: increaseStakeData,
    write: writeIncreasePower,
    error: errorIncreaseStake,
    status: increaseStakeStatus,
  } = useContractWrite({
    address: communityAddress as Address,
    abi: abiWithErrors(registryCommunityABI),
    functionName: "increasePower",
    args: [50000000000000000000n],
  });

  return (
    <Button
      onClick={() => writeIncreasePower?.()}
      className="max-h-[50px] w-full"
    >
      Stake more
    </Button>
  );
};

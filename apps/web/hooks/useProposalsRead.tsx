import { useContractWrite, useContractRead, useContractReads } from "wagmi";
import { useState, useEffect } from "react";
import { Abi } from "viem";
import CVStrategyABI from "#/contracts/out/CVStrategy.sol/CVStrategy.json";
import { alloContract, contractsAddresses } from "@/constants/contracts";

export const useProposalsReads = ({ poolId }: { poolId: number }) => {
  const [strategyAddress, setStrategyAddress] = useState<
    `0x${string}` | undefined
  >();
  const {
    data,
    isLoading: poolLoading,
    isError: poolError,
    error: poolerro,
  } = useContractRead({
    address: contractsAddresses.allo,
    abi: alloContract.abi as Abi,
    functionName: "getPool",
    args: [poolId],
    onError: (error) => {
      console.log(error);
    },
    onSuccess: (data) => {
      console.log(data);

      setStrategyAddress(data?.strategy?.toString());
    },
  });

  //get the proposals data based on strategy address
  const alloContractReads = {
    address: strategyAddress,
    abi: CVStrategyABI.abi as Abi,
    functionName: "getProposal",
  };

  const { data: proposals } = useContractReads({
    contracts: [
      {
        ...alloContractReads,
        args: [1],
      },
      {
        ...alloContractReads,
        args: [2],
      },
      {
        ...alloContractReads,
        args: [3],
      },
    ],
  });

  return proposals;

  console.log(proposals);
};

"use client";
import React, { FC, useState } from "react";
import { Strategy } from "./Proposals";
import { Address, useAccount, useContractRead, useContractWrite } from "wagmi";
import { formatTokenAmount } from "@/utils/numbers";
import { abiWithErrors, abiWithErrors2 } from "@/utils/abiWithErrors";
import { alloABI, erc20ABI, registryCommunityABI } from "@/src/generated";
import { Button } from "./Button";
import { Allo, TokenGarden } from "#/subgraph/.graphclient";
import { parseUnits } from "viem";
import { FormInput } from "./Forms";
import { ConditionObject, useTooltipMessage } from "@/hooks/useTooltipMessage";

type PoolStatsProps = {
  balance: string | number;
  strategyAddress: Address;
  strategy: Strategy;
  communityAddress: Address;
  tokenGarden: TokenGarden;
  pointSystem: string;
  spendingLimit?: number;
  alloInfo: Allo;
  poolId: number;
};

export const PoolMetrics: FC<PoolStatsProps> = ({
  alloInfo,
  balance,
  strategy,
  communityAddress,
  tokenGarden,
  spendingLimit,
  poolId,
}) => {
  const [amount, setAmount] = useState<number | string>("");
  const { address: connectedAccount } = useAccount();

  const registryContractCallConfig = {
    address: communityAddress,
    abi: abiWithErrors2(registryCommunityABI),
  };

  //TODO: create a hook for this
  const {
    data: isMember,
    error,
    isSuccess,
  } = useContractRead({
    ...registryContractCallConfig,
    functionName: "isMember",
    args: [connectedAccount as Address],
    watch: true,
  });

  const { data: fundPool, write: writeFundPool } = useContractWrite({
    address: alloInfo?.id as Address,
    abi: abiWithErrors(alloABI),
    functionName: "fundPool",
  });

  const {
    data: allowTokenData,
    write: writeAllowToken,
    error: allowTokenError,
    status: allowTokenStatus,
  } = useContractWrite({
    address: tokenGarden.address as Address,
    abi: abiWithErrors(erc20ABI),
    functionName: "approve",
    onSuccess: () =>
      writeFundPool({
        args: [poolId, parseUnits(amount.toString(), tokenGarden?.decimals)],
      }),
  });

  const writeContract = () => {
    writeAllowToken({
      args: [
        alloInfo?.id,
        parseUnits(amount.toString(), tokenGarden?.decimals),
      ],
    });
  };

  // Activate Tooltip condition => message mapping
  const disableActiveBtnCondition: ConditionObject[] = [
    // {
    //   condition: amount ? amount > 0 : false,
    //   message: "Join community to activate points",
    // },
  ];

  const disableActiveBtn = disableActiveBtnCondition.some(
    (cond) => cond.condition,
  );

  const tooltipMessage = useTooltipMessage(disableActiveBtnCondition);

  return (
    <>
      <section className="border2 flex w-full justify-between rounded-xl bg-white px-12 py-4">
        <div className="flex flex-col">
          <h3 className="font-semibold">Metrics</h3>
          <div className="flex justify-between">
            <div className="flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-10">
                  <div className="flex w-full items-baseline gap-8">
                    <h4 className="stat-title text-center text-xl font-bold">
                      Funds Available:
                    </h4>
                    <span className="stat-value text-center text-2xl font-bold">
                      {balance
                        ? formatTokenAmount(balance, tokenGarden?.decimals)
                        : "0"}{" "}
                      {tokenGarden?.symbol}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex w-full items-baseline gap-8">
                <h4 className="stat-title text-center text-lg font-bold">
                  Spendig Limit:
                </h4>
                <span className="stat-value ml-8 text-center text-xl">
                  {`${spendingLimit} %`}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-4">
          <FormInput
            type="number"
            value={amount}
            placeholder="0"
            required
            step={0.00000001}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <Button
            disabled={!connectedAccount}
            tooltip={tooltipMessage}
            onClick={() => writeContract()}
          >
            Fund pool
          </Button>
        </div>
      </section>
    </>
  );
};

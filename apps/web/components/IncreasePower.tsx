"use client";

import { useEffect, useState } from "react";
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import { Dnum } from "dnum";
import { formatUnits } from "viem";
import { Address, useAccount, useBalance } from "wagmi";
import {
  isMemberQuery,
  RegistryCommunity,
  TokenGarden,
} from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { DisplayNumber } from "./DisplayNumber";
import { EthAddress } from "./EthAddress";
import { InfoBox } from "./InfoBox";
import { InfoWrapper } from "./InfoWrapper";
import { TransactionModal, TransactionProps } from "./TransactionModal";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useHandleAllowance } from "@/hooks/useHandleAllowance";
import { registryCommunityABI } from "@/src/generated";
import { parseToken } from "@/utils/numbers";
import { getTxMessage } from "@/utils/transactionMessages";

type IncreasePowerProps = {
  memberData: isMemberQuery | undefined;
  registryCommunity: Pick<
    RegistryCommunity,
    | "communityName"
    | "id"
    | "covenantIpfsHash"
    | "communityFee"
    | "protocolFee"
    | "registerStakeAmount"
    | "registerToken"
  >;
  tokenGarden: Pick<TokenGarden, "symbol" | "decimals" | "address">;
  registrationAmount: Dnum;
};

export const IncreasePower = ({
  memberData,
  registryCommunity,
  tokenGarden,
  registrationAmount,
}: IncreasePowerProps) => {
  const {
    symbol: tokenSymbol,
    decimals: tokenDecimals,
    address: registerToken,
  } = tokenGarden;
  const {
    communityName,
    registerStakeAmount: registerStakeAmountStr,
    id: communityAddress,
  } = registryCommunity;

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [amountPerc, setAmountPerc] = useState("0");
  const [stakedAmount, setStakedAmount] = useState("0");
  const { address: accountAddress } = useAccount();

  const isMember = memberData?.member?.memberCommunity?.[0]?.isRegistered;

  const registerStakeAmountBigInt = BigInt(
    typeof registerStakeAmountStr === "string" ? registerStakeAmountStr : "0",
  );

  const registerStakeAmount = +registerStakeAmountStr / 10 ** tokenDecimals;

  const urlChainId = useChainIdFromPath();

  const roundedStakedAmount = (+stakedAmount).toPrecision(4);

  const { data: accountTokenBalance } = useBalance({
    address: accountAddress,
    token: registerToken as Address,
    chainId: urlChainId,
    watch: true,
    enabled: !!accountAddress && !!registerToken,
  });

  const initialStakedAmountBn = BigInt(
    memberData?.member?.memberCommunity?.[0]?.stakedTokens ?? 0,
  );
  const initialStakedAmount =
    initialStakedAmountBn ?
      +formatUnits(initialStakedAmountBn, tokenDecimals)
    : 0;

  const accountTokenBalancePlusStakeAmount =
    accountTokenBalance &&
    initialStakedAmount &&
    +accountTokenBalance.formatted + initialStakedAmount;

  const stakedAmountBn = BigInt(
    Math.round(+stakedAmount * 10 ** tokenDecimals),
  );

  const minAmountPercentage =
    (registerStakeAmount / (accountTokenBalancePlusStakeAmount ?? 1)) * 100;

  const stakeDifferenceBn =
    +amountPerc >= 100 && accountTokenBalance ?
      accountTokenBalance.value
    : stakedAmountBn - initialStakedAmountBn;
  const stakeDifference = +stakedAmount - initialStakedAmount;
  const stakeDifferenceRounded = stakeDifference.toPrecision(4);

  const registryContractCallConfig = {
    address: communityAddress as Address,
    abi: registryCommunityABI,
    contractName: "Registry Community",
  };

  const { publish } = usePubSubContext();

  const [votingPowerTx, setVotingPowerTx] = useState<TransactionProps>({
    contractName: `Stake ${tokenGarden.symbol} in ${communityName}`,
    message: `Stake ${roundedStakedAmount} ${tokenSymbol} in ${communityName}`,
    status: "idle",
  });

  const {
    write: writeIncreasePower,
    transactionStatus: increasePowerStatus,
    error: increasePowerError,
  } = useContractWriteWithConfirmations({
    ...registryContractCallConfig,
    functionName: "increasePower",
    args: [stakeDifferenceBn],
    showNotification: false,
    fallbackErrorMessage:
      "Error staking governance token, please report a bug.",
    onConfirmations: () => {
      publish({
        topic: "member",
        type: "update",
        function: "increasePower",
        containerId: communityAddress,
        id: accountAddress,
        chainId: urlChainId,
      });
    },
  });

  const { write: writeDecreasePower, status: decreaseStatus } =
    useContractWriteWithConfirmations({
      ...registryContractCallConfig,
      functionName: "decreasePower",
      // Difference between staked amount and initial amount
      args: [stakeDifferenceBn * -1n],
      fallbackErrorMessage: "Error decreasing power, please report a bug.",
      onConfirmations: () => {
        publish({
          topic: "member",
          type: "update",
          containerId: communityAddress,
          function: "decreasePower",
          id: accountAddress,
          chainId: urlChainId,
        });
      },
    });

  useEffect(() => {
    setVotingPowerTx((prev) => ({
      ...prev,
      message: getTxMessage(increasePowerStatus, increasePowerError),
      status: increasePowerStatus ?? "idle",
    }));
  }, [increasePowerStatus]);

  function handleClick() {
    if (stakeDifferenceBn > 0n) {
      setVotingPowerTx((prev) => ({
        ...prev,
        message: getTxMessage("idle"),
        status: "idle",
      }));
      setIsOpenModal(true);
      handleAllowance({});
    } else {
      writeDecreasePower();
    }
  }

  useEffect(() => {
    if (accountTokenBalancePlusStakeAmount == null) return;
    setStakedAmount((initialStakedAmount ?? 0).toPrecision(4));
    setAmountPerc(
      (accountTokenBalance?.value == 0n ?
        100
      : (initialStakedAmount / accountTokenBalancePlusStakeAmount) * 100
      ).toString(),
    );
  }, [accountTokenBalancePlusStakeAmount]);

  const { allowanceTxProps: allowanceTx, handleAllowance } = useHandleAllowance(
    accountAddress,
    tokenGarden,
    communityAddress as Address,
    stakeDifferenceBn,
    () => writeIncreasePower(),
    `Approve ${tokenSymbol}`,
  );

  const AddedStake = [
    stakedAmountBn - registerStakeAmountBigInt,
    tokenDecimals,
  ] as Dnum;

  const { isButtonDisabled, tooltipMessage } = useDisableButtons([
    { condition: !isMember, message: "Join this community first" },
    {
      condition: +stakedAmount < registerStakeAmount,
      message: `Minimum stake amount is ${registerStakeAmount} ${tokenSymbol} (${communityName} registration stake)`,
    },
    {
      condition:
        !!accountTokenBalancePlusStakeAmount &&
        +stakedAmount > accountTokenBalancePlusStakeAmount,
      message: `You cannot stake more than your available balance of ${accountTokenBalancePlusStakeAmount?.toPrecision() ?? 0} ${tokenSymbol}`,
    },
    { condition: stakeDifferenceBn == 0n, message: "Make a change to apply" },
  ]);

  // useEffect(() => {
  //   if (votingPowerTx.status === "success") {
  //     setNumberInput("");
  //   }
  // }, [votingPowerTx.status]);

  return (
    <section className="section-layout space-y-5">
      <h3>Staking</h3>
      <TransactionModal
        label={`Stake ${tokenSymbol} in ${communityName}`}
        transactions={[allowanceTx, votingPowerTx]}
        isOpen={isOpenModal}
        onClose={() => setIsOpenModal(false)}
      />

      <div className="flex justify-between gap-4 flex-wrap">
        {/* Title + Member staked */}
        {isMember ?
          <div className="flex flex-col justify-between gap-2">
            <div className="flex justify-between">
              <div className="flex-start flex gap-2 items-center">
                <p className="subtitle2">Your stake in the community:</p>
                <InfoWrapper
                  tooltip={`Registration stake: ${parseToken(registrationAmount)} ${tokenGarden.symbol} ${isMember ? `\n Added stake: ${parseToken(AddedStake)} ${tokenGarden.symbol}` : ""}`}
                />
              </div>
            </div>
            <EthAddress
              address={registerToken as Address}
              shortenAddress={true}
              actions="none"
              icon={false}
              label={
                <DisplayNumber
                  number={(initialStakedAmount ?? 0).toString()}
                  tokenSymbol={tokenSymbol}
                  compact={true}
                  valueClassName="text-primary-content font-bold text-3xl mr-1"
                  disableTooltip
                />
              }
            />
          </div>
        : <>
            <p className="subtitle2 text-neutral-soft-content">
              Join community to stake.
            </p>
          </>
        }

        {/* Staking description */}
        <InfoBox
          title="Staking benefits"
          content="Stake more tokens to increase your voting weight in the community’s governance pools"
          infoBoxType="info"
          className="w-full"
        />

        {/* Input */}

        {isMember && (
          <>
            {/* Available to stake*/}
            <div className="flex-1 flex items-baseline justify-between">
              <p className="text-sm">Available</p>
              <DisplayNumber
                number={
                  accountTokenBalancePlusStakeAmount?.toPrecision(4) ?? "0"
                }
                tokenSymbol={tokenSymbol}
                compact={true}
                valueClassName="text-black text-lg"
                symbolClassName="text-sm text-black"
              />
            </div>
            <div className="relative w-full">
              <label className="input input-bordered input-info flex items-center gap-2 w-full">
                <input
                  type="number"
                  value={stakedAmount}
                  placeholder="Amount"
                  className="flex-1 w-full"
                  min={registerStakeAmount}
                  max={accountTokenBalancePlusStakeAmount}
                  onChange={(e) => {
                    const amount = e.target.value;
                    setStakedAmount(amount);
                    if (accountTokenBalancePlusStakeAmount)
                      setAmountPerc(
                        (
                          (+amount / accountTokenBalancePlusStakeAmount) *
                          100
                        ).toString(),
                      );
                  }}
                />
                <span className="">{tokenSymbol}</span>
              </label>
            </div>

            <div
              className={`${minAmountPercentage == 100 ? "tooltip " : ""} w-full`}
              data-tip={
                minAmountPercentage == 100 ?
                  `Insuficant ${tokenSymbol} balance to increase the staked amount`
                : undefined
              }
            >
              <input
                type="range"
                min={minAmountPercentage}
                max={101}
                value={amountPerc}
                disabled={minAmountPercentage === 100}
                title=""
                onChange={(e) => {
                  const percentage = e.target.value;
                  if (accountTokenBalancePlusStakeAmount) {
                    setStakedAmount(
                      +percentage >= 100 ?
                        accountTokenBalancePlusStakeAmount.toPrecision(4)
                      : Math.max(
                          registerStakeAmount, // Minimum stake amount
                          (+percentage * accountTokenBalancePlusStakeAmount) /
                            100,
                        ).toPrecision(4),
                    );
                  }
                  setAmountPerc(percentage);
                }}
                className={`range range-md cursor-pointer bg-neutral-soft [--range-shdw:var(--color-green-500)] ${
                  minAmountPercentage === 100 ?
                    "[--range-shdw:var(--color-grey-400)]"
                  : ""
                }`}
              />
            </div>

            {/* Apply Buttons */}
            <div className="flex-1 flex items-center gap-1 justify-between flex-wrap">
              <Button
                onClick={handleClick}
                disabled={isButtonDisabled}
                tooltip={
                  isButtonDisabled ? tooltipMessage
                  : stakeDifference > 0 ?
                    `Staking ${stakeDifferenceRounded} ${tokenSymbol} more in ${communityName}`
                  : `Unstaking ${+stakeDifferenceRounded * -1} ${tokenSymbol} from ${communityName}`

                }
                forceShowTooltip={true}
                icon={
                  stakeDifference >= 0 ?
                    <ArrowTrendingUpIcon className="h-5 w-5" />
                  : <ArrowTrendingDownIcon className="h-5 w-5" />
                }
                className="w-full"
                isLoading={
                  increasePowerStatus === "loading" ||
                  decreaseStatus === "loading"
                }
              >
                <span className="w-14">
                  {stakeDifference >= 0 ? "Stake" : "Unstake"}
                </span>
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

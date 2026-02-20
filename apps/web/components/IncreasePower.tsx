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
import { parseToken, roundToSignificant } from "@/utils/numbers";
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

  const [hasInteracted, setHasInteracted] = useState(false);
  const roundedStakedAmount = roundToSignificant(+stakedAmount, 4);

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
  const stakeDifferenceRounded = roundToSignificant(stakeDifference, 4, {
    showPrecisionMissIndicator: false,
  });

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
    if (hasInteracted) return;
    setStakedAmount(
      roundToSignificant(initialStakedAmount ?? 0, 4, {
        showPrecisionMissIndicator: false,
      }),
    );
    setAmountPerc(
      (accountTokenBalance?.value == 0n ?
        100
      : (initialStakedAmount / accountTokenBalancePlusStakeAmount) * 100
      ).toString(),
    );
  }, [
    accountTokenBalance?.value,
    accountTokenBalancePlusStakeAmount,
    hasInteracted,
    initialStakedAmount,
  ]);

  useEffect(() => {
    setHasInteracted(false);
  }, [accountAddress, communityAddress, initialStakedAmountBn]);

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
        accountTokenBalancePlusStakeAmount != null &&
        +stakedAmount > accountTokenBalancePlusStakeAmount,
      message: `You cannot stake more than your available balance of ${roundToSignificant(accountTokenBalancePlusStakeAmount ?? 0, 4)} ${tokenSymbol}`,
    },
    { condition: stakeDifferenceBn == 0n, message: "Make a change to apply" },
  ]);

  // useEffect(() => {
  //   if (votingPowerTx.status === "success") {
  //     setNumberInput("");
  //   }
  // }, [votingPowerTx.status]);

  return (
    <section className="section-layout space-y-4">
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
                  valueClassName="font-bold text-3xl mr-1"
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
          content="Stake more tokens to increase your voting power in the community’s governance pools"
          infoBoxType="info"
          className="w-full"
        />

        {/* Input */}

        {isMember && (
          <>
            {/* Available to stake*/}
            <div className="flex-1 flex items-baseline justify-between">
              <p className="text-xs sm:text-sm">Available</p>
              <DisplayNumber
                number={roundToSignificant(
                  accountTokenBalancePlusStakeAmount ?? 0,
                  4,
                )}
                tokenSymbol={tokenSymbol}
                compact={true}
                valueClassName="text-md sm:text-lg"
                symbolClassName="text-xs sm:text-sm"
              />
            </div>
            <div className="relative w-full">
              <label className="input input-bordered input-info flex items-center gap-2 w-full dark:bg-primary-soft-dark">
                <input
                  type="number"
                  value={stakedAmount}
                  placeholder="Amount"
                  className="flex-1 w-full dark:bg-primary-soft-dark"
                  min={registerStakeAmount}
                  max={accountTokenBalancePlusStakeAmount}
                  onChange={(e) => {
                    const amount = e.target.value;
                    setHasInteracted(true);
                    setStakedAmount(amount);
                    if (accountTokenBalancePlusStakeAmount != null)
                      setAmountPerc(
                        (
                          (+amount / accountTokenBalancePlusStakeAmount) *
                          100
                        ).toString(),
                      );
                  }}
                />
                <span className="text-sm sm:text-md">{tokenSymbol}</span>
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
                  setHasInteracted(true);
                  if (
                    accountTokenBalancePlusStakeAmount != null &&
                    accountTokenBalancePlusStakeAmount > 0
                  ) {
                    const stake = Math.max(
                      registerStakeAmount, // Minimum stake amount
                      (+percentage * accountTokenBalancePlusStakeAmount) / 100,
                    );

                    setStakedAmount(
                      +percentage >= 100 ?
                        accountTokenBalancePlusStakeAmount.toString()
                      : roundToSignificant(stake, 4, {
                          showPrecisionMissIndicator: false,
                        }),
                    );
                  }
                  setAmountPerc(+percentage >= 100 ? "101" : percentage);
                }}
                className={`range range-md cursor-pointer bg-neutral-soft [--range-bg:var(--color-grey-200)] dark:[--range-bg:#373737] dark:bg-[#373737] [--range-shdw:var(--color-green-500)] dark:[--range-shdw:#4E9F80] [--range-thumb-size:20px] dark:[&::-webkit-slider-thumb]:bg-[#232323] dark:[&::-moz-range-thumb]:bg-[#232323] dark:[&::-webkit-slider-thumb]:border-0 dark:[&::-moz-range-thumb]:border-0 ${
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
                className="!w-full"
                isLoading={
                  increasePowerStatus === "loading" ||
                  decreaseStatus === "loading"
                }
              >
                {stakeDifference >= 0 ? "Stake" : "Unstake"}
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

"use client";

import { useEffect, useState } from "react";
import { Dnum } from "dnum";
import { parseUnits } from "viem";
import { Address, useAccount, useBalance } from "wagmi";
import {
  isMemberQuery,
  RegistryCommunity,
  TokenGarden,
} from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { DisplayNumber } from "./DisplayNumber";
import { InfoBox } from "./InfoBox";
import { InfoWrapper } from "./InfoWrapper";
import { TransactionModal, TransactionProps } from "./TransactionModal";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { useHandleAllowance } from "@/hooks/useHandleAllowance";
import { registryCommunityABI } from "@/src/generated";
import { abiWithErrors2 } from "@/utils/abiWithErrors";
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
    registerStakeAmount,
    id: communityAddress,
  } = registryCommunity;

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [amount, setAmount] = useState<string>("0");
  const { address: accountAddress } = useAccount();

  const stakedTokens = memberData?.member?.memberCommunity?.[0]?.stakedTokens;
  const isMember = memberData?.member?.memberCommunity?.[0]?.isRegistered;

  const memberStakedTokens = BigInt(
    typeof stakedTokens === "string" ? stakedTokens : "0",
  );
  const registerStakeAmountBigInt = BigInt(
    typeof registerStakeAmount === "string" ? registerStakeAmount : "0",
  );

  const urlChainId = useChainIdFromPath();
  const requestedAmount = parseUnits(amount, tokenDecimals);

  const { data: accountTokenBalance } = useBalance({
    address: accountAddress,
    token: registerToken as Address,
    chainId: urlChainId ?? 0,
  });

  const registryContractCallConfig = {
    address: communityAddress as Address,
    abi: abiWithErrors2(registryCommunityABI),
    contractName: "Registry Community",
  };

  const { publish } = usePubSubContext();

  const [votingPowerTx, setVotingPowerTx] = useState<TransactionProps>({
    contractName: "Increase voting power",
    message: "",
    status: "idle",
  });

  const {
    write: writeIncreasePower,
    transactionStatus: increasePowerStatus,
    error: increasePowerError,
  } = useContractWriteWithConfirmations({
    ...registryContractCallConfig,
    functionName: "increasePower",
    args: [parseUnits(amount, tokenDecimals)],
    showNotification: false,
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

  const { write: writeDecreasePower } = useContractWriteWithConfirmations({
    ...registryContractCallConfig,
    functionName: "decreasePower",
    args: [requestedAmount],
    fallbackErrorMessage: "Error decreasing power. Please try again.",
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
    setVotingPowerTx((prev) => ({
      ...prev,
      message: getTxMessage("idle"),
      status: "idle",
    }));
    setIsOpenModal(true);
    handleAllowance();
  }

  const isInputIncreaseGreaterThanBalance =
    Number(amount) > Number(accountTokenBalance?.formatted);

  const disablePowerBtnCondition: ConditionObject[] = [
    {
      condition: !isMember,
      message: "Join community to increase voting power",
    },
    {
      condition: Number(amount) <= 0 || amount === undefined,
      message: "Input can not be zero or negative",
    },
  ];

  const disableIncPowerBtnCondition: ConditionObject[] = [
    ...disablePowerBtnCondition,
    {
      condition: isInputIncreaseGreaterThanBalance,
      message: `Not enough ${tokenSymbol} balance to stake`,
    },
  ];

  const disableDecPowerBtnCondition: ConditionObject[] = [
    ...disablePowerBtnCondition,
    {
      condition:
        parseUnits(amount.toString(), tokenDecimals) >
        memberStakedTokens - registerStakeAmountBigInt,
      message: "You can only decrease your added stake.",
    },
  ];

  const disabledDecPowerButton = disableDecPowerBtnCondition.some(
    (cond) => cond.condition,
  );

  const disabledIncPowerButton = disableIncPowerBtnCondition.some(
    (cond) => cond.condition,
  );

  const { tooltipMessage } = useDisableButtons(disableIncPowerBtnCondition);
  const { tooltipMessage: decreaseTooltipMsg } = useDisableButtons(
    disableDecPowerBtnCondition,
  );

  const { allowanceTxProps: allowanceTx, handleAllowance } = useHandleAllowance(
    accountAddress,
    registerToken as Address,
    tokenSymbol,
    communityAddress as Address,
    parseUnits(amount, tokenDecimals),
    writeIncreasePower,
  );

  // useEffect(() => {
  //   if (votingPowerTx.status === "success") {
  //     setNumberInput("");
  //   }
  // }, [votingPowerTx.status]);

  if (!isMember) return null;

  const AddedStake = [
    BigInt(memberStakedTokens - registerStakeAmountBigInt),
    tokenDecimals,
  ] as Dnum;

  return (
    <section className="section-layout space-y-5">
      <h2>Your stake</h2>
      <TransactionModal
        label={`Stake ${tokenSymbol} in ${communityName}`}
        transactions={[allowanceTx, votingPowerTx]}
        isOpen={isOpenModal}
        onClose={() => setIsOpenModal(false)}
      >
        <div className="flex gap-2">
          <p>Adding:</p>
          <DisplayNumber number={amount} tokenSymbol={tokenSymbol} />
        </div>
      </TransactionModal>

      <div className="flex justify-between gap-4">
        <div className="flex flex-col justify-between gap-2">
          <div className="flex justify-between">
            <div className="flex-start flex gap-2">
              <p className="subtitle2">Total Staked in the community:</p>
              <InfoWrapper
                tooltip={`Registration stake: ${parseToken(registrationAmount)} ${tokenGarden.symbol}\n Added stake: ${parseToken(AddedStake)} ${tokenGarden.symbol}`}
              >
                <DisplayNumber
                  number={[memberStakedTokens, tokenDecimals]}
                  tokenSymbol={tokenSymbol}
                  compact={true}
                  className="subtitle2 text-primary-content"
                  disableTooltip
                />
              </InfoWrapper>
            </div>
          </div>
          <InfoBox
            content="staking more tokens in the community can increase your voting power in pools to support proposals."
            infoBoxType="info"
            classNames="max-w-xl"
          />
        </div>
        <div className="flex flex-col gap-4">
          <div className="relative">
            <input
              type="number"
              value={amount}
              placeholder="Amount"
              className="input input-bordered input-info w-full"
              onChange={(e) => setAmount(e.target.value)}
            />
            <span className="absolute right-8 top-3.5 text-black">
              {tokenSymbol}
            </span>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleClick}
              disabled={disabledIncPowerButton}
              tooltip={tooltipMessage}
            >
              Increase stake
              <span className="loading-spinner" />
            </Button>

            <Button
              onClick={() => writeDecreasePower?.()}
              btnStyle="outline"
              color="danger"
              disabled={disabledDecPowerButton}
              tooltip={decreaseTooltipMsg}
            >
              Decrease stake
              <span className="loading-spinner" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

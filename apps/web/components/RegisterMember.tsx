"use client";

import React, { useMemo, useEffect, useState, useCallback } from "react";
import { Address, useAccount, useBalance } from "wagmi";
import {
  RegistryCommunity,
  TokenGarden,
  isMemberQuery,
} from "#/subgraph/.graphclient";
import { BtnStyle, Button, Color } from "./Button";
import { TransactionModal, TransactionProps } from "./TransactionModal";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { useHandleAllowance } from "@/hooks/useHandleAllowance";
import { registryCommunityABI } from "@/src/generated";
import { abiWithErrors2 } from "@/utils/abiWithErrors";
import { useErrorDetails } from "@/utils/getErrorName";
import { gte } from "@/utils/numbers";
import { getTxMessage } from "@/utils/transactionMessages";

type RegisterMemberProps = {
  registrationCost: bigint;
  token: Pick<TokenGarden, "symbol" | "id" | "decimals">;
  registryCommunity: Pick<RegistryCommunity, "communityName" | "id">;
  memberData: isMemberQuery | undefined;
};

export function RegisterMember({
  registrationCost,
  token,
  registryCommunity,
  memberData,
}: RegisterMemberProps) {
  const { id: communityAddress, communityName } = registryCommunity;
  const { address: accountAddress } = useAccount();
  const urlChainId = useChainIdFromPath();
  const [isOpenModal, setIsOpenModal] = useState(false);
  const { publish } = usePubSubContext();

  const isMember = useMemo(
    () => memberData?.member?.memberCommunity?.[0]?.isRegistered ?? false,
    [memberData],
  );

  const registryContractCallConfig = useMemo(
    () => ({
      address: communityAddress as Address,
      abi: abiWithErrors2(registryCommunityABI),
      contractName: "Registry Community",
    }),
    [communityAddress],
  );

  const { data: accountTokenBalance } = useBalance({
    address: accountAddress,
    token: token.id as Address,
    chainId: urlChainId,
  });

  const accountHasBalance = useMemo(
    () => gte(accountTokenBalance?.value, registrationCost, token.decimals),
    [accountTokenBalance?.value, registrationCost, token.decimals],
  );

  const { write: writeUnregisterMember, error: unregisterMemberError } =
    useContractWriteWithConfirmations({
      ...registryContractCallConfig,
      functionName: "unregisterMember",
      fallbackErrorMessage: "Error unregistering member. Please try again.",
      onConfirmations: useCallback(() => {
        publish({
          topic: "member",
          type: "delete",
          containerId: communityAddress,
          function: "unregisterMember",
          id: communityAddress,
          chainId: urlChainId,
        });
      }, [publish, communityAddress, urlChainId]),
    });

  useErrorDetails(unregisterMemberError, "unregisterMember");

  const disableRegMemberBtnCondition = useMemo<ConditionObject[]>(
    () => [
      {
        condition: !isMember && !accountHasBalance,
        message: "Connected account has insufficient balance",
      },
    ],
    [isMember, accountHasBalance],
  );

  const { tooltipMessage, missmatchUrl } = useDisableButtons(
    disableRegMemberBtnCondition,
  );

  const {
    write: writeRegisterMember,
    transactionStatus: registerMemberTxStatus,
    error: registerMemberTxError,
  } = useContractWriteWithConfirmations({
    ...registryContractCallConfig,
    functionName: "stakeAndRegisterMember",
    showNotification: false,
    onConfirmations: useCallback(() => {
      publish({
        topic: "member",
        type: "add",
        containerId: communityAddress,
        function: "stakeAndRegisterMember",
        id: communityAddress,
        chainId: urlChainId,
      });
    }, [publish, communityAddress, urlChainId]),
  });

  const { allowanceTxProps: allowanceTx, handleAllowance } = useHandleAllowance(
    accountAddress,
    token.id as Address,
    token.symbol,
    communityAddress as Address,
    registrationCost,
    writeRegisterMember,
  );

  const [registrationTx, setRegistrationTx] = useState<TransactionProps>(
    () => ({
      contractName: `Register in ${communityName}`,
      message: getTxMessage("idle"),
      status: "idle",
    }),
  );

  useEffect(() => {
    setRegistrationTx((prev) => ({
      ...prev,
      message: getTxMessage(registerMemberTxStatus, registerMemberTxError),
      status: registerMemberTxStatus ?? "idle",
    }));
  }, [registerMemberTxStatus, communityName]);

  const handleClick = useCallback(() => {
    if (isMember) {
      writeUnregisterMember();
    } else {
      setIsOpenModal(true);
      setRegistrationTx((prev) => ({
        ...prev,
        message: getTxMessage("idle"),
        status: "idle",
      }));
      handleAllowance();
    }
  }, [isMember, writeUnregisterMember, handleAllowance]);

  const buttonProps: {
    onClick: () => void;
    btnStyle: BtnStyle;
    color: Color;
    disabled: boolean;
    tooltip: string;
  } = useMemo(
    () => ({
      onClick: handleClick,
      btnStyle: isMember ? "outline" : "filled",
      color: isMember ? "danger" : "primary",
      disabled:
        missmatchUrl ||
        disableRegMemberBtnCondition.some((cond) => cond.condition),
      tooltip: tooltipMessage,
    }),
    [
      isMember,
      handleClick,
      missmatchUrl,
      disableRegMemberBtnCondition,
      tooltipMessage,
    ],
  );

  return (
    <>
      <TransactionModal
        label={`Register in ${communityName}`}
        transactions={[allowanceTx, registrationTx]}
        onClose={() => setIsOpenModal(false)}
        isOpen={isOpenModal}
      />
      <div className="flex gap-4">
        <div className="flex items-center justify-center">
          <Button {...buttonProps}>
            {isMember ? "Leave community" : "Register in community"}
          </Button>
        </div>
      </div>
    </>
  );
}

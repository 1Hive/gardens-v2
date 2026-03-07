"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Address, useAccount, useBalance } from "wagmi";
import {
  RegistryCommunity,
  TokenGarden,
  isMemberQuery,
} from "#/subgraph/.graphclient";
import { BtnStyle, Button, Color } from "./Button";
import { TransactionModal } from "./TransactionModal";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useCovenantAgreementSignature } from "@/hooks/useCovenantAgreementSignature";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { useHandleAllowance } from "@/hooks/useHandleAllowance";
import { useHandleRegistration } from "@/hooks/useHandleRegistration";
import { registryCommunityABI } from "@/src/generated";
import { useErrorDetails } from "@/utils/getErrorName";
import { gte } from "@/utils/numbers";

type RegisterMemberProps = {
  registrationCost: bigint;
  token: Pick<TokenGarden, "symbol" | "address" | "decimals">;
  registryCommunity: Pick<
    RegistryCommunity,
    "communityName" | "id" | "covenantIpfsHash"
  >;
  memberData: isMemberQuery | undefined;
};

export function RegisterMember({
  registrationCost,
  token,
  registryCommunity,
  memberData,
}: RegisterMemberProps) {
  const {
    id: communityAddress,
    communityName,
    covenantIpfsHash,
  } = registryCommunity;
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
      abi: registryCommunityABI,
      contractName: "Registry Community",
    }),
    [communityAddress],
  );

  const { data: accountTokenBalance } = useBalance({
    address: accountAddress,
    token: token.address as Address,
    chainId: urlChainId,
    watch: true,
  });

  const accountHasBalance = useMemo(
    () => gte(accountTokenBalance?.value, registrationCost, token.decimals),
    [accountTokenBalance?.value, registrationCost, token.decimals],
  );

  const {
    write: writeUnregisterMember,
    error: unregisterMemberError,
    isLoading: isUnregistering,
  } = useContractWriteWithConfirmations({
    ...registryContractCallConfig,
    functionName: "unregisterMember",
    fallbackErrorMessage: "Error unregistering member, please report a bug.",
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
        message: "Insufficient balance",
      },
    ],
    [isMember, accountHasBalance],
  );

  const { tooltipMessage, missmatchUrl } = useDisableButtons(
    disableRegMemberBtnCondition,
  );

  const {
    registrationTxProps: registrationTx,
    handleRegistration,
    resetState: handleRegistrationResetState,
  } = useHandleRegistration(
    communityAddress as Address,
    communityName ?? "",
    urlChainId,
  );

  const {
    allowanceTxProps: allowanceTx,
    handleAllowance,
    resetState: handleAllowanceResetState,
  } = useHandleAllowance(
    accountAddress,
    token,
    communityAddress as Address,
    registrationCost,
    handleRegistration,
  );

  const message = `You agree with the terms and conditions of ${communityName} covenant: 
    https://ipfs.io/ipfs/${covenantIpfsHash}`;

  const { covenantAgreementTxProps: covenantAgreementTx, handleSignature } =
    useCovenantAgreementSignature(message, handleAllowance);

  const handleClick = useCallback(() => {
    if (isMember) {
      writeUnregisterMember();
    } else {
      handleAllowanceResetState();
      handleRegistrationResetState();
      setIsOpenModal(true);
      if (covenantAgreementTx.status !== "loading") {
        handleSignature();
      }
    }
  }, [
    isMember,
    writeUnregisterMember,
    handleAllowanceResetState,
    handleRegistrationResetState,
    handleSignature,
  ]);

  const buttonProps: {
    onClick: () => void;
    btnStyle: BtnStyle;
    color: Color;
    disabled: boolean;
    tooltip: string | undefined;
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
      accountHasBalance,
    ],
  );

  // TODO: check token prop

  return (
    <>
      <TransactionModal
        label={`Register in ${communityName}`}
        transactions={[covenantAgreementTx, allowanceTx, registrationTx]}
        onClose={() => setIsOpenModal(false)}
        isOpen={isOpenModal}
        testId="register"
      />

      <Button
        {...buttonProps}
        isLoading={isUnregistering}
        className="!w-full sm:!w-auto"
        testId="register-member-button"
      >
        {isMember ? "Leave" : "Join"}
      </Button>
    </>
  );
}

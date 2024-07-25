"use client";

import React, { useCallback, useMemo, useEffect } from "react";
import { Address, useAccount, useBalance } from "wagmi";
import { RegistryCommunity, TokenGarden, isMemberQuery } from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { TransactionModal, TransactionProps } from "./TransactionModal";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import useModal from "@/hooks/useModal";
import { erc20ABI, registryCommunityABI } from "@/src/generated";
import { abiWithErrors, abiWithErrors2 } from "@/utils/abiWithErrors";
import { useErrorDetails } from "@/utils/getErrorName";
import { gte } from "@/utils/numbers";

type RegisterMemberProps = {
  allowance: bigint | undefined;
  registrationCost: bigint;
  token: Pick<TokenGarden, "symbol" | "id" | "decimals">;
  registryCommunity: Pick<RegistryCommunity, "communityName" | "id" | "covenantIpfsHash" | "communityFee" | "protocolFee" | "registerStakeAmount" | "registerToken">;
  memberData: isMemberQuery | undefined;
};

export function RegisterMember({
  allowance,
  registrationCost,
  token,
  registryCommunity,
  memberData,
}: RegisterMemberProps) {
  const { id: communityAddress, communityName } = registryCommunity;
  const { symbol: tokenSymbol, decimals: tokenDecimals, id: registerToken } = token;

  const { address: accountAddress } = useAccount();

  const urlChainId = useChainIdFromPath();
  const { openModal, closeModal, ref } = useModal();

  const { publish } = usePubSubContext();

  // //
  // //new logic
  // const [pendingAllowance, setPendingAllowance] = useState<boolean | undefined>(
  //   false,
  // );

  const isMember = memberData?.member?.memberCommunity?.[0]?.isRegistered ?? false;

  const registryContractCallConfig = useMemo(() => ({
    address: communityAddress as Address,
    abi: abiWithErrors2(registryCommunityABI),
    contractName: "Registry Community",
  }), [communityAddress]);

  // const { data: isMember } = useContractRead({
  //   ...registryContractCallConfig,
  //   functionName: "isMember",
  //   enabled: accountAddress !== undefined,
  //   args: [accountAddress as Address],
  //   watch: true,
  //   chainId: urlChainId,
  // });

  // const { data: registerStakeAmount } = useContractRead({
  //   ...registryContractCallConfig,
  //   functionName: "getStakeAmountWithFees",
  //   chainId: urlChainId,
  // });

  const { data: accountTokenBalance } = useBalance({
    address: accountAddress,
    token: registerToken as Address,
    chainId: urlChainId,
  });

  const accountHasBalance = gte(
    accountTokenBalance?.value,
    registrationCost,
    tokenDecimals,
  );

  const {
    write: writeRegisterMember,
    error: registerMemberError,
    status: registerMemberStatus,
  } = useContractWriteWithConfirmations({
    ...registryContractCallConfig,
    functionName: "stakeAndRegisterMember",
    showNotification: false,
    onConfirmations: () => {
      publish({
        topic: "member",
        type: "add",
        containerId: communityAddress,
        function: "stakeAndRegisterMember",
        id: communityAddress,
        urlChainId: urlChainId,
      });
    },
  });

  const {
    write: writeUnregisterMember,
    error: unregisterMemberError,
  } = useContractWriteWithConfirmations({
    ...registryContractCallConfig,
    functionName: "unregisterMember",
    fallbackErrorMessage: "Error unregistering member. Please try again.",
    onConfirmations: () => {
      publish({
        topic: "member",
        type: "delete",
        containerId: communityAddress,
        function: "unregisterMember",
        id: communityAddress,
        urlChainId: urlChainId,
      });
    },
  });

  const {
    write: writeAllowToken,
    error: allowTokenError,
    confirmed: allowTokenConfirmed,
    confirmationsStatus: allowTokenStatus,
  } = useContractWriteWithConfirmations({
    address: registerToken as Address,
    abi: abiWithErrors(erc20ABI),
    args: [communityAddress, registrationCost], // [allowed spender address, amount ]
    functionName: "approve",
    contractName: "ERC20",
    showNotification: false,
    onConfirmations: () => {
      writeRegisterMember();
    },
  });

  // const { data: dataAllowance } = useContractRead({
  //   address: registerToken,
  //   abi: abiWithErrors2<typeof erc20ABI>(erc20ABI),
  //   args: [accountAddress as Address, communityAddress], // [ owner,  spender address ]
  //   functionName: "allowance",
  //   watch: true,
  //   enabled: !!accountAddress,
  // });

  console.log({ memberData });
  // Error handling
  useErrorDetails(registerMemberError, "stakeAndRegisterMember");
  useErrorDetails(unregisterMemberError, "unregisterMember");
  // useErrorDetails(errorMemberRegistered, "isMember");
  useErrorDetails(allowTokenError, "approve");
  // useErrorDetails(errorGardenToken, "gardenToken");

  // Event handlers
  const handleClick = useCallback(async () => {
    if (isMember) {
      writeUnregisterMember();
    } else {
      if (allowance !== 0n) {
        writeRegisterMember();
        openModal();
        // setPendingAllowance(true);
      } else {
        writeAllowToken();
        openModal();
      }
    }
  }, [isMember, allowance, writeUnregisterMember, writeRegisterMember, writeAllowToken, openModal]);

  useEffect(() => {
    if (registerMemberStatus === "success") {
      closeModal();
      // setPendingAllowance(false);
    }
  }, [registerMemberStatus]);

  //RegisterMember Disable Button condition => message mapping
  const disableRegMemberBtnCondition: ConditionObject[] = [
    {
      condition: !isMember && !accountHasBalance,
      message: "Connected account has insufficient balance",
    },
  ];

  const disabledRegMemberButton = disableRegMemberBtnCondition.some(
    (cond) => cond.condition,
  );
  const { tooltipMessage, missmatchUrl } = useDisableButtons(
    disableRegMemberBtnCondition,
  );

  const InitialTransactionSteps = [
    {
      transaction: "Approve token expenditure",
      message: "waiting for signature",
      current: true,
      dataContent: "1",
      loading: false,
      stepClassName: "idle",
      messageClassName: "",
    },
    {
      transaction: "Register",
      message: "waiting for approval",
      dataContent: "2",
      current: false,
      stepClassName: "idle",
      messageClassName: "",
    },
  ];

  const transactions: TransactionProps[] = [{
    message: "Test...",
    status: "idle",
    contractName: "Contract Test",
  }, {
    message: "Test 2...",
    status: "idle",
    contractName: "Contract Test 2",
  }];

  return (
    <>
      <TransactionModal
        ref={ref}
        label={`Register in ${communityName}`}
        // allowTokenStatus={allowTokenStatus}
        // stepTwoStatus={registerMemberStatus}
        // initialTransactionSteps={InitialTransactionSteps}
        // token={token.symbol}
        transactions={transactions}
        // pendingAllowance={pendingAllowance}
        // setPendingAllowance={setPendingAllowance}
        closeModal={closeModal}
      />
      <div className="flex gap-4">
        <div className="flex items-center justify-center">
          <Button
            onClick={handleClick}
            btnStyle={isMember ? "outline" : "filled"}
            color={isMember ? "danger" : "primary"}
            disabled={missmatchUrl || disabledRegMemberButton}
            tooltip={tooltipMessage}
          >
            {isMember ? "Leave community" : "Register in community"}
          </Button>
        </div>
      </div>
    </>
  );
}

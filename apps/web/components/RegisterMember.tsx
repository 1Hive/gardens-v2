"use client";
import React, { forwardRef, useEffect, useRef, useState } from "react";
import {
  useBalance,
  useContractWrite,
  useContractRead,
  Address,
  useWaitForTransaction,
  useAccount,
} from "wagmi";
import { Button } from "./Button";
import { toast } from "react-toastify";
import useErrorDetails from "@/utils/getErrorName";
import { erc20ABI, registryCommunityABI } from "@/src/generated";
import { abiWithErrors, abiWithErrors2 } from "@/utils/abiWithErrors";
import { useTransactionNotification } from "@/hooks/useTransactionNotification";
import { calculateFees, formatTokenAmount, gte, dn } from "@/utils/numbers";
import { getChainIdFromPath } from "@/utils/path";
import { TransactionModal, TransactionStep } from "./TransactionModal";
import { useDisableButtons, ConditionObject } from "@/hooks/useDisableButtons";
import { formatUnits, parseUnits } from "viem";
import { DisplayNumber } from "./DisplayNumber";

type RegisterMemberProps = {
  name: string;
  tokenSymbol: string;
  communityAddress: Address;
  registerToken: Address;
  registerTokenDecimals: number;
  membershipAmount: string;
  protocolFee: string;
  communityFee: string;
  connectedAccount: Address;
};

export function RegisterMember({
  name: communityName,
  tokenSymbol,
  communityAddress,
  registerToken,
  registerTokenDecimals,
  membershipAmount,
  protocolFee,
  communityFee,
  connectedAccount,
}: RegisterMemberProps) {
  const chainId = getChainIdFromPath();
  //modal ref
  const modalRef = useRef<HTMLDialogElement | null>(null);
  const openModal = () => modalRef.current?.showModal();
  const closeModal = () => modalRef.current?.close();
  //
  //new logic
  const [pendingAllowance, setPendingAllowance] = useState<boolean | undefined>(
    false,
  );

  const parsedCommunityFee = () => {
    // if (communityFee == "0") return "0";
    try {
      const membership = [
        BigInt(membershipAmount),
        Number(registerTokenDecimals),
      ] as dn.Dnum;
      const feePercentage = [
        BigInt(communityFee),
        Number(registerTokenDecimals),
      ] as dn.Dnum;

      const result = dn.multiply(membership, feePercentage);
      return dn.format(result);
    } catch (error) {
      console.log(error);
    }
  };

  const registryContractCallConfig = {
    address: communityAddress,
    abi: abiWithErrors2(registryCommunityABI),
  };

  const {
    data: isMember,
    error,
    isSuccess,
  } = useContractRead({
    ...registryContractCallConfig,
    functionName: "isMember",
    args: [connectedAccount],
    watch: true,
  });

  const { data: registerStakeAmount, error: stakeAmountError } =
    useContractRead({
      ...registryContractCallConfig,
      functionName: "getStakeAmountWithFees",
    });

  const { data: accountTokenBalance } = useBalance({
    address: connectedAccount,
    token: registerToken as `0x${string}` | undefined,
    chainId: chainId || 0,
  });

  const accountHasBalance = gte(
    accountTokenBalance?.value,
    registerStakeAmount as bigint,
    registerTokenDecimals,
  );

  const {
    data: registerMemberData,
    write: writeRegisterMember,
    isLoading: registerMemberIsLoading,
    error: registerMemberError,
    status: registerMemberStatus,
  } = useContractWrite({
    ...registryContractCallConfig,
    functionName: "stakeAndRegisterMember",
  });

  const {
    data: unregisterMemberData,
    write: writeUnregisterMember,
    error: unregisterMemberError,
    status: unregisterMemberStatus,
  } = useContractWrite({
    ...registryContractCallConfig,
    functionName: "unregisterMember",
  });

  const {
    data: allowTokenData,
    write: writeAllowToken,
    error: allowTokenError,
    status: allowTokenStatus,
  } = useContractWrite({
    address: registerToken,
    abi: abiWithErrors(erc20ABI),
    args: [communityAddress, registerStakeAmount as bigint], // [allowed spender address, amount ]
    functionName: "approve",
  });

  const {
    data,
    isError,
    isLoading,
    isSuccess: isWaitSuccess,
    status: waitAllowTokenStatus,
  } = useWaitForTransaction({
    confirmations: 1,
    hash: allowTokenData?.hash,
  });

  const { data: dataAllowance } = useContractRead({
    address: registerToken,
    abi: abiWithErrors2<typeof erc20ABI>(erc20ABI),
    args: [connectedAccount, communityAddress], // [ owner,  spender address ]
    functionName: "allowance",
    watch: true,
  });

  useErrorDetails(registerMemberError, "stakeAndRegisterMember");
  useErrorDetails(unregisterMemberError, "unregisterMember");
  // useErrorDetails(errorMemberRegistered, "isMember");
  useErrorDetails(allowTokenError, "approve");
  // useErrorDetails(errorGardenToken, "gardenToken");

  async function handleChange() {
    if (isMember) {
      writeUnregisterMember();
    } else {
      if (dataAllowance !== 0n) {
        writeRegisterMember();
        openModal();
        setPendingAllowance(true);
      } else {
        writeAllowToken();
        openModal();
      }
    }
  }

  const { updateTransactionStatus: updateAllowTokenTransactionStatus } =
    useTransactionNotification(allowTokenData);

  const { updateTransactionStatus: updateRegisterMemberTransactionStatus } =
    useTransactionNotification(registerMemberData);

  const { updateTransactionStatus: updateUnregisterMemberTransactionStatus } =
    useTransactionNotification(unregisterMemberData);

  const approveToken = allowTokenStatus === "success";

  useEffect(() => {
    updateAllowTokenTransactionStatus(allowTokenStatus);
    if (waitAllowTokenStatus === "success") {
      writeRegisterMember();
    }
  }, [waitAllowTokenStatus]);

  useEffect(() => {
    updateRegisterMemberTransactionStatus(registerMemberStatus);
    if (registerMemberStatus === "success") {
      closeModal();
      setPendingAllowance(false);
    }
  }, [registerMemberStatus]);

  useEffect(() => {
    updateUnregisterMemberTransactionStatus(unregisterMemberStatus);
  }, [unregisterMemberStatus]);

  //RegisterMember Disable Button condition => message mapping
  const disableRegMemberBtnCondition: ConditionObject[] = [
    {
      condition: !accountHasBalance,
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

  const formatBigint = (number: bigint, decimals: number) => {
    const num = [number, decimals] as dn.Dnum;

    return dn.format(num);
  };

  return (
    <>
      <TransactionModal
        ref={modalRef}
        label="Register in community"
        allowTokenStatus={allowTokenStatus}
        stepTwoStatus={registerMemberStatus}
        initialTransactionSteps={InitialTransactionSteps}
        token={tokenSymbol}
        pendingAllowance={pendingAllowance}
        setPendingAllowance={setPendingAllowance}
      />
      <div className="space-y-4">
        <div className="stats flex">
          <div
            className="stat flex-1 items-center bg-info px-4 py-3 text-sm font-bold text-white"
            role="alert"
          >
            <div className="flex items-center gap-2">
              <svg
                className="mr-2 h-4 w-4 fill-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M12.432 0c1.34 0 2.01.912 2.01 1.957 0 1.305-1.164 2.512-2.679 2.512-1.269 0-2.009-.75-1.974-1.99C9.789 1.436 10.67 0 12.432 0zM8.309 20c-1.058 0-1.833-.652-1.093-3.524l1.214-5.092c.211-.814.246-1.141 0-1.141-.317 0-1.689.562-2.502 1.117l-.528-.88c2.572-2.186 5.531-3.467 6.801-3.467 1.057 0 1.233 1.273.705 3.23l-1.391 5.352c-.246.945-.141 1.271.106 1.271.317 0 1.357-.392 2.379-1.207l.6.814C12.098 19.02 9.365 20 8.309 20z" />
              </svg>
              <div>
                <div className="flex-start flex">
                  <p> Registration amount:</p>
                  <DisplayNumber
                    number={formatBigint(
                      BigInt(membershipAmount),
                      registerTokenDecimals,
                    )}
                    tokenSymbol={tokenSymbol}
                  />
                </div>
                <div className="flex-start flex">
                  <p>Community fee:</p>
                  <DisplayNumber
                    number={parsedCommunityFee()}
                    tokenSymbol={tokenSymbol}
                  />
                </div>
                {/* 
                <p>
                  Community fee: {parseString(parsedCommunityFee())}{" "}
                  {tokenSymbol}
                </p> */}
                {/* <p>
                  Protocol fee:{" "}
                  {calculateFees(
                    membershipAmount,
                    protocolFee,
                    registerTokenDecimals,
                  )}{" "}
                  {tokenSymbol}
                </p> */}
              </div>
            </div>
          </div>
          <div className="stat flex-1 items-center gap-2">
            <Button
              onClick={handleChange}
              className="w-full bg-primary"
              size="md"
              disabled={missmatchUrl || disabledRegMemberButton}
              tooltip={tooltipMessage}
            >
              {isMember ? "Leave community" : "Register in community"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

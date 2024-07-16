"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { parseUnits } from "viem";
import { Address, useAccount, useBalance, useContractRead } from "wagmi";
import { isMemberDocument, isMemberQuery } from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { DisplayNumber } from "./DisplayNumber";
import { TransactionModal, TransactionStep } from "./TransactionModal";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { useUrqlClient } from "@/hooks/useUqrlClient";
import { queryByChain } from "@/providers/urql";
import { erc20ABI, registryCommunityABI } from "@/src/generated";
import { abiWithErrors, abiWithErrors2 } from "@/utils/abiWithErrors";
import { useErrorDetails } from "@/utils/getErrorName";
import { formatTokenAmount } from "@/utils/numbers";

type IncreasePowerProps = {
  communityAddress: Address;
  registerToken: Address;
  tokenSymbol: string;
  registerTokenDecimals: number;
  registerStakeAmount: bigint;
};

const InitialTransactionSteps: TransactionStep[] = [
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
    transaction: "Stake",
    message: "waiting for approval",
    dataContent: "2",
    current: false,
    stepClassName: "idle",
    messageClassName: "",
  },
];

export const IncreasePower = ({
  communityAddress,
  registerToken,
  tokenSymbol,
  registerTokenDecimals,
  registerStakeAmount,
}: IncreasePowerProps) => {
  const modalRef = useRef<HTMLDialogElement | null>(null);
  const openModal = () => modalRef.current?.showModal();
  const closeModal = () => modalRef.current?.close();
  const [pendingAllowance, setPendingAllowance] = useState<boolean | undefined>(
    false,
  );
  const [increaseInput, setIncreaseInput] = useState<number | string>("");

  const { publish } = usePubSubContext();
  const { address: connectedAccount } = useAccount();

  //handeling states
  const { address: accountAddress } = useAccount();
  const [memberStakedTokens, setMemberStakedTokens] = useState<bigint>(0n);

  const urqlClient = useUrqlClient();

  const urlChainId = useChainIdFromPath();

  const runIsMemberQuery = useCallback(async () => {
    if (!accountAddress || !urlChainId) {
      return;
    }
    const { data: result } = await queryByChain<isMemberQuery>(
      urqlClient,
      urlChainId,
      isMemberDocument,
      {
        me: accountAddress.toLowerCase(),
        comm: communityAddress.toLowerCase(),
      },
    );

    if (result && result.members.length > 0) {
      const stakedTokens =
        result.members?.[0]?.memberCommunity?.[0]?.stakedTokens;

      setMemberStakedTokens(BigInt(typeof stakedTokens === "string" ? stakedTokens : "0"));
    }
  }, [accountAddress]);

  useEffect(() => {
    runIsMemberQuery();
  }, [accountAddress]);

  const requestedAmount = parseUnits(
    (increaseInput ?? 0).toString(),
    registerTokenDecimals,
  );

  const { data: accountTokenBalance } = useBalance({
    address: accountAddress,
    token: registerToken as Address,
    chainId: urlChainId ?? 0,
  });

  //TODO: create a hook for this
  const registryContractCallConfig = {
    address: communityAddress,
    abi: abiWithErrors2(registryCommunityABI),
    contractName: "RegistryCommunity",
  };

  const { data: isMember } = useContractRead({
    ...registryContractCallConfig,
    functionName: "isMember",
    enabled: accountAddress !== undefined,
    args: [accountAddress as Address],
  });

  const {
    isSuccess: isWaitSuccess,
    write: writeAllowToken,
    status: allowanceTokenStatus,
  } = useContractWriteWithConfirmations({
    address: registerToken,
    abi: abiWithErrors(erc20ABI),
    args: [communityAddress, requestedAmount], // [allowed spender address, amount ]
    functionName: "approve",
    contractName: "ERC20",
  });

  const { write: writeResetAllowance, status: resetAllowanceStatus } =
    useContractWriteWithConfirmations({
      address: registerToken,
      abi: abiWithErrors(erc20ABI),
      args: [communityAddress, 0n], // [allowed spender address, amount ]
      functionName: "approve",
      contractName: "ERC20",
    });

  const { data: allowance } = useContractRead({
    address: registerToken,
    abi: abiWithErrors2<typeof erc20ABI>(erc20ABI),
    args: [accountAddress as Address, communityAddress], // [ owner,  spender address ]
    functionName: "allowance",
    enabled: accountAddress !== undefined,
  });

  const {
    write: writeIncreasePower,
    status: increaseStakeStatus,
  } = useContractWriteWithConfirmations({
    ...registryContractCallConfig,
    functionName: "increasePower",
    args: [requestedAmount as bigint],
    onConfirmations: () => {
      publish({
        topic: "member",
        type: "update",
        function: "increasePower",
        containerId: communityAddress,
        id: connectedAccount,
        chainId: urlChainId,
      });
    },
  });

  const {
    write: writeDecreasePower,
    error: errorDecreasePower,
    status: decreasePowerStatus,
    isError: isErrordecreasePower,
  } = useContractWriteWithConfirmations({
    ...registryContractCallConfig,
    functionName: "decreasePower",
    args: [requestedAmount as bigint],
    onConfirmations: () => {
      publish({
        topic: "member",
        type: "update",
        containerId: communityAddress,
        function: "decreasePower",
        id: connectedAccount,
        chainId: urlChainId,
      });
    },
  });

  useErrorDetails(errorDecreasePower, "errorDecrease");

  useEffect(() => {
    if (decreasePowerStatus === "success") {
      setIncreaseInput("");
    }
  }, [decreasePowerStatus]);

  const decreasePoweErrorName = useErrorDetails(errorDecreasePower);
  useEffect(() => {
    if (isErrordecreasePower && decreasePoweErrorName.errorName !== undefined) {
      toast.error(decreasePoweErrorName.errorName);
    }
  }, [errorDecreasePower]);

  const requestesMoreThanAllowance =
    (allowance ?? 0n) > 0n && requestedAmount > (allowance ?? 0n);

  async function handleChange() {
    if (requestesMoreThanAllowance) {
      writeResetAllowance?.();
      return;
    }
    if (requestedAmount <= (allowance ?? 0n)) {
      writeIncreasePower?.();
      openModal();
      setPendingAllowance(true);
    } else {
      // initial state, allowance === 0
      writeAllowToken?.();
      openModal();
    }
  }

  const handleInputChange = (e: any) => {
    setIncreaseInput(e.target.value);
  };

  useEffect(() => {
    if (
      resetAllowanceStatus === "success" &&
      allowanceTokenStatus === "idle"
    ) {
      writeAllowToken?.();
    }
    if (isWaitSuccess) {
      writeIncreasePower?.();
    }
  }, [resetAllowanceStatus, isWaitSuccess, allowanceTokenStatus]);

  useEffect(() => {
    if (increaseStakeStatus === "success") {
      closeModal();
      setIncreaseInput("");
      setPendingAllowance(false);
    }
  }, [increaseStakeStatus]);

  const isInputIncreaseGreaterThanBalance =
    Number(increaseInput as unknown as number) >
    Number(accountTokenBalance?.formatted);

  //IncreasePower Disable Button condition => message mapping
  const disablePowerBtnCondition: ConditionObject[] = [
    {
      condition: !isMember,
      message: "Join community to increase voting power",
    },
    {
      condition:
        Number(increaseInput) === 0 ||
        increaseInput === undefined ||
        Number(increaseInput) < 0,
      message: "Input can not be zero or negative",
    },
  ];

  const disableIncPowerBtnCondition: ConditionObject[] = [
    ...disablePowerBtnCondition,
    {
      condition: isInputIncreaseGreaterThanBalance,
      message: `Not enough ${tokenSymbol} balance to stake`,
    },

    {
      condition: requestesMoreThanAllowance,
      message: `You have a pending allowance of ${formatTokenAmount(allowance ?? 0n, registerTokenDecimals)} ${tokenSymbol}. In order to stake more tokens, plaese stake the pending allowance first`,
    },
  ];

  const disableDecPowerBtnCondition: ConditionObject[] = [
    ...disablePowerBtnCondition,
    {
      condition:
        parseUnits(increaseInput.toString(), registerTokenDecimals) >
        memberStakedTokens - registerStakeAmount,
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

  if (isMember) {
    return (
      <section className="section-layout">
        <TransactionModal
          ref={modalRef}
          label={`Stake ${tokenSymbol} in community`}
          initialTransactionSteps={InitialTransactionSteps}
          allowTokenStatus={allowanceTokenStatus}
          stepTwoStatus={increaseStakeStatus}
          token={tokenSymbol}
          pendingAllowance={pendingAllowance}
          setPendingAllowance={setPendingAllowance}
        />

        <div className="flex justify-between gap-4">
          <div className=" flex flex-col justify-between gap-4">
            <div className="flex gap-4">
              <ExclamationCircleIcon height={32} width={32} />
              <p className="max-w-sm">
                Staking more tokens in the community will increase your voting
                power to support proposals
              </p>
            </div>
            {isMember && (
              <div className="flex justify-between">
                <div className="flex-start flex gap-2">
                  <p>Balance:</p>
                  <DisplayNumber
                    number={accountTokenBalance?.formatted ?? "0"}
                    tokenSymbol={tokenSymbol}
                    compact={true}
                  />
                </div>
                <div className="flex-start flex gap-2">
                  <p>Current Stake:</p>
                  <DisplayNumber
                    number={[BigInt(memberStakedTokens), registerTokenDecimals]}
                    tokenSymbol={tokenSymbol}
                    compact={true}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="relative">
              <input
                type="number"
                value={increaseInput}
                placeholder="Amount"
                className="input input-bordered input-info w-full disabled:bg-gray-300 disabled:text-black"
                onChange={(e) => handleInputChange(e)}
                disabled={!isMember}
              />
              <span className="absolute right-8 top-3.5 text-black">
                {tokenSymbol}
              </span>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleChange}
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
  } else {
    return;
  }
};

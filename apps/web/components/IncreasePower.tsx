"use client";

import { useEffect, useRef, useState } from "react";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { parseUnits } from "viem";
import { Address, useAccount, useBalance } from "wagmi";
import { isMemberQuery, RegistryCommunity, TokenGarden } from "#/subgraph/.graphclient";
import { Button } from "./Button";
import { DisplayNumber } from "./DisplayNumber";
import { TransactionModal, TransactionProps, TransactionStep } from "./TransactionModal";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import useModal from "@/hooks/useModal";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { erc20ABI, registryCommunityABI } from "@/src/generated";
import { abiWithErrors, abiWithErrors2 } from "@/utils/abiWithErrors";
import { useErrorDetails } from "@/utils/getErrorName";
import { formatTokenAmount } from "@/utils/numbers";

type IncreasePowerProps = {
  allowance: bigint | undefined;
  accountAddress: Address | undefined;
  memberData: isMemberQuery | undefined;
  registryCommunity: Pick<RegistryCommunity, "communityName" | "id" | "covenantIpfsHash" | "communityFee" | "protocolFee" | "registerStakeAmount" | "registerToken">;
  tokenGarden: Pick<TokenGarden, "symbol" | "decimals" | "id">;
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
  allowance,
  accountAddress,
  memberData,
  registryCommunity,
  tokenGarden,
}: IncreasePowerProps) => {
  const { symbol: tokenSymbol, decimals: tokenDecimals, id: registerToken } = tokenGarden;
  let { communityName, registerStakeAmount, id: communityAddress } = registryCommunity;

  const { openModal, closeModal, ref } = useModal();

  const [pendingAllowance, setPendingAllowance] = useState<boolean | undefined>(
    false,
  );
  const [increaseInput, setIncreaseInput] = useState<number | string>("");

  const { publish } = usePubSubContext();
  const { address: connectedAccount } = useAccount();

  const stakedTokens = memberData?.member?.memberCommunity?.[0]?.stakedTokens;
  const isMember = memberData?.member?.memberCommunity?.[0]?.isRegistered;

  const memberStakedTokens = BigInt(typeof stakedTokens === "string" ? stakedTokens : "0");
  registerStakeAmount = BigInt(typeof registerStakeAmount === "string" ? registerStakeAmount : "0");

  const urlChainId = useChainIdFromPath();

  // const { data: isMemberResult, refetch: refetchIsMember, fetching } = useSubgraphQuery<isMemberQuery>(
  //   {
  //     query: isMemberDocument,
  //     variables:{
  //       me: accountAddress?.toLowerCase(),
  //       comm: communityAddress.toLowerCase(),
  //     },
  //     enabled: accountAddress !== undefined,
  //   },
  // );

  // useEffect(() => {
  //   if (accountAddress && isMemberResult && !fetching) {
  //     refetchIsMember().then(result => {
  //       if (result?.data && result?.data.members.length > 0) {
  //         const stakedTokens = result?.data.members?.[0]?.memberCommunity?.[0]?.stakedTokens;
  //         setMemberStakedTokens(BigInt(typeof stakedTokens === "string" ? stakedTokens : "0"));
  //       }
  //     });
  //   }
  // }, [accountAddress]);

  const requestedAmount = parseUnits(
    (increaseInput ?? 0).toString(),
    tokenDecimals,
  );

  const { data: accountTokenBalance } = useBalance({
    address: accountAddress,
    token: registerToken as Address,
    chainId: urlChainId ?? 0,
  });

  //TODO: create a hook for this
  const registryContractCallConfig = {
    address: communityAddress as Address,
    abi: abiWithErrors2(registryCommunityABI),
    contractName: "Registry Community",
  };

  // const { data: isMember } = useContractRead({
  //   ...registryContractCallConfig,
  //   functionName: "isMember",
  //   enabled: accountAddress !== undefined,
  //   args: [accountAddress as Address],
  // });

  const {
    isSuccess: isWaitSuccess,
    write: writeAllowToken,
    status: allowanceTokenStatus,
  } = useContractWriteWithConfirmations({
    address: registerToken as Address,
    abi: abiWithErrors(erc20ABI),
    args: [communityAddress, requestedAmount], // [allowed spender address, amount ]
    functionName: "approve",
    contractName: "ERC20",
    showNotification: false,
  });

  const { write: writeResetAllowance, status: resetAllowanceStatus } =
    useContractWriteWithConfirmations({
      address: registerToken as Address,
      abi: abiWithErrors(erc20ABI),
      args: [communityAddress, 0n], // [allowed spender address, amount ]
      functionName: "approve",
      contractName: "ERC20",
      showNotification: false,
    });

  // const { data: allowance } = useContractRead({
  //   address: registerToken,
  //   abi: abiWithErrors2<typeof erc20ABI>(erc20ABI),
  //   args: [accountAddress as Address, communityAddress], // [ owner,  spender address ]
  //   functionName: "allowance",
  //   enabled: accountAddress !== undefined,
  // });

  const {
    write: writeIncreasePower,
    status: increaseStakeStatus,
  } = useContractWriteWithConfirmations({
    ...registryContractCallConfig,
    functionName: "increasePower",
    args: [requestedAmount],
    showNotification: false,
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
    args: [requestedAmount],
    fallbackErrorMessage: "Error decreasing power. Please try again.",
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
      message: `You have a pending allowance of ${formatTokenAmount(allowance ?? 0n, tokenDecimals)} ${tokenSymbol}. In order to stake more tokens, plaese stake the pending allowance first`,
    },
  ];

  const disableDecPowerBtnCondition: ConditionObject[] = [
    ...disablePowerBtnCondition,
    {
      condition:
        parseUnits(increaseInput.toString(), tokenDecimals) >
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

  const transactions: TransactionProps[] = [{
    message: "Test...",
    status: "idle",
    contractName: "Contract Test",
  }, {
    message: "Test 2...",
    status: "waiting",
    contractName: "Contract Test 2",
  }];

  if (isMember) {
    return (
      <section className="section-layout">
        <TransactionModal
          ref={ref}
          label={`Stake ${tokenSymbol} in ${communityName}`}
          // initialTransactionSteps={InitialTransactionSteps}
          // allowTokenStatus={allowanceTokenStatus}
          // stepTwoStatus={increaseStakeStatus}
          // token={tokenSymbol}
          // pendingAllowance={pendingAllowance}
          transactions={transactions}
          // setPendingAllowance={setPendingAllowance}
          closeModal={closeModal}
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
                    number={[memberStakedTokens, tokenDecimals]}
                    tokenSymbol={tokenSymbol}
                    compact={true}
                  />
                </div>
                <div className="flex-start flex gap-2">
                  <p>Current Stake:</p>
                  <DisplayNumber
                    number={[memberStakedTokens - BigInt(registerStakeAmount), tokenDecimals]}
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

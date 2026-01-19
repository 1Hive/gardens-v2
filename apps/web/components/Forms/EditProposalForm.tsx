"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Address, formatUnits, parseUnits } from "viem";
import { useAccount, useContractRead } from "wagmi";
import { CVProposal, getProposalDataQuery } from "#/subgraph/.graphclient";
import { FormAddressInput } from "./FormAddressInput";
import { FormInput } from "./FormInput";
import { FormPreview, FormRow } from "./FormPreview";
import { LoadingSpinner } from "../LoadingSpinner";
import { calculateConvictionGrowthInSeconds } from "../PoolHeader";
import { Button, EthAddress, InfoBox, InfoWrapper } from "@/components";
import { Countdown } from "@/components/Countdown";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useConvictionRead } from "@/hooks/useConvictionRead";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { MetadataV1 } from "@/hooks/useIpfsFetch";
import { usePoolToken } from "@/hooks/usePoolToken";
import { cvStrategyABI } from "@/src/generated";
import { PoolTypes } from "@/types";
import { ipfsJsonUpload } from "@/utils/ipfsUtils";
import {
  calculatePercentageBigInt,
  convertSecondsToReadableTime,
  safeParseUnits,
} from "@/utils/numbers";

//protocol : 1 => means ipfs!, to do some checks later
type FormInputs = {
  title: string;
  amount: number;
  beneficiary: string;
  description: string;
};

type EditProposalFormProps = {
  strategy: NonNullable<getProposalDataQuery["cvproposal"]>["strategy"];
  spendingLimit: number | string | undefined;
  spendingLimitPct: number;
  proposal: NonNullable<
    Pick<
      CVProposal,
      | "proposalNumber"
      | "beneficiary"
      | "requestedAmount"
      | "convictionLast"
      | "metadataHash"
      | "createdAt"
      | "stakedAmount"
    > & {
      metadata: MetadataV1;
    }
  >;
  poolToken: ReturnType<typeof usePoolToken>;
  onClose: () => void;
  setIsDisabled?: (isDisabled: boolean) => void;
};

type FormRowTypes = {
  label: string;
  parse?: (value: any) => React.ReactNode;
};

export const EditProposalForm = ({
  strategy,
  spendingLimitPct,
  spendingLimit,
  proposal,
  poolToken,
  onClose,
  setIsDisabled,
}: EditProposalFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
    watch,
  } = useForm<FormInputs>({
    mode: "onBlur",
    defaultValues: {
      title: proposal.metadata?.title ?? "",
      description: proposal.metadata?.description ?? "",
      amount: Number(
        formatUnits(proposal.requestedAmount, poolToken?.decimals ?? 18),
      ),
      beneficiary: proposal.beneficiary,
    },
  });

  const { publish } = usePubSubContext();
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const proposalCreatedAtMs = Number(proposal.createdAt ?? 0) * 1000;
  const metadataEditDeadline = proposalCreatedAtMs + ONE_HOUR_MS;
  const metadataEditDeadlineSeconds = Math.floor(metadataEditDeadline / 1000);
  const [metadataTimeLeft, setMetadataTimeLeft] = useState(() =>
    Math.max(metadataEditDeadline - Date.now(), 0),
  );
  const canEditMetadata = metadataTimeLeft > 0;
  const proposalConviction = useConvictionRead({
    strategyConfig: strategy.config,
    proposalData: { ...proposal, strategy: strategy },
    tokenData: poolToken,
    enabled: Boolean(strategy.id && proposal.proposalNumber),
  });
  const currentConvictionPct = proposalConviction.currentConvictionPct ?? 0;
  const canEditAmount =
    currentConvictionPct === 0 && proposalConviction.totalSupportPct === 0;

  const chainId = useChainIdFromPath();
  const { address: connectedWallet } = useAccount();
  const beneficiary = watch("beneficiary");

  const formRowTypes: Record<string, FormRowTypes> = {
    amount: {
      label: "Requested amount:",
      parse: (value: number) => `${value} ${poolToken?.symbol}`,
    },
    beneficiary: {
      label: "Beneficiary:",
      parse: (value: string) => <EthAddress address={value as Address} />,
    },
    proposalType: {
      label: "Proposal Type:",
    },
    strategy: { label: "Strategy:" },
  };

  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<FormInputs>();
  const [requestedAmount, setRequestedAmount] = useState<string>();
  const [loading, setLoading] = useState(false);
  const { blockTime, id: chainIdFromPath } = useChainFromPath()!;

  const convictionGrowthSec = calculateConvictionGrowthInSeconds(
    strategy.config.decay,
    blockTime,
  );
  const { value: convictionGrowth, unit: convictionGrowthUnit } =
    convertSecondsToReadableTime(convictionGrowthSec);

  const disableSubmitBtn = useMemo<ConditionObject[]>(
    () => [
      {
        condition: !canEditAmount && !canEditMetadata,
        message: "This proposal is not editable anymore.",
      },
    ],
    [connectedWallet, strategy.registryCommunity?.members],
  );
  const { tooltipMessage, isButtonDisabled } =
    useDisableButtons(disableSubmitBtn);

  const proposalTypeName = PoolTypes[strategy.config.proposalType];

  const proposalTitle = watch("title");
  const proposalDescription = watch("description");
  const proposalMetadataChanged =
    proposalTitle !== proposal.metadata?.title ||
    proposalDescription !== proposal.metadata?.description;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const updateTime = () => {
      setMetadataTimeLeft(() => {
        const remaining = Math.max(metadataEditDeadline - Date.now(), 0);
        if (remaining === 0 && Boolean(timer)) {
          clearInterval(timer);
        }
        return remaining;
      });
    };

    updateTime();
    timer = setInterval(updateTime, 1000);

    return () => clearInterval(timer);
  }, [metadataEditDeadline]);

  useEffect(() => {
    setRequestedAmount(
      formatUnits(proposal.requestedAmount, poolToken?.decimals ?? 18),
    );
  }, [proposal.requestedAmount, poolToken?.decimals]);

  useEffect(() => {
    setIsDisabled?.(isButtonDisabled);
  }, [isButtonDisabled, setIsDisabled]);

  const editProposal = async () => {
    setLoading(true);
    try {
      const ipfsHash =
        proposalMetadataChanged ?
          await ipfsJsonUpload({
            title: proposalTitle,
            description: proposalDescription,
          })
        : proposal.metadataHash;

      if (!ipfsHash) {
        setLoading(false);
        return;
      }

      if (previewData === undefined) {
        throw new Error("No preview data");
      }

      const amount = parseUnits(
        requestedAmount ?? "0",
        poolToken?.decimals ?? 0,
      );

      write({
        args: [
          proposal.proposalNumber,
          { protocol: 1n, pointer: ipfsHash },
          (previewData?.beneficiary ||
            "0x0000000000000000000000000000000000000000") as Address,
          amount,
        ],
      });
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handlePreview = (data: FormInputs) => {
    setPreviewData(data);
    setShowPreview(true);
  };

  const { write } = useContractWriteWithConfirmations({
    address: strategy.id as Address,
    abi: cvStrategyABI,
    contractName: "CV Strategy",
    functionName: "editProposal",
    fallbackErrorMessage: "Error editing Proposal, please report a bug.",
    onSuccess: () => {
      setLoading(true);
      onClose();
    },
    onError: () => {
      setLoading(false);
    },
    onConfirmations: () => {
      publish({
        topic: "proposal",
        type: "update",
        function: "editProposal",
        containerId: strategy.poolId,
        id: proposal.proposalNumber.toString(), // proposalNumber is a bigint
        chainId,
      });
      setLoading(false);
    },
  });

  const INPUT_TOKEN_MIN_VALUE =
    Number(requestedAmount) == 0 ? 0 : 1 / 10 ** (poolToken?.decimals ?? 0);

  const { data: thresholdFromContract } = useContractRead({
    address: strategy.id as Address,
    abi: cvStrategyABI,
    chainId: chainIdFromPath,
    functionName: "calculateThreshold",
    args: [
      requestedAmount ?
        safeParseUnits(requestedAmount, poolToken?.decimals ?? 0)
      : 0n,
    ],
    enabled:
      requestedAmount !== undefined &&
      PoolTypes[strategy?.config?.proposalType] === "funding",
  });

  const thresholdPct = calculatePercentageBigInt(
    thresholdFromContract as bigint,
    BigInt(strategy.maxCVSupply),
  );

  if (!poolToken && PoolTypes[strategy.config.proposalType] === "funding") {
    return (
      <div className="m-40 col-span-12">
        <LoadingSpinner />
      </div>
    );
  }

  const formatFormRows = () => {
    if (!previewData) {
      return [];
    }
    let formattedRows: FormRow[] = [];

    Object.entries(previewData).forEach(([key, value]) => {
      const formRow = formRowTypes[key];
      if (Boolean(formRow)) {
        const parsedValue = formRow.parse ? formRow.parse(value) : value;
        formattedRows.push({
          label: formRow.label,
          data: parsedValue,
        });
      }
    });

    formattedRows.push({
      label: formRowTypes.strategy.label,
      data: "Conviction voting",
    });
    formattedRows.push({
      label: formRowTypes.proposalType.label,
      data: proposalTypeName,
    });

    return formattedRows;
  };

  function getThresholdColor(
    thresholdPctArgument: number,
  ): "info" | "warning" | "error" {
    if (thresholdPctArgument < 50) return "info";
    if (thresholdPctArgument < 100) return "warning";
    return "error";
  }

  const thColor = getThresholdColor(thresholdPct);

  return (
    <form onSubmit={handleSubmit(handlePreview)} className="w-full">
      {showPreview ?
        <FormPreview
          title={previewData?.title ?? ""}
          description={previewData?.description ?? ""}
          formRows={formatFormRows()}
          onEdit={() => {
            setShowPreview(false);
            setLoading(false);
          }}
          onSubmit={() => {
            if (isButtonDisabled) return;
            editProposal();
          }}
        />
      : <div className="flex flex-col gap-2 overflow-hidden p-1">
          {proposalTypeName === "funding" && canEditAmount && (
            <div className="border-2 border-neutral-soft dark:border-neutral rounded-lg p-4">
              <InfoBox infoBoxType={"info"} className="mb-2" hideIcon>
                <div className="font-bold">
                  The requested amount is only editable until support is
                  received.
                </div>
              </InfoBox>
              <FormInput
                label="Requested amount"
                subLabel={`Pool Funds: ${poolToken?.formatted} ${poolToken?.symbol} - Spending limit: ${spendingLimitPct.toFixed(1)}% = ${spendingLimit} ${poolToken?.symbol}.`}
                register={register}
                required
                onChange={(e) => {
                  setRequestedAmount(e.target.value);
                }}
                disabled={!canEditAmount}
                registerOptions={{
                  // max: {
                  //   value: spendingLimit ? +spendingLimit : 0,
                  //   message: `Max amount must remain under the spending limit of ${spendingLimit} ${poolToken?.symbol}`,
                  // },
                  min: {
                    value: INPUT_TOKEN_MIN_VALUE,
                    message: `Amount must be greater than ${INPUT_TOKEN_MIN_VALUE}`,
                  },
                }}
                otherProps={{
                  step: INPUT_TOKEN_MIN_VALUE,
                  min: INPUT_TOKEN_MIN_VALUE,
                }}
                errors={errors}
                className="pr-14"
                registerKey="amount"
                type="number"
                placeholder="0"
                suffix={poolToken?.symbol}
              />

              {requestedAmount && thresholdPct !== 0 && canEditAmount && (
                <InfoBox
                  title={`Conviction required:${" "} ${thresholdPct > 100 ? "Over 100" : thresholdPct}%`}
                  infoBoxType={thColor}
                >
                  <div className="flex flex-wrap w-full">
                    The{" "}
                    <InfoWrapper
                      tooltip={`Conviction accumulates over time based on both the level of support on a proposal and the duration defined by the Conviction Growth parameter (${convictionGrowth} ${convictionGrowthUnit}).`}
                      size="sm"
                      hoverOnChildren={true}
                      hideIcon={true}
                      className={`tooltip-top-right border-b border-dashed border-${thColor} text-sm`}
                    >
                      conviction
                    </InfoWrapper>{" "}
                    required for the proposal to pass within the request amount
                    is {thresholdPct}%.{" "}
                    {requestedAmount &&
                      thresholdPct > 50 &&
                      (thresholdPct < 100 ?
                        "It may be difficult to pass."
                      : "It will not pass unless more funds are added to the pool")}
                  </div>
                </InfoBox>
              )}
            </div>
          )}

          {canEditMetadata && (
            <div className="flex flex-col mt-4 border-2 border-neutral-soft dark:border-neutral rounded-lg p-4">
              <InfoBox infoBoxType={"info"} className="mb-2" hideIcon>
                <div className="flex flex-row gap-1 align-middle font-bold">
                  <div className="flex flex-col">
                    <div className="flex flex-row items-center">
                      <Countdown
                        endTimestamp={metadataEditDeadlineSeconds}
                        format="minutes"
                        display="inline"
                        showTimeout={false}
                        className="items-end text-xs font-semibold"
                      />
                      &nbsp;left to edit for this section.
                    </div>
                  </div>
                </div>
              </InfoBox>

              {proposalTypeName !== "signaling" && (
                <div className="flex flex-col">
                  <FormAddressInput
                    label="Beneficiary address"
                    register={register}
                    registerKey="beneficiary"
                    value={beneficiary}
                    onChange={(e) => {
                      setValue("beneficiary", e.target.value);
                    }}
                    required
                    errors={errors}
                    disabled={!canEditMetadata}
                    tooltip={
                      canEditMetadata ? undefined : (
                        "Beneficiary can only be changed within the first hour."
                      )
                    }
                  />
                </div>
              )}
              <div className="flex flex-col">
                <FormInput
                  label="Title"
                  register={register}
                  required
                  errors={errors}
                  registerKey="title"
                  type="text"
                  placeholder="Example Title"
                  disabled={!canEditMetadata}
                />
              </div>
              <div className="flex flex-col">
                <FormInput
                  label="Proposal description"
                  register={register}
                  required
                  errors={errors}
                  registerKey="description"
                  onChange={(e) => {
                    setValue("description", e.target.value);
                  }}
                  value={getValues("description")}
                  type="markdown"
                  rows={10}
                  placeholder="Proposal description"
                  disabled={!canEditMetadata}
                />
              </div>
            </div>
          )}
        </div>
      }
      {(canEditAmount || canEditMetadata) && (
        <div className="flex w-full items-center justify-end py-6 flex-wrap">
          {showPreview ?
            <div className="flex items-center gap-10">
              <Button
                onClick={() => {
                  setShowPreview(false);
                  setLoading(false);
                }}
                btnStyle="outline"
              >
                Edit
              </Button>
              <Button
                onClick={() => editProposal()}
                isLoading={loading}
                disabled={isButtonDisabled}
                tooltip={tooltipMessage}
              >
                Submit
              </Button>
            </div>
          : <Button type="submit">Preview</Button>}
        </div>
      )}
    </form>
  );
};

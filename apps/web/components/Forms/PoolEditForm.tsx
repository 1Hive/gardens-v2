import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { Address, parseUnits } from "viem";
import { TokenGarden } from "#/subgraph/.graphclient";
import { FormInput } from "./FormInput";
import { FormPreview, FormRow } from "./FormPreview";
import { Button } from "../Button";
import { chainDataMap } from "@/configs/chainServer";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { cvStrategyABI } from "@/src/generated";
import { abiWithErrors } from "@/utils/abiWithErrors";
import {
  calculateDecay,
  CV_SCALE_PRECISION,
  MAX_RATIO_CONSTANT,
} from "@/utils/numbers";

type ContractParams = [bigint, bigint, bigint, bigint];

type FormInputs = {
  spendingLimit: number;
  minimumConviction: number;
  convictionGrowth: number;
  minThresholdPoints: string;
};

type Props = {
  strategyAddr: Address;
  token: TokenGarden["decimals"];
  chainId: number;
  initValues: FormInputs;
};

export default function PoolEditForm({
  token,
  strategyAddr,
  chainId,
  initValues,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInputs>({
    defaultValues: {
      spendingLimit: initValues.spendingLimit,
      minimumConviction: initValues.minimumConviction,
      convictionGrowth: initValues.convictionGrowth,
      minThresholdPoints: initValues.minThresholdPoints,
    },
  });

  const INPUT_TOKEN_MIN_VALUE = 1 / 10 ** token.decimals;
  const INPUT_MIN_THRESHOLD_VALUE = 0;

  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<FormInputs>();
  const [loading, setLoading] = useState(false);
  const { publish } = usePubSubContext();

  const formRowTypes: Record<string, any> = {
    spendingLimit: {
      label: "Spending limit:",
      parse: (value: string) => value + " %",
    },
    minimumConviction: {
      label: "Minimum conviction:",
      parse: (value: string) => value + " %",
    },
    convictionGrowth: {
      label: "Conviction growth:",
      parse: (value: string) => value + " days",
    },
    minThresholdPoints: {
      label: "Minimum threshold points:",
      parse: (value: string) => {
        // check if string is empty or undefined with ||
        return value || "0";
      },
    },
  };

  const contractWrite = () => {
    setLoading(true);
    let spendingLimit: number;
    let minimumConviction;
    let convictionGrowth;

    spendingLimit = previewData?.spendingLimit as number;
    minimumConviction = previewData?.minimumConviction as number;
    convictionGrowth = previewData?.convictionGrowth as number;

    // parse to percentage fraction
    spendingLimit = spendingLimit / 100;
    minimumConviction = minimumConviction / 100;

    const maxRatioNum = spendingLimit / MAX_RATIO_CONSTANT;
    const weightNum = minimumConviction * maxRatioNum ** 2;

    const blockTime = chainDataMap[chainId].blockTime;

    // pool settings
    const maxRatio = BigInt(Math.round(maxRatioNum * CV_SCALE_PRECISION));
    const weight = BigInt(Math.round(weightNum * CV_SCALE_PRECISION));
    const decay = BigInt(
      Math.round(calculateDecay(blockTime, convictionGrowth)),
    );

    const minThresholdPoints = parseUnits(
      (previewData?.minThresholdPoints ?? 0).toString(),
      token.decimals,
    );

    const params: ContractParams = [
      maxRatio,
      weight,
      decay,
      minThresholdPoints,
    ];

    const args =
      // : EditPoolParams
      [params];
    console.debug(args);
    // write({ args: args });
  };

  const formatFormRows = () => {
    if (!previewData) {
      return [];
    }
    let formattedRows: FormRow[] = [];

    const reorderedData = {
      minimumConviction: previewData.minimumConviction,
      convictionGrowth: previewData.convictionGrowth,
      minThresholdPoints: previewData.minThresholdPoints,
      spendingLimit: previewData.spendingLimit,
    };

    Object.entries(reorderedData).forEach(([key, value]) => {
      const formRow = formRowTypes[key];

      if (formRow) {
        const parsedValue = formRow.parse ? formRow.parse(value) : value;
        formattedRows.push({
          label: formRow.label,
          data: parsedValue,
        });
      } else {
        return;
      }
    });

    return formattedRows;
  };

  const { write } = useContractWriteWithConfirmations({
    address: strategyAddr,
    abi: abiWithErrors(cvStrategyABI),
    contractName: "Registry Community",
    functionName: "createPool",
    fallbackErrorMessage: "Error creating a pool. Please ty again.",
    onConfirmations: (receipt) => {
      // const newPoolData = getEventFromReceipt(
      //   receipt,
      //   "RegistryCommunity",
      //   "PoolCreated",
      // ).args;
      publish({
        topic: "pool",
        function: "setPoolParams",
        type: "update",
        containerId: strategyAddr,
        chainId: chainId,
      });
    },
    onError: () =>
      toast.error("Something went wrong creating a pool, check logs"),
  });

  const handlePreview = (data: FormInputs) => {
    setPreviewData(data);
    setShowPreview(true);
  };

  return (
    <form onSubmit={handleSubmit(handlePreview)} className="w-[520px]">
      {showPreview ?
        <FormPreview
          formRows={formatFormRows()}
          previewTitle="Check pool creation details"
        />
      : <div className="flex flex-col gap-6">
          <div className="flex max-w-64 flex-col">
            <FormInput
              label="Minimum conviction"
              register={register}
              required
              errors={errors}
              registerKey="minimumConviction"
              type="number"
              placeholder="10"
              className="pr-14"
              otherProps={{
                step: 1 / CV_SCALE_PRECISION,
                min: 1 / CV_SCALE_PRECISION,
              }}
              registerOptions={{
                max: {
                  value: 100,
                  message: "Max amount cannot exceed 100%",
                },
                min: {
                  value: 1 / CV_SCALE_PRECISION,
                  message: "Amount must be greater than 0",
                },
              }}
            >
              <span className="absolute right-4 top-4 text-black">%</span>
            </FormInput>
          </div>
          <div className="flex max-w-64 flex-col">
            <FormInput
              label="Conviction growth"
              register={register}
              required
              errors={errors}
              registerKey="convictionGrowth"
              type="number"
              placeholder="10"
              className="pr-14"
              otherProps={{
                step: INPUT_TOKEN_MIN_VALUE,
                min: INPUT_TOKEN_MIN_VALUE,
              }}
              registerOptions={{
                max: {
                  value: 100,
                  message: "Max amount cannot exceed 100 DAYS",
                },
                min: {
                  value: INPUT_TOKEN_MIN_VALUE,
                  message: `Amount must be greater than ${INPUT_TOKEN_MIN_VALUE}`,
                },
              }}
            >
              <span className="absolute right-4 top-4 text-black">days</span>
            </FormInput>
          </div>
          <div className="flex flex-col">
            <FormInput
              label="Minimum threshold points"
              register={register}
              registerOptions={{
                min: {
                  value: INPUT_MIN_THRESHOLD_VALUE,
                  message: `Amount must be greater than ${INPUT_MIN_THRESHOLD_VALUE}`,
                },
              }}
              otherProps={{
                step: INPUT_TOKEN_MIN_VALUE,
                min: INPUT_MIN_THRESHOLD_VALUE,
              }}
              errors={errors}
              registerKey="minThresholdPoints"
              type="number"
              placeholder="0"
            />
          </div>
          <div className="flex max-w-64 flex-col">
            <FormInput
              label="Spending limit"
              register={register}
              required
              errors={errors}
              registerKey="spendingLimit"
              type="number"
              placeholder="20"
              className="pr-14"
              otherProps={{
                step: 1 / CV_SCALE_PRECISION,
                min: 1 / CV_SCALE_PRECISION,
              }}
              registerOptions={{
                max: {
                  value: 100,
                  message: "Max amount cannot exceed 100%",
                },
                min: {
                  value: 1 / CV_SCALE_PRECISION,
                  message: "Amount must be greater than 0",
                },
              }}
            >
              <span className="absolute right-4 top-4 text-black">%</span>
            </FormInput>
          </div>
        </div>
      }
      <div className="flex w-full items-center justify-center py-6">
        {showPreview ?
          <div className="flex items-center gap-10">
            <Button
              onClick={() => {
                setShowPreview(false);
                setLoading(false);
              }}
              btnStyle="outline"
            >
              Go Back
            </Button>
            <Button onClick={() => contractWrite()} isLoading={loading}>
              Submit
            </Button>
          </div>
        : <Button type="submit">Preview</Button>}
      </div>
    </form>
  );
}

"use client";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { Address, parseUnits } from "viem";
import { Button } from "@/components/Button";
import { ipfsJsonUpload } from "@/utils/ipfsUtils";
import { useAccount, useContractWrite } from "wagmi";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { registryCommunityABI } from "@/src/generated";
import { pointSystems, proposalTypes } from "@/types";
import "viem/window";
import { TokenGarden } from "#/subgraph/.graphclient";
import { FormInput } from "./FormInput";
import { FormSelect } from "./FormSelect";
import FormPreview, { FormRow } from "./FormPreview";
import { FormRadioButton } from "./FormRadioButton";
import { usePathname, useRouter } from "next/navigation";
import { MAX_RATIO_CONSTANT, PERCENTAGE_PRECISION } from "@/utils/numbers";
import { chainIdMap } from "@/configs/chainServer";

type PoolSettings = {
  spendingLimit?: number;
  minimumConviction?: number;
  convictionGrowth?: number;
};

type FormInputs = {
  title: string;
  description: string;
  strategyType: number;
  pointSystemType: number;
  optionType?: number;
  maxAmount?: number;
  minThresholdPoints: number;
} & PoolSettings;

type InitializeParams = [
  Address,
  BigInt,
  BigInt,
  BigInt,
  BigInt,
  number,
  number,
  [BigInt],
];
type Metadata = [BigInt, string];
type CreatePoolParams = [Address, InitializeParams, Metadata];

type FormRowTypes = {
  label: string;
  parse?: (value: any) => string;
};

type Props = {
  communityAddr: Address;
  alloAddr: Address;
  token: TokenGarden;
  chainId: number;
};

const poolSettingValues: Record<
  number,
  { label: string; description: string; values: PoolSettings }
> = {
  0: {
    label: "Custom",
    description: "If you know what you are doing",
    values: {},
  },
  1: {
    label: "Recommended",
    description: "Recommended default settings",
    values: { spendingLimit: 25, minimumConviction: 10, convictionGrowth: 10 },
  },
  2: {
    label: "1Hive",
    description: "1Hive original settings",
    values: { spendingLimit: 20, minimumConviction: 2.5, convictionGrowth: 2 },
  },
  3: {
    label: "Testing",
    description: "Conviction grows very fast",
    values: {
      spendingLimit: 25,
      minimumConviction: 10,
      convictionGrowth: 0.0005,
    },
  },
};

const proposalInputMap: Record<string, number[]> = {
  title: [0, 1, 2],
  description: [0, 1, 2],
  strategyType: [0, 1, 2],
  pointSystemType: [0, 1],
  optionType: [0, 1],
  maxAmount: [0, 1],
  minThresholdPoints: [1],
  spendingLimit: [1],
  minimumConviction: [1],
  convictionGrowth: [0, 1],
};

const isInInputMap = (key: string, value: number): boolean => {
  return proposalInputMap[key]?.includes(Number(value)) ?? false;
};

function calculateDecay(blockTime: number, convictionGrowth: number) {
  const halfLifeInSeconds = convictionGrowth * 24 * 60 * 60;

  const result = Math.floor(
    Math.pow(10, 7) * Math.pow(1 / 2, blockTime / halfLifeInSeconds),
  );

  return result;
}

export default function PoolForm({
  alloAddr,
  token,
  communityAddr,
  chainId,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitted },
    getValues,
    setValue,
    reset,
    watch,
  } = useForm<FormInputs>({
    defaultValues: {
      strategyType: 1,
      pointSystemType: 0,
    },
  });
  const INPUT_TOKEN_MIN_VALUE = 1 / 10 ** token?.decimals;
  const INPUT_MIN_THRESHOLD_MIN_VALUE = 0;

  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<FormInputs>();
  const [optionType, setOptionType] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { address } = useAccount();

  const pointSystemType = watch("pointSystemType");
  const strategyType = watch("strategyType");

  const formRowTypes: Record<string, FormRowTypes> = {
    optionType: {
      label: "Pool settings:",
      parse: (value: number) => poolSettingValues[value].label,
    },
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
    strategyType: {
      label: "Strategy type:",
      parse: (value: string) => proposalTypes[value],
    },
    pointSystemType: {
      label: "Voting Weight System:",
      parse: (value: string) => pointSystems[value],
    },
    maxAmount: {
      label: "Token max amount:",
    },
    minThresholdPoints: {
      label: "Minimum threshold points:",
    },
  };

  useEffect(() => {
    Object.entries(poolSettingValues["1"]?.values).forEach(([field, value]) => {
      setValue(field as keyof FormInputs, value);
    });
  }, []);

  const handlePreview = (data: FormInputs) => {
    data.optionType = optionType;
    setPreviewData(data);
    setShowPreview(true);
  };

  const contractWrite = async (ipfsHash: string) => {
    let spendingLimit: number;
    let minimumConviction;
    let convictionGrowth;

    if (optionType === 0) {
      spendingLimit = previewData?.spendingLimit as number;
      minimumConviction = previewData?.minimumConviction as number;
      convictionGrowth = previewData?.convictionGrowth as number;
    } else {
      spendingLimit = poolSettingValues[optionType].values
        ?.spendingLimit as number;
      minimumConviction = poolSettingValues[optionType].values
        ?.minimumConviction as number;
      convictionGrowth = poolSettingValues[optionType].values
        ?.convictionGrowth as number;
    }

    const maxRatioNum = spendingLimit / MAX_RATIO_CONSTANT;

    // console.log("maxRatioNum                %s", maxRatioNum);
    // console.log("minimumConviction          %s", minimumConviction);
    const weightNum = (minimumConviction / 100) * (maxRatioNum / 100) ** 2;

    // console.log("weightNum                  %s", weightNum);
    // console.log("convictionGrowth           %s", convictionGrowth);

    const blockTime = chainIdMap[chainId].blockTime;
    // pool settings
    const maxRatio = BigInt(Math.round(maxRatioNum * PERCENTAGE_PRECISION));
    const weight = BigInt(Math.round(weightNum * PERCENTAGE_PRECISION));
    const decay = BigInt(
      Math.round(calculateDecay(blockTime, convictionGrowth)),
    );

    const minThresholdPoints = parseUnits(
      (previewData?.minThresholdPoints || 0).toString(),
      token?.decimals,
    );

    const metadata: Metadata = [BigInt(1), ipfsHash];

    const maxAmountStr = (previewData?.maxAmount || 0).toString();

    const params: InitializeParams = [
      communityAddr as Address,
      decay,
      maxRatio,
      weight,
      minThresholdPoints,
      previewData?.strategyType as number, // proposalType
      previewData?.pointSystemType as number, // pointSystem
      [parseUnits(maxAmountStr, token?.decimals)], // pointConfig
    ];

    const args: CreatePoolParams = [token?.id as Address, params, metadata];
    console.log(args);
    write({ args: args });
  };

  const { write, error, isError, data } = useContractWrite({
    address: communityAddr,
    abi: abiWithErrors(registryCommunityABI),
    functionName: "createPool",
    onSuccess: () =>
      router.push(pathname.replace(`/${communityAddr}/create-pool`, "")),
    onError: () =>
      toast.error("Something went wrong creating a pool, check logs"),
    onSettled: () => setLoading(false),
  });

  const handleOptionTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedOptionType = parseInt(e.target.value);
    setOptionType(selectedOptionType);

    // If not custom, set preset values
    if (selectedOptionType !== 0) {
      Object.entries(poolSettingValues[selectedOptionType].values).forEach(
        ([field, value]) => {
          setValue(field as keyof FormInputs, value);
        },
      );
    }
  };

  const createPool = () => {
    setLoading(true);
    const json = {
      title: getValues("title"),
      description: getValues("description"),
    };

    const ipfsUpload = ipfsJsonUpload(json);
    toast
      .promise(ipfsUpload, {
        pending: "Uploading data, wait a moment...",
        success: "All ready!",
        error: "Something went wrong",
      })
      .then((ipfsHash) => {
        console.log("https://ipfs.io/ipfs/" + ipfsHash);
        if (previewData === undefined) throw new Error("No preview data");
        contractWrite(ipfsHash);
      })
      .catch((error: any) => {
        console.error(error);
        setLoading(false);
      });
  };

  const formatFormRows = () => {
    if (!previewData) return [];
    let formattedRows: FormRow[] = [];

    const reorderedData = {
      strategyType: previewData.strategyType,
      pointSystemType: previewData.pointSystemType,
      maxAmount: previewData.maxAmount as number,
      minThresholdPoints: previewData.minThresholdPoints as number,
      optionType: previewData.optionType as number,
      spendingLimit: previewData.spendingLimit as number,
      minimumConviction: previewData.minimumConviction as number,
      convictionGrowth: previewData.convictionGrowth as number,
    };

    Object.entries(reorderedData).forEach(([key, value]) => {
      const formRow = formRowTypes[key];
      if (key == "maxAmount" && previewData.pointSystemType != 1) return;
      if (formRow && isInInputMap(key, strategyType)) {
        const parsedValue = formRow.parse ? formRow.parse(value) : value;
        formattedRows.push({
          label: formRow.label,
          data: parsedValue,
        });
      }
    });

    return formattedRows;
  };
  return (
    <form onSubmit={handleSubmit(handlePreview)} className="w-full">
      {showPreview ? (
        <FormPreview
          title={previewData?.title || ""}
          description={previewData?.description || ""}
          formRows={formatFormRows()}
          previewTitle="Check pool creation details"
        />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col">
            <FormInput
              label="Pool Name"
              register={register}
              required
              errors={errors}
              registerKey="title"
              type="text"
              placeholder="Your pool name..."
            ></FormInput>
          </div>
          <div className="flex flex-col">
            <FormInput
              label="Description"
              register={register}
              required
              errors={errors}
              registerKey="description"
              type="textarea"
              rows={7}
              placeholder="Enter a description of your pool..."
            ></FormInput>
          </div>
          <div className="flex flex-col">
            <FormSelect
              label="Strategy type"
              register={register}
              errors={errors}
              registerKey="strategyType"
              options={Object.entries(proposalTypes)
                .slice(0, -1)
                .map(([value, text]) => ({ label: text, value: value }))}
            ></FormSelect>
          </div>
          <div className="flex flex-col">
            <h4 className="my-4 text-xl">Select pool settings</h4>
            <div className="flex gap-8">
              {Object.entries(poolSettingValues).map(
                ([key, { label, description }]) => (
                  <React.Fragment key={key}>
                    <FormRadioButton
                      label={label}
                      description={description}
                      value={parseInt(key)}
                      checked={optionType === parseInt(key)}
                      onChange={handleOptionTypeChange}
                      registerKey="poolSettings"
                    />
                  </React.Fragment>
                ),
              )}
            </div>
            <div className="mb-6 mt-2 flex flex-col">
              {isInInputMap("spendingLimit", strategyType) && (
                <div className="flex max-w-64 flex-col">
                  <FormInput
                    label="Spending limit"
                    register={register}
                    required
                    errors={errors}
                    registerKey="spendingLimit"
                    type="number"
                    placeholder="20"
                    readOnly={optionType !== 0}
                    className="pr-14"
                    otherProps={{
                      step: 1 / PERCENTAGE_PRECISION,
                      min: 1 / PERCENTAGE_PRECISION,
                    }}
                    registerOptions={{
                      max: {
                        value: 100,
                        message: `Max amount cannot exceed 100%`,
                      },
                      min: {
                        value: 1 / PERCENTAGE_PRECISION,
                        message: "Amount must be greater than 0",
                      },
                    }}
                  >
                    <span className="absolute right-4 top-4 text-black">%</span>
                  </FormInput>
                </div>
              )}
              {isInInputMap("minimumConviction", strategyType) && (
                <div className="flex max-w-64 flex-col">
                  <FormInput
                    label="Minimum conviction"
                    register={register}
                    required
                    errors={errors}
                    registerKey="minimumConviction"
                    type="number"
                    placeholder="10"
                    readOnly={optionType !== 0}
                    className="pr-14"
                    otherProps={{
                      step: 1 / PERCENTAGE_PRECISION,
                      min: 1 / PERCENTAGE_PRECISION,
                    }}
                    registerOptions={{
                      max: {
                        value: 100,
                        message: `Max amount cannot exceed 100%`,
                      },
                      min: {
                        value: 1 / PERCENTAGE_PRECISION,
                        message: "Amount must be greater than 0",
                      },
                    }}
                  >
                    <span className="absolute right-4 top-4 text-black">%</span>
                  </FormInput>
                </div>
              )}
              <div className="flex max-w-64 flex-col">
                <FormInput
                  label="Conviction growth"
                  register={register}
                  required
                  errors={errors}
                  registerKey="convictionGrowth"
                  type="number"
                  placeholder="10"
                  readOnly={optionType !== 0}
                  className="pr-14"
                  otherProps={{
                    step: INPUT_TOKEN_MIN_VALUE,
                    min: INPUT_TOKEN_MIN_VALUE,
                  }}
                  registerOptions={{
                    max: {
                      value: 100,
                      message: `Max amount cannot exceed 100 DAYS`,
                    },
                    min: {
                      value: INPUT_TOKEN_MIN_VALUE,
                      message: `Amount must be greater than ${INPUT_TOKEN_MIN_VALUE}`,
                    },
                  }}
                >
                  <span className="absolute right-4 top-4 text-black">
                    days
                  </span>
                </FormInput>
              </div>
            </div>
          </div>
          {isInInputMap("minThresholdPoints", strategyType) && (
            <div className="flex flex-col">
              <FormInput
                label="Minimum threshold points"
                register={register}
                required
                registerOptions={{
                  min: {
                    value: INPUT_MIN_THRESHOLD_MIN_VALUE,
                    message: `Amount must be greater than ${INPUT_MIN_THRESHOLD_MIN_VALUE}`,
                  },
                }}
                otherProps={{
                  step: INPUT_TOKEN_MIN_VALUE,
                  min: INPUT_MIN_THRESHOLD_MIN_VALUE,
                }}
                errors={errors}
                registerKey="minThresholdPoints"
                type="number"
                placeholder="0"
              ></FormInput>
            </div>
          )}

          <div className="flex flex-col">
            <FormSelect
              label="Voting Weight System"
              register={register}
              errors={errors}
              registerKey="pointSystemType"
              options={Object.entries(pointSystems).map(([value, text]) => ({
                label: text,
                value: value,
              }))}
            ></FormSelect>
          </div>
          {pointSystemType == 1 && (
            <div className="flex flex-col">
              <FormInput
                label="Token max amount"
                register={register}
                required
                registerOptions={{
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
                registerKey="maxAmount"
                type="number"
                placeholder="0"
              >
                <span className="absolute right-4 top-4 text-black">
                  {token?.symbol}
                </span>
              </FormInput>
            </div>
          )}
        </div>
      )}
      <div className="flex w-full items-center justify-center py-6">
        {showPreview ? (
          <div className="flex items-center gap-10">
            <Button
              type="button"
              onClick={() => createPool()}
              isLoading={loading}
            >
              Submit
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowPreview(false);
                setLoading(false);
              }}
              variant="fill"
            >
              Edit
            </Button>
          </div>
        ) : (
          <Button type="submit">Preview</Button>
        )}
      </div>
    </form>
  );
}

"use client";
import React, { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import {
  Address,
  Chain,
  createPublicClient,
  createWalletClient,
  custom,
  encodeAbiParameters,
  http,
} from "viem";
import { Button } from "@/components/Button";
import { ipfsJsonUpload } from "@/utils/ipfsUtils";
import { useAccount, useContractWrite } from "wagmi";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { cvStrategyABI, registryCommunityABI } from "@/src/generated";
import { pointSystems, proposalTypes } from "@/types";
import cvStrategyJson from "../../../../pkg/contracts/out/CVStrategy.sol/CVStrategy.json" assert { type: "json" };
import "viem/window";
import { getChainIdFromPath } from "@/utils/path";
import { getChain } from "@/configs/chainServer";
import { TokenGarden } from "#/subgraph/.graphclient";
import { FormInput } from "./FormInput";
import { FormSelect } from "./FormSelect";
import FormPreview, { FormRow } from "./FormPreview";
import { FormRadioButton } from "./FormRadioButton";
import { usePathname, useRouter } from "next/navigation";

const PRECISION_SCALE = 10 ** 4;

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
} & PoolSettings;

type PointSystemConfig = [BigInt, BigInt, BigInt, BigInt];

type InitializeParams = [
  Address,
  BigInt,
  BigInt,
  BigInt,
  number,
  number,
  PointSystemConfig,
];
type Metadata = [BigInt, string];
type CreatePoolParams = [Address, Address, InitializeParams, Metadata];

type FormRowTypes = {
  label: string;
  parse?: (value: any) => string;
};

type Props = {
  communityAddr: Address;
  alloAddr: Address;
  token: TokenGarden;
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

const ARB_BLOCK_TIME = 0.23;

function calculateDecay(blockTime: number, convictionGrowth: number) {
  const halfLifeInSeconds = convictionGrowth * 24 * 60 * 60;

  const result = Math.floor(
    Math.pow(10, 7) * Math.pow(1 / 2, blockTime / halfLifeInSeconds),
  );

  return result;
}

export default function PoolForm({ alloAddr, token, communityAddr }: Props) {
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
      strategyType: 0,
      pointSystemType: 0,
    },
  });

  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<FormInputs>();
  const [optionType, setOptionType] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { address } = useAccount();

  const formRowTypes: Record<string, FormRowTypes> = {
    optionType: {
      label: "Pool settings:",
      parse: (value: number) => poolSettingValues[value].label,
    },
    spendingLimit: {
      label: "Spending limit:",
    },
    minimumConviction: {
      label: "Minimum conviction:",
    },
    convictionGrowth: {
      label: "Conviction growh:",
    },
    strategyType: {
      label: "Strategy type:",
      parse: (value: string) => proposalTypes[value],
    },
    pointSystemType: {
      label: "Point system type:",
      parse: (value: string) => pointSystems[value],
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

  const walletClient = createWalletClient({
    chain: getChain(getChainIdFromPath()) as Chain,
    transport: custom(window.ethereum!),
  });

  const publicClient = createPublicClient({
    chain: getChain(getChainIdFromPath()) as Chain,
    transport: http(),
  });

  async function triggerDeployContract() {
    try {
      const hash = await walletClient.deployContract({
        abi: abiWithErrors(cvStrategyABI),
        account: address as Address,
        bytecode: cvStrategyJson.bytecode.object as Address,
        args: [alloAddr],
      });

      const transaction = await publicClient.waitForTransactionReceipt({
        hash: hash,
      });
      return transaction.contractAddress;
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  }

  const contractWrite = async (ipfsHash: string) => {
    const strategyAddr = await triggerDeployContract();
    if (strategyAddr == null) {
      console.log("error deploying cvStrategy");
      return;
    }

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
    console.log(spendingLimit, minimumConviction);

    const SPENDING_LIMIT_CONSTANT = 0.77645;

    const maxRatioNum =
      (spendingLimit / SPENDING_LIMIT_CONSTANT / 100) * 10 ** 7;
    const weightNum = (minimumConviction / 100) * (spendingLimit / 100) ** 2;
    // const convictionCalc = convictionGrowth / 24 / 60;

    // pool settings
    const maxRatio = BigInt(Math.round(maxRatioNum));
    const weight = BigInt(Math.round(weightNum * 10 ** 7));
    const decay = BigInt(
      Math.round(calculateDecay(ARB_BLOCK_TIME, convictionGrowth)),
    );

    console.log(maxRatio, weight, decay);

    // pointConfig
    const pointsPerTokenStaked = BigInt(1 * PRECISION_SCALE);
    const maxAmount = BigInt(100 * PRECISION_SCALE);
    const pointsPerMember = BigInt(100 * PRECISION_SCALE);
    const tokensPerPoint = BigInt(
      ((1 * 10 ** token?.decimals) as number).toString(),
    );

    console.log(
      pointsPerTokenStaked,
      maxAmount,
      pointsPerMember,
      tokensPerPoint,
    );

    const metadata: Metadata = [BigInt(1), ipfsHash];

    const pointConfig: PointSystemConfig = [
      pointsPerTokenStaked,
      maxAmount,
      pointsPerMember,
      tokensPerPoint,
    ];

    const params: InitializeParams = [
      communityAddr,
      decay,
      maxRatio,
      weight,
      previewData?.strategyType as number, // proposalType
      previewData?.pointSystemType as number, // pointSystem
      pointConfig,
    ];

    const args: CreatePoolParams = [
      strategyAddr,
      token.id as Address,
      params,
      metadata,
    ];

    write({ args: args });
  };

  const { write, error, isError, data } = useContractWrite({
    address: communityAddr,
    abi: abiWithErrors(registryCommunityABI),
    functionName: "createPool",
    onSuccess: () =>
      router.push(pathname.replace(`/${communityAddr}/create-pool`, "")),
    onError: () => alert("Something went wrong creating a pool"),
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
      optionType: previewData.optionType as number,
      spendingLimit: previewData.spendingLimit as number,
      minimumConviction: previewData.minimumConviction as number,
      convictionGrowth: previewData.convictionGrowth as number,
    };

    Object.entries(reorderedData).forEach(([key, value]) => {
      const formRow = formRowTypes[key];
      if (formRow) {
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
            <div className="mb-6 flex flex-col">
              <div className="flex flex-col">
                <FormInput
                  label="Spending limit"
                  register={register}
                  required
                  errors={errors}
                  registerKey="spendingLimit"
                  type="number"
                  placeholder="20%"
                  readOnly={optionType !== 0}
                ></FormInput>
              </div>
              <div className="flex flex-col">
                <FormInput
                  label="Minimum conviction"
                  register={register}
                  required
                  errors={errors}
                  registerKey="minimumConviction"
                  type="number"
                  placeholder="10%"
                  readOnly={optionType !== 0}
                ></FormInput>
              </div>
              <div className="flex flex-col">
                <FormInput
                  label="Conviction growth (in days)"
                  register={register}
                  required
                  errors={errors}
                  registerKey="convictionGrowth"
                  type="number"
                  placeholder="10 days"
                  readOnly={optionType !== 0}
                ></FormInput>
              </div>
            </div>
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
            <FormSelect
              label="Point system type"
              register={register}
              errors={errors}
              registerKey="pointSystemType"
              options={Object.entries(pointSystems).map(([value, text]) => ({
                label: text,
                value: value,
              }))}
            ></FormSelect>
          </div>
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

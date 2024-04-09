"use client";
import React, { useEffect, useState } from "react";
import { PreviewDataRow } from "./PreviewDataRow";
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
  parseEther,
} from "viem";
import { Button } from "@/components/Button";
import { ipfsJsonUpload } from "@/utils/ipfsUtils";
import {
  useAccount,
  useConfig,
  useContractWrite,
  useWaitForTransaction,
} from "wagmi";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { alloABI, cvStrategyABI, registryCommunityABI } from "@/src/generated";
import { pointSystems, proposalTypes } from "@/types";
import { localhost } from "viem/chains";
import cvStrategyJson from "../../../../pkg/contracts/out/CVStrategy.sol/CVStrategy.json" assert { type: "json" };
import "viem/window";
import { chains } from "@/configs/wagmiConfig";
import { getChainIdFromPath } from "@/utils/path";
import { getChain } from "@/configs/chainServer";

const PRECISION_SCALE = 10 ** 4;

type PoolSettings = {
  spendingLimit?: number;
  minimumConviction?: number;
  convictionGrowth?: number;
};

type FormProps = {
  strategyType: number;
  pointSystemType: number;
  poolSettings: string;
};

type FormInputs = FormProps &
  PoolSettings & {
    name: string;
    description: string;
  };

type FormData = FormProps & {
  metadata: [bigint, string]; // [protocol: bigint, pointer: string]
};

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

const inputClassname = "input input-bordered input-info w-full max-w-[420px]";
const labelClassname = "mb-2 text-xs text-secondary";

type Props = {
  communityAddr: Address;
  communityName: string;
  alloAddr: Address;
  tokenAddr: Address;
};

const pointConfigValues: Record<string, PoolSettings> = {
  1: { spendingLimit: 25, minimumConviction: 10, convictionGrowth: 10 }, //recommended
  2: { spendingLimit: 20, minimumConviction: 2.5, convictionGrowth: 2 }, //1Hive
  3: { spendingLimit: 25, minimumConviction: 10, convictionGrowth: 0.0005 }, //Testing
};

const ARB_BLOCK_TIME = 0.3;

function calculateDecay(blockTime: number, convictionGrowth: number) {
  const halfLifeInSeconds = convictionGrowth * 24 * 60 * 60;

  const result = Math.floor(
    Math.pow(10, 7) * Math.pow(1 / 2, blockTime / halfLifeInSeconds),
  );

  return result;
}

export default function PoolForm({
  alloAddr,
  communityName,
  tokenAddr,
  communityAddr,
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
      poolSettings: "1",
      strategyType: 0,
      pointSystemType: 0,
    },
  });

  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<any>(null); // preview data
  const [ipfsMetadataHash, setIpfsMetadataHash] = useState<string | null>(null); // ipfs metadata hash
  // const [formData, setFormData] = useState<FormData | undefined>(undefined); // args for contract write
  const [showCustomInputs, setShowCustomInputs] = useState(false);
  const { address, connector } = useAccount();

  const radioButtonValue = watch("poolSettings");

  useEffect(() => {
    if (radioButtonValue === "0") {
      setShowCustomInputs(true);
    } else {
      setShowCustomInputs(false);
    }
  }, [radioButtonValue]);

  const handleJsonUpload = () => {
    const json = {
      title: getValues("name"),
      description: getValues("description"),
    };

    const ipfsUpload = ipfsJsonUpload(json);

    toast
      .promise(ipfsUpload, {
        pending: "Uploading to IPFS...",
        success: "Successfully uploaded!",
        error: "Something went wrong",
      })
      .then((data) => {
        console.log("https://ipfs.io/ipfs/" + data);
        setIpfsMetadataHash(data as string);
      })
      .catch((error: any) => {
        console.error(error);
      });
  };

  const handlePreview = () => {
    handleJsonUpload();

    const data: FormInputs = {
      name: getValues("name"),
      description: getValues("description"),
      poolSettings: getValues("poolSettings"),
      strategyType: getValues("strategyType"),
      pointSystemType: getValues("pointSystemType"),
    };

    setPreviewData(data);
    setIsEditMode(true);
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
  }

  const createPool = async (data: FormInputs) => {
    if (!ipfsMetadataHash) {
      console.log("wait for files upload to complete");
      return;
    }

    const strategyAddr = await triggerDeployContract();
    if (strategyAddr == null) {
      console.log("error deploying cvStrategy");
      return;
    }

    let spendingLimit: number;
    let minimumConviction;
    let convictionGrowth;

    if (data.poolSettings === "0") {
      spendingLimit = data.spendingLimit as number;
      minimumConviction = data.minimumConviction as number;
      convictionGrowth = data.convictionGrowth as number;
    } else {
      spendingLimit = pointConfigValues[data.poolSettings]
        .spendingLimit as number;
      minimumConviction = pointConfigValues[data.poolSettings]
        .minimumConviction as number;
      convictionGrowth = pointConfigValues[data.poolSettings]
        .convictionGrowth as number;
    }

    // pool settings 1Hive
    const maxRatio = BigInt(spendingLimit * PRECISION_SCALE);
    const weight = BigInt(minimumConviction * spendingLimit ** 2);
    const decay = BigInt(calculateDecay(ARB_BLOCK_TIME, convictionGrowth));

    // pointConfig
    const pointsPerTokenStaked = BigInt(5 * PRECISION_SCALE);
    const maxAmount = BigInt(200 * PRECISION_SCALE);
    const pointsPerMember = BigInt(100 * PRECISION_SCALE);
    const tokensPerPoint = parseEther((1).toString());

    const metadata: Metadata = [BigInt(1), ipfsMetadataHash];

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
      data.strategyType, // proposalType
      data.pointSystemType, // pointSystem
      pointConfig,
    ];

    const args: CreatePoolParams = [strategyAddr, tokenAddr, params, metadata];

    write({ args: args });
  };

  const { write, error, isError, data } = useContractWrite({
    address: communityAddr,
    abi: abiWithErrors(registryCommunityABI),
    functionName: "createPool",
    onSuccess: () => alert("Pool created successfully"),
  });

  return (
    <div className="mx-auto flex max-w-[820px] flex-col items-center justify-center gap-4">
      <div className="text-center sm:mt-5">
        <h2 className="text-xl font-semibold leading-6 text-gray-900">
          Create a Pool in {communityName} community
        </h2>
        <div className="mt-1">
          <p className="text-sm">subtitle for pool form creation...</p>
        </div>
      </div>
      <form onSubmit={handleSubmit(createPool)} className="w-full">
        {!isEditMode ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col">
              <label htmlFor="name" className={labelClassname}>
                Pool Name
              </label>
              <input
                type="text"
                placeholder="Your pool name..."
                className={inputClassname}
                {...register("name", {
                  required: true,
                })}
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="councilSafe" className={labelClassname}>
                Descrition
              </label>
              <textarea
                className="textarea textarea-info line-clamp-5 w-full max-w-[620px]"
                placeholder="Enter a description of your pool..."
                rows={7}
                {...register("description", {
                  required: true,
                })}
              ></textarea>
            </div>
            <div className="flex flex-col">
              <label htmlFor="poolSettings" className={labelClassname}>
                Select pool settings
              </label>
              <div className="flex gap-8">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      {...register("poolSettings", { required: true })}
                      type="radio"
                      value="0"
                      className="radio"
                      name="poolSettings"
                    />
                    <h4 className="text-md font-bold">Custom</h4>
                  </div>
                  <p className="text-sm">If you know what you are doing</p>
                </div>

                <div className="flex flex-col gap-2 ">
                  <div className="flex items-center gap-2">
                    <input
                      {...register("poolSettings", { required: true })}
                      type="radio"
                      value="1"
                      className="radio"
                      name="poolSettings"
                    />
                    <h4 className="text-md font-bold">Recommended</h4>
                  </div>
                  <p className="text-sm">Recommended default settings</p>
                </div>
                <div className="flex flex-col gap-2 ">
                  <div className="flex items-center gap-2">
                    <input
                      {...register("poolSettings", { required: true })}
                      type="radio"
                      value="2"
                      className="radio"
                      name="poolSettings"
                    />
                    <h4 className="text-md font-bold">1Hive</h4>
                  </div>
                  <p className="text-sm">1Hive original settings</p>
                </div>
                <div className="flex flex-col gap-2 ">
                  <div className="flex items-center gap-2">
                    <input
                      {...register("poolSettings", { required: true })}
                      type="radio"
                      value="3"
                      className="radio"
                      name="poolSettings"
                    />
                    <h4 className="text-md font-bold">Testing</h4>
                  </div>
                  <p className="text-sm">Conviction grows very fast</p>
                </div>
              </div>
              {showCustomInputs && (
                <div className="mb-6 flex flex-col gap-2">
                  <div className="flex flex-col">
                    <label htmlFor="spendingLimit" className={labelClassname}>
                      Spending limit
                    </label>
                    <input
                      type="number"
                      placeholder="25"
                      className={inputClassname}
                      {...register("spendingLimit", {
                        required: true,
                      })}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label
                      htmlFor="minimumConviction"
                      className={labelClassname}
                    >
                      Minimum conviction
                    </label>
                    <input
                      type="number"
                      placeholder="10"
                      className={inputClassname}
                      {...register("minimumConviction", {
                        required: true,
                      })}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label
                      htmlFor="convictionGrowth"
                      className={labelClassname}
                    >
                      Conviction growth
                    </label>
                    <input
                      type="number"
                      placeholder="10"
                      className={inputClassname}
                      {...register("convictionGrowth", {
                        required: true,
                      })}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <label htmlFor="strategyType" className={labelClassname}>
                Strategy type
              </label>
              <select
                className="select select-accent w-full max-w-[420px]"
                {...register("strategyType", { required: true })}
              >
                {Object.entries(proposalTypes)
                  .slice(0, -1)
                  .map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label htmlFor="pointSystemType" className={labelClassname}>
                Point system type
              </label>
              <select
                className="select select-accent w-full max-w-[420px]  "
                {...register("pointSystemType", { required: true })}
              >
                {Object.entries(pointSystems).map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <Overview data={previewData} />
        )}

        <div className="mt-8 flex w-full items-center justify-center py-6">
          {!isEditMode ? (
            <Button type="button" onClick={handlePreview} variant="fill">
              Preview
            </Button>
          ) : (
            <div className="flex items-center gap-10">
              <Button type="submit">Submit</Button>
              <Button
                type="button"
                onClick={() => setIsEditMode(false)}
                variant="fill"
              >
                Edit
              </Button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

const Overview = (data: any) => {
  const { name, description, strategyType, pointSystemType, poolSettings } =
    data.data;

  return (
    <>
      <div className="px-4 sm:px-0">
        <p className="mt-0 max-w-2xl text-sm leading-6 text-gray-500">
          Check details and covenant description
        </p>
      </div>
      <div>
        {data && (
          <div className="relative">
            <PreviewDataRow label="Pool name" data={name} />
            <PreviewDataRow label="Settings options" data={poolSettings} />
            <PreviewDataRow
              label="Strategy type"
              data={proposalTypes[strategyType]}
            />
            <PreviewDataRow
              label="Point system type"
              data={pointSystems[pointSystemType]}
            />
            <h3 className="text-sm font-medium leading-6 text-gray-900">
              Description
            </h3>
            <p className="text-md max-h-56 overflow-y-auto rounded-xl border p-2 leading-7">
              {description}
            </p>
          </div>
        )}
      </div>
    </>
  );
};

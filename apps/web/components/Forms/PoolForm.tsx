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
import { ipfsJsonUpload } from "@/utils/ipfsUpload";
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

type FormProps = {
  strategyType: number;
  pointSystemType: number;
  poolSettings: string;
};

type FormInputs = FormProps & {
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
  const [txHash, setTxHash] = useState<Address>();
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<any>(null); // preview data
  const [ipfsMetadataHash, setIpfsMetadataHash] = useState<string | null>(null); // ipfs metadata hash
  const [formData, setFormData] = useState<FormData | undefined>(undefined); // args for contract write
  const { address, connector } = useAccount();

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

  // const config = useConfig();
  // console.log(config);

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
    // pointConfig
    const pointsPerTokenStaked = BigInt(1);
    const maxAmount = BigInt(200);
    const pointsPerMember = BigInt(50);
    const tokensPerPoint = BigInt(100);
    // pool settings 1Hive
    const decay = parseEther((0.9982686).toString());
    const maxRatio = parseEther((0.2575825874).toString());
    const weight = parseEther((0.001658719734).toString());

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
    console.log(args);

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
              <div className="flex gap-12">
                <div className="flex flex-col gap-2 ">
                  <div className="flex items-center gap-2">
                    <input
                      {...register("poolSettings", { required: true })}
                      type="radio"
                      value="1"
                      className="radio"
                      name="poolSettings"
                    />
                    <h4 className="text-md font-bold">Default</h4>
                  </div>
                  <p>1Hive original settings</p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      {...register("poolSettings", { required: true })}
                      type="radio"
                      value="2"
                      className="radio"
                      name="poolSettings"
                    />
                    <h4 className="text-md font-bold">Custom</h4>
                  </div>
                </div>
              </div>
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

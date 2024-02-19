"use client";
import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { FormModal } from "./FormModal";
import { alloABI } from "@/src/generated";
import { parseUnits } from "viem";
import { usePrepareContractWrite, useContractWrite } from "wagmi";
import { encodeAbiParameters, parseAbiParameters } from "viem";

import { abiWithErrors } from "@/utils/abiWithErrors";
import { Button } from "@/components";
import { ipfsJsonUpload } from "@/utils/ipfsUpload";
import { toast } from "react-toastify";

//docs link: https://react-hook-form.com/

//protocol : 1 => means ipfs!, to do some checks later

type FormInputs = {
  type: string;
  title: number;
  amount: number;
  beneficiary: string;
  description: string;
};

type PreviewDataProps = {
  [x: string]: FormInputs;
};
const ethereumAddressRegExp = /^(0x)?[0-9a-fA-F]{40}$/;

// struct of the proposal for encoding:
//     uint poolId
//     address beneficiary;
//     uint256 amountRequested;
//     address requestedToken;
//     Metadata metadata;

//address token => "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"
//token native => "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"

const abiParameters = [
  { name: "poolId", type: "uint" },
  { name: "beneficiaryAddress", type: "address" },
  { name: "requestedAmount", type: "uint" },
  { name: "requestedTokenAddress", type: "address" },
  {
    name: "metadata",
    type: "tuple",
    components: [
      { name: "pointer", type: "uint" },
      { name: "ipfsHash", type: "string" },
    ],
  },
];
const values = [
  2,
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  50000000000000000000n,
  "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9",
  [1, "QmW4zFLFJRN7J67EzNmdC2r2M9u2iJDha2fj5Gee6hJzSY"],
];
const dataFromDeploy =
  "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000000000000000000000000000002b5e3af16b1880000000000000000000000000000dc64a140aa3e981100a9beca4e685f962f0cf6c900000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000002e516d57347a464c464a524e374a3637457a4e6d64433272324d397532694a44686132666a3547656536684a7a5359000000000000000000000000000000000000";

export const ProposalForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitted },
    getValues,
    setValue,
    reset,
    watch,
  } = useForm<FormInputs>();

  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  // TODO: ADD TYPES
  const [previewData, setPreviewData] = useState<any>(null); // preview data
  const [metadataIpfs, setMetadataIpfs] = useState<string>(); // ipfs hash of proposal title and description
  const [formData, setFormData] = useState(undefined) as any; // args for contract write
  const tokenSymbol = "MTK";

  const handleJsonUpload = () => {
    const sampleJson = {
      title: getValues("title"),
      descripcion: getValues("description"),
    };

    const ipfsUpload = ipfsJsonUpload(sampleJson);

    toast
      .promise(ipfsUpload, {
        pending: "Validating Proposal Form...",
        success: "Validation Succesfull!",
        error: "Something went wrong",
      })
      .then((data) => {
        console.log("https://ipfs.io/ipfs/" + data);
        setMetadataIpfs(data);
      })
      .catch((error: any) => {
        console.error(error);
      });
  };

  const handlePreview = () => {
    handleJsonUpload();

    const data = {
      type: getValues("type"),
      title: getValues("title"),
      amount: getValues("amount"),
      beneficiary: getValues("beneficiary"),
      description: getValues("description"),
    };

    setPreviewData(data);
    setIsEditMode(true);
  };
  const { config } = usePrepareContractWrite({
    //TODO: add dynamic address
    //contract for localhost deploy
    address: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    //contract for arb sepolia
    // address: "",
    abi: abiWithErrors(alloABI),
    functionName: "registerRecipient",
    args: [1, dataFromDeploy],
    onError: (error) => {
      console.log("error", error);
    },
    onSuccess: (data) => {
      console.log(data?.result);
    },
  });

  const { write, error, isError, data } = useContractWrite(config);

  // ... (Previous code)

  // ... (Previous code)

  const handleEncodeData = (data: any) => {
    const poolId = 1;
    let proposalData;

    // Check if proposal type is not equal to "1":
    //TODO: check when it is streaming
    proposalData =
      data.type !== "1"
        ? {
            beneficiary: "0x0000000000000000000000000000000000000000",
            requestedAmount: 0,
            tokenAddress: "0x0000000000000000000000000000000000000000",
          }
        : {
            beneficiary: data.beneficiary,
            requestedAmount: parseUnits(data.amount, 18),
            tokenAddress: "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9",
          };

    const metadata = [1, metadataIpfs];

    const encodedData = encodeAbiParameters(abiParameters, [
      poolId,
      proposalData.beneficiary,
      proposalData.requestedAmount,
      proposalData.tokenAddress,
      metadata,
    ]);

    // Log the values
    console.log("poolId", poolId);
    console.log("beneficiary", proposalData.beneficiary);
    console.log("requestedAmount", proposalData.requestedAmount);
    console.log("tokenAddress", proposalData.tokenAddress);
    console.log(metadata);
    console.log("encodedData", encodedData);
  };

  const proposalType = watch("type") ?? "1";

  const handleCreateNewCommunity: SubmitHandler<FormInputs> = (data: any) => {
    // try {
    handleEncodeData(data);
    // } catch (error) {
    //   console.error("An error occurred:", error);
    // }
  };

  const inputClassname = "input input-bordered input-accent w-full";
  const labelClassname = "mb-2 text-xs text-black";

  return (
    <>
      <FormModal
        label="Create Proposal"
        title={`Create Proposal`}
        description={`Propose and request funds for pool enhancements. Share your vision and request funds for upgrades that benefit the entire community`}
      >
        <form onSubmit={handleSubmit(handleCreateNewCommunity)}>
          {!isEditMode ? (
            <div className="flex flex-col space-y-6 overflow-hidden p-1">
              <div className="flex flex-col">
                <label htmlFor="type" className={labelClassname}>
                  Select Proposal Type
                </label>
                <select
                  itemType="number"
                  className="select select-accent w-full"
                  {...register("type", { required: true })}
                >
                  <option value={"1"}>Funding</option>
                  <option value={"2"}>Suggestion</option>
                  <option value={"3"}>Streaming</option>
                </select>
              </div>

              {proposalType === "1" && (
                <>
                  <div className="relative flex flex-col">
                    <label htmlFor="stake" className={labelClassname}>
                      Requested Amount
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      className={inputClassname}
                      {...register("amount", {
                        required: true,
                      })}
                    />
                    <span className="absolute right-10 top-10 text-black">
                      {tokenSymbol}
                    </span>
                  </div>
                </>
              )}
              {(proposalType === "1" || proposalType === "3") && (
                <div className="flex flex-col">
                  <label htmlFor="beneficiary" className={labelClassname}>
                    Beneficary Address
                  </label>
                  <input
                    type="text"
                    placeholder="Add the beneficiary's address"
                    className={inputClassname}
                    {...register("beneficiary", {
                      required: true,
                      pattern: {
                        value: ethereumAddressRegExp,
                        message: "Invalid Eth Address",
                      },
                    })}
                  />
                </div>
              )}
              <div className="flex flex-col">
                <label htmlFor="title" className={labelClassname}>
                  Title
                </label>
                <input
                  type="text"
                  placeholder="Add the title of the proposal"
                  className={inputClassname}
                  {...register("title", {
                    required: true,
                  })}
                />
              </div>

              <label htmlFor="description" className={labelClassname}>
                Proposal Description
              </label>
              <textarea
                className="textarea textarea-accent line-clamp-5"
                placeholder="Add proposal description"
                rows={10}
                {...register("description", {
                  required: true,
                })}
              ></textarea>
            </div>
          ) : (
            <ProposalOverview data={previewData} />
          )}

          <div className="flex w-full items-center justify-center py-6">
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
      </FormModal>
    </>
  );
};

const ProposalOverview: React.FC<PreviewDataProps> = (data) => {
  const { type, title, amount, beneficiary, description } = data.data;

  const proposalType = {
    1: "Funding",
    2: "Signaling",
    3: "Streaming",
  } as any;

  return (
    <>
      <div className="px-4 sm:px-0">
        <p className="mt-0 max-w-2xl text-sm leading-6 text-gray-500">
          Check proposals details
        </p>
      </div>
      <div>
        {data && (
          <div className="relative">
            <PreviewData label="Strategy" data="Conviction voting" />
            <PreviewData label="Proposal Type" data={proposalType[type]} />
            {type === "1" && (
              <PreviewData label="Requested Amount" data={amount} />
            )}
            {(type === "1" || type === "3") && (
              <PreviewData label="Beneficiary" data={beneficiary} />
            )}

            <div className="divider-default divider"></div>
            <div className="mt-4 flex flex-col items-center space-y-4">
              <h4 className="text-xl font-medium leading-6 text-gray-900">
                {title}
              </h4>
              <p className="text-md max-h-56 overflow-y-auto rounded-xl p-2 text-justify leading-7">
                {description}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const PreviewData = ({ label, data }: { label: string; data: any }) => {
  return (
    <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
      <dt className="text-sm font-medium leading-6 text-gray-900">{label}</dt>
      <dd className="mt-1 text-lg leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
        {data}
      </dd>
    </div>
  );
};

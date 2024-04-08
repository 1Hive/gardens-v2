"use client";
import React, { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { FormModal } from "./FormModal";
import { alloABI } from "@/src/generated";
import { Address, parseUnits } from "viem";
import { usePrepareContractWrite, useContractWrite } from "wagmi";
import { encodeAbiParameters, isAddress } from "viem";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { Button } from "@/components";
import { ipfsJsonUpload } from "@/utils/ipfsUtils";
import { toast } from "react-toastify";
import { proposalTypes } from "@/types";
import { Allo, Maybe, TokenGarden } from "#/subgraph/.graphclient";
import { formatTokenAmount } from "@/utils/numbers";

//docs link: https://react-hook-form.com/
//protocol : 1 => means ipfs!, to do some checks later
type FormInputs = {
  title: number;
  amount: number;
  beneficiary: string;
  description: string;
};

type ProposalOverviewProps = {
  data: FormInputs;
  proposalType: number;
};
type PreviewDataProps = {
  label: string;
  data: string | number;
};

type ProposalFormProps = {
  poolId: number;
  proposalType: number;
  alloInfo: Pick<Allo, "id" | "chainId" | "tokenNative">;
  tokenGarden:
    | Maybe<
        Pick<
          TokenGarden,
          | "symbol"
          | "description"
          | "name"
          | "totalBalance"
          | "ipfsCovenant"
          | "decimals"
        >
      >
    | undefined;
  tokenAddress: Address;
  spendingLimit: number;
  spendingLimitPct: number;
  poolAmount: number;
};

const abiParameters = [
  {
    type: "tuple",
    components: [
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
    ],
  },
];

const ethereumAddressRegEx = /^(0x)?[0-9a-fA-F]{40}$/;

export const ProposalForm = ({
  poolId,
  proposalType,
  alloInfo,
  tokenGarden,
  tokenAddress,
  spendingLimit,
  spendingLimitPct,
  poolAmount,
}: ProposalFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitted },
    getValues,
    reset,
  } = useForm<FormInputs>();

  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  // TODO: ADD TYPES
  const [previewData, setPreviewData] = useState<any>(null); // preview data
  const [metadataIpfs, setMetadataIpfs] = useState<string>(); // ipfs hash of proposal title and description
  const tokenSymbol = tokenGarden?.symbol || "";

  const formatSpendingLimit = formatTokenAmount(
    spendingLimit,
    tokenGarden?.decimals as number,
  );

  const checksRequestedAmount =
    Number(getValues("amount")) < Number(formatSpendingLimit);

  const proposalName = proposalTypes[proposalType];

  const handleJsonUpload = () => {
    const sampleJson = {
      title: getValues("title"),
      description: getValues("description"),
    };

    const ipfsUpload = ipfsJsonUpload(sampleJson);

    toast
      .promise(ipfsUpload, {
        pending: "Uploading data, wait a moment...",
        success: "All ready!",
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
      title: getValues("title"),
      amount: getValues("amount"),
      beneficiary: getValues("beneficiary"),
      description: getValues("description"),
    };

    setPreviewData(data);
    setIsEditMode(true);
  };

  const { write, error, isError, data } = useContractWrite({
    address: alloInfo.id as Address,
    abi: abiWithErrors(alloABI),
    functionName: "registerRecipient",
    onError: (error) => {
      console.log("error", error);
    },
    onSuccess: (data) => {
      console.log(data);
    },
  });

  const getEncodeData = (data: FormInputs) => {
    const metadata = [1, metadataIpfs as string];

    const requestedAmount = parseUnits(
      data.amount.toString(),
      tokenGarden?.decimals as number,
    );

    const encodedData = encodeAbiParameters(abiParameters, [
      [poolId, data.beneficiary, requestedAmount, tokenAddress, metadata],
    ]);

    console.log(
      poolId,
      data.beneficiary,
      requestedAmount,
      tokenAddress,
      metadata,
    );

    return encodedData;
  };

  const createProposal = (data: FormInputs) => {
    const encodedData = getEncodeData(data);
    write({ args: [poolId, encodedData] });
  };

  const inputClassname = "input input-bordered input-accent w-full";
  const labelClassname = "mb-2 text-xs text-black";

  return (
    <FormModal
      label="Create proposal"
      title={`Create ${proposalName} proposal`}
      description={`Propose and Share your vision for requesting funds that benefit the entire community`}
    >
      <form onSubmit={handleSubmit(createProposal)}>
        {!isEditMode ? (
          <div className="flex flex-col space-y-6 overflow-hidden p-1">
            {proposalName === "funding" && (
              <>
                <div className="relative flex flex-col">
                  <label htmlFor="amount" className={labelClassname}>
                    Requested amount ( Limited to {spendingLimitPct}% of Pool
                    Funds )
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
                {errors.amount?.type === "required" && (
                  <p role="alert">Amount required</p>
                )}
              </>
            )}
            {proposalName !== "signaling" && (
              <div className="flex flex-col">
                <label htmlFor="beneficiary" className={labelClassname}>
                  Beneficary address
                </label>
                <input
                  type="text"
                  placeholder="Add the beneficiary's address"
                  className={inputClassname}
                  {...register("beneficiary", {
                    required: true,
                    pattern: {
                      value: ethereumAddressRegEx,
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
              Proposal description
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
          <ProposalOverview data={previewData} proposalType={proposalType} />
        )}

        <div className="flex w-full items-center justify-center py-6">
          {!isEditMode ? (
            <Button type="button" onClick={handlePreview} variant="fill">
              Preview
            </Button>
          ) : (
            <div className="flex items-center gap-10">
              <Button
                type="submit"
                disabled={!checksRequestedAmount}
                tooltip="Request amount exceeds pool spending limit"
              >
                Submit
              </Button>
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
  );
};

const ProposalOverview = ({ data, proposalType }: ProposalOverviewProps) => {
  const { title, amount, beneficiary, description } = data;
  const proposalName = proposalTypes[proposalType];

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
            <PreviewData label="Proposal Type" data={proposalName} />
            {proposalName === "funding" && (
              <PreviewData label="Requested Amount" data={amount} />
            )}
            {(proposalName === "funding" || proposalName === "streaming") && (
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

const PreviewData = ({ label, data }: PreviewDataProps) => {
  return (
    <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
      <dt className="text-sm font-medium leading-6 text-gray-900">{label}</dt>
      <dd className="mt-1 text-lg leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
        {data}
      </dd>
    </div>
  );
};

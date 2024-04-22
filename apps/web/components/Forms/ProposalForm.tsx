"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { alloABI } from "@/src/generated";
import { Address, parseUnits } from "viem";
import { useContractWrite } from "wagmi";
import { encodeAbiParameters } from "viem";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { Button } from "@/components";
import { ipfsJsonUpload } from "@/utils/ipfsUtils";
import { toast } from "react-toastify";
import { proposalTypes } from "@/types";
import { Allo, Maybe, TokenGarden } from "#/subgraph/.graphclient";
import { formatTokenAmount } from "@/utils/numbers";
import FormPreview, { FormRow } from "./FormPreview";
import { FormInput } from "./FormInput";
import { usePathname, useRouter } from "next/navigation";

//protocol : 1 => means ipfs!, to do some checks later
type FormInputs = {
  title: string;
  amount: number;
  beneficiary: string;
  description: string;
};

type ProposalFormProps = {
  poolId: number;
  proposalType: number;
  alloInfo: Pick<Allo, "id" | "chainId" | "tokenNative">;
  tokenGarden: TokenGarden;
  tokenAddress: Address;
  spendingLimit: number;
  spendingLimitPct: number;
  poolAmount: number;
};

type FormRowTypes = {
  label: string;
  parse?: (value: any) => string;
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
const MIN_VALUE = 0.000000000001;

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
    formState: { errors },
    getValues,
  } = useForm<FormInputs>();

  const formRowTypes: Record<string, FormRowTypes> = {
    amount: {
      label: "Requested amount:",
      parse: (value: number) => `${value} ${tokenGarden.symbol}`,
    },
    beneficiary: {
      label: "Beneficiary:",
    },
    proposalType: {
      label: "Proposal Type:",
    },
    strategy: { label: "Strategy:" },
  };

  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<FormInputs>();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const tokenSymbol = tokenGarden?.symbol || "";

  const spendingLimitNumber = Math.round(
    spendingLimit / 10 ** tokenGarden?.decimals,
  );

  const spendingLimitString = formatTokenAmount(
    spendingLimit,
    tokenGarden?.decimals as number,
  );

  const proposalTypeName = proposalTypes[proposalType];

  const createProposal = () => {
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
        const encodedData = getEncodeData(ipfsHash);
        write({ args: [poolId, encodedData] });
      })
      .catch((error: any) => {
        setLoading(false);
        console.error(error);
      });
  };

  const handlePreview = (data: FormInputs) => {
    setPreviewData(data);
    setShowPreview(true);
  };

  const { write, error, isError, data } = useContractWrite({
    address: alloInfo.id as Address,
    abi: abiWithErrors(alloABI),
    functionName: "registerRecipient",
    onSuccess: () => router.push(pathname.replace(`/create-proposal`, "")),
    onError: () => alert("Something went wrong creating Proposal"),
    onSettled: () => setLoading(false),
  });

  const getEncodeData = (metadataIpfs: string) => {
    if (previewData === undefined) throw new Error("no preview data");

    const metadata = [1, metadataIpfs as string];

    const strAmount = previewData.amount?.toString() || "";
    const requestedAmount = parseUnits(
      strAmount,
      tokenGarden?.decimals as number,
    );

    console.log([
      poolId,
      previewData.beneficiary,
      requestedAmount,
      tokenAddress,
      metadata,
    ]);
    const encodedData = encodeAbiParameters(abiParameters, [
      [
        poolId,
        previewData?.beneficiary ||
          "0x0000000000000000000000000000000000000000",
        requestedAmount,
        tokenAddress,
        metadata,
      ],
    ]);

    console.log(
      poolId,
      previewData.beneficiary,
      requestedAmount,
      tokenAddress,
      metadata,
    );

    return encodedData;
  };

  const formatFormRows = () => {
    if (!previewData) return [];
    let formattedRows: FormRow[] = [];

    Object.entries(previewData).forEach(([key, value]) => {
      const formRow = formRowTypes[key];
      if (formRow) {
        const parsedValue = formRow.parse ? formRow.parse(value) : value;
        formattedRows.push({
          label: formRow.label,
          data: parsedValue,
        });
      }
    });

    formattedRows.push({
      label: formRowTypes["strategy"].label,
      data: "Conviction voting",
    });
    formattedRows.push({
      label: formRowTypes["proposalType"].label,
      data: proposalTypeName,
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
          previewTitle="Check proposals details"
        />
      ) : (
        <div className="flex flex-col gap-2 overflow-hidden p-1">
          {proposalTypeName === "funding" && (
            <div className="relative flex flex-col">
              <FormInput
                label="Requested amount"
                subLabel={`Max ${spendingLimitString} ${tokenSymbol} (${spendingLimitPct}% of Pool Funds)`}
                register={register}
                required
                registerOptions={{
                  max: {
                    value: spendingLimitNumber,
                    message: `Max amount cannot exceed ${spendingLimitString} ${tokenSymbol}`,
                  },
                  min: {
                    value: MIN_VALUE,
                    message: "Amount must be greater than 0",
                  },
                }}
                otherProps={{ step: MIN_VALUE }}
                errors={errors}
                className="pr-14"
                registerKey="amount"
                type="number"
                placeholder="0"
              >
                <span className="absolute right-4 top-4 text-black">
                  {tokenSymbol}
                </span>
              </FormInput>
            </div>
          )}
          {proposalTypeName !== "signaling" && (
            <div className="flex flex-col">
              <FormInput
                label="Beneficary address"
                register={register}
                registerOptions={{
                  pattern: {
                    value: ethereumAddressRegEx,
                    message: "Invalid Eth Address",
                  },
                }}
                required
                errors={errors}
                registerKey="beneficiary"
                type="text"
                placeholder="0x000..."
              ></FormInput>
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
            ></FormInput>
          </div>
          <div className="flex flex-col">
            <FormInput
              label="Proposal description"
              register={register}
              required
              errors={errors}
              registerKey="description"
              type="textarea"
              rows={10}
              placeholder="Proposal description"
            ></FormInput>
          </div>
        </div>
      )}
      <div className="flex w-full items-center justify-center py-6">
        {showPreview ? (
          <div className="flex items-center gap-10">
            <Button
              type="button"
              onClick={() => createProposal()}
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
};

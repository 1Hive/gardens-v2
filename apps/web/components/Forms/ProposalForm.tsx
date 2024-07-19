"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Address, encodeAbiParameters, parseUnits } from "viem";
import { Allo, TokenGarden } from "#/subgraph/.graphclient";
import { FormInput } from "./FormInput";
import { FormPreview, FormRow } from "./FormPreview";
import { Button } from "@/components";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { alloABI } from "@/src/generated";
import { poolTypes } from "@/types";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { ipfsJsonUpload } from "@/utils/ipfsUtils";
import { formatTokenAmount } from "@/utils/numbers";

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
  tokenGarden: Pick<TokenGarden, "symbol" | "decimals">;
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

export const ProposalForm = ({
  poolId,
  proposalType,
  alloInfo,
  tokenGarden,
  tokenAddress,
  spendingLimit,
  spendingLimitPct,
}: ProposalFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<FormInputs>();

  const { publish } = usePubSubContext();

  const chainId = alloInfo.chainId;

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

  const INPUT_TOKEN_MIN_VALUE = 1 / 10 ** tokenGarden.decimals;

  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<FormInputs>();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const tokenSymbol = tokenGarden.symbol || "";

  const spendingLimitNumber = spendingLimit / 10 ** tokenGarden.decimals;

  // console.log("spendingLimit:               %s", spendingLimit);
  // console.log("spendingLimitNumber:         %s", spendingLimitNumber);
  // console.log("spendingLimitPct:            %s", spendingLimitPct);

  const spendingLimitString = formatTokenAmount(
    spendingLimit,
    tokenGarden?.decimals as number,
  );

  const proposalTypeName = poolTypes[proposalType];

  const createProposal = async () => {
    setLoading(true);
    const json = {
      title: getValues("title"),
      description: getValues("description"),
    };

    const ipfsHash = await ipfsJsonUpload(json);
    if (ipfsHash) {
      if (previewData === undefined) {
        throw new Error("No preview data");
      }
      const encodedData = getEncodeData(ipfsHash);
      write({ args: [poolId, encodedData] });
    }
    setLoading(false);
  };

  const handlePreview = (data: FormInputs) => {
    setPreviewData(data);
    setShowPreview(true);
  };

  const { write } = useContractWriteWithConfirmations({
    address: alloInfo.id as Address,
    abi: abiWithErrors(alloABI),
    contractName: "Allo",
    functionName: "registerRecipient",
    fallbackErrorMessage: "Problem creating Proposal. Please try again.",
    onConfirmations: () => {
      publish({
        topic: "proposal",
        type: "update",
        function: "registerRecipient",
        chainId,
      });
      if (pathname) {
        router.push(pathname.replace("/create-proposal", ""));
      }
    },
    onSettled: () => setLoading(false),
  });

  const getEncodeData = (metadataIpfs: string) => {
    if (previewData === undefined) {
      throw new Error("no preview data");
    }

    const metadata = [1, metadataIpfs as string];

    const strAmount = previewData.amount?.toString() || "";
    const requestedAmount = parseUnits(
      strAmount,
      tokenGarden?.decimals as number,
    );

    console.debug([
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

    console.debug(
      poolId,
      previewData.beneficiary,
      requestedAmount,
      tokenAddress,
      metadata,
    );

    return encodedData;
  };

  const formatFormRows = () => {
    if (!previewData) {
      return [];
    }
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
      label: formRowTypes.strategy.label,
      data: "Conviction voting",
    });
    formattedRows.push({
      label: formRowTypes.proposalType.label,
      data: proposalTypeName,
    });

    return formattedRows;
  };
  return (
    <form onSubmit={handleSubmit(handlePreview)} className="w-full">
      {showPreview ?
        <FormPreview
          title={previewData?.title ?? ""}
          description={previewData?.description ?? ""}
          formRows={formatFormRows()}
          previewTitle="Check proposals details"
        />
        : <div className="flex flex-col gap-2 overflow-hidden p-1">
          {proposalTypeName === "funding" && (
            <div className="relative flex flex-col">
              <FormInput
                label="Requested amount"
                subLabel={`Max ${spendingLimitString} ${tokenSymbol} (${spendingLimitPct.toFixed(2)}% of Pool Funds)`}
                register={register}
                required
                registerOptions={{
                  max: {
                    value: spendingLimitNumber,
                    message: `Max amount cannot exceed ${spendingLimitString} ${tokenSymbol}`,
                  },
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
            />
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
            />
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
              Edit
            </Button>
            <Button onClick={() => createProposal()} isLoading={loading}>
              Submit
            </Button>
          </div>
          : <Button type="submit">Preview</Button>}
      </div>
    </form>
  );
};

"use client";

import React, { useState, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Address, encodeAbiParameters, parseUnits } from "viem";
import { useToken } from "wagmi";
import {
  Allo,
  ArbitrableConfig,
  CVStrategy,
  TokenGarden,
} from "#/subgraph/.graphclient";
import { FormInput } from "./FormInput";
import { FormPreview, FormRow } from "./FormPreview";
import { LoadingSpinner } from "../LoadingSpinner";
import { FormAddressInput } from "./FormAddressInput";
import { WalletBalance } from "../WalletBalance";
import { Button, EthAddress } from "@/components";
import { QUERY_PARAMS } from "@/constants/query-params";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { alloABI } from "@/src/generated";
import { PoolTypes } from "@/types";
import { abiWithErrors } from "@/utils/abi";
import { getEventFromReceipt } from "@/utils/contracts";
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
  strategy: Pick<CVStrategy, "id" | "token">;
  arbitrableConfig: Pick<ArbitrableConfig, "submitterCollateralAmount">;
  poolId: number;
  proposalType: number;
  alloInfo: Pick<Allo, "id" | "chainId" | "tokenNative">;
  tokenGarden: Pick<TokenGarden, "symbol" | "decimals">;
  spendingLimit: number;
  spendingLimitPct: number;
  poolAmount: number;
};

type FormRowTypes = {
  label: string;
  parse?: (value: any) => React.ReactNode;
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

function formatNumber(num: string | number): string {
  if (num == 0) {
    return "0";
  }
  // Convert to number if it's a string
  const number = typeof num === "string" ? parseFloat(num) : num;

  // Check if the number is NaN
  if (isNaN(number)) {
    return "Invalid Number";
  }

  // If the absolute value is greater than or equal to 1, use toFixed(2)
  if (Math.abs(number) >= 1) {
    return number.toFixed(2);
  }

  // For numbers between 0 and 1 (exclusive)
  const parts = number.toString().split("e");
  const exponent = parts[1] ? parseInt(parts[1]) : 0;

  if (exponent < -3) {
    // For very small numbers, use exponential notation with 4 significant digits
    return number.toPrecision(4);
  } else {
    // For numbers between 0.001 and 1, show at least 4 decimal places
    const decimalPlaces = Math.max(
      4,
      -Math.floor(Math.log10(Math.abs(number))) + 3,
    );
    return number.toFixed(decimalPlaces);
  }
}

export const ProposalForm = ({
  strategy,
  arbitrableConfig,
  poolId,
  proposalType,
  alloInfo,
  tokenGarden,
  spendingLimit,
  spendingLimitPct,
}: ProposalFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
    watch,
  } = useForm<FormInputs>();

  const { publish } = usePubSubContext();

  const chainId = alloInfo.chainId;
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
  const [loading, setLoading] = useState(false);
  const [isEnoughBalance, setIsEnoughBalance] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const disableSubmitBtn = useMemo<ConditionObject[]>(
    () => [
      {
        condition: !isEnoughBalance,
        message: "Insufficient balance",
      },
    ],
    [isEnoughBalance],
  );
  const { isConnected, missmatchUrl, tooltipMessage } =
    useDisableButtons(disableSubmitBtn);

  const spendingLimitString = formatTokenAmount(
    spendingLimit,
    +tokenGarden?.decimals,
    6,
  );

  const proposalTypeName = PoolTypes[proposalType];

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

      write({ args: [BigInt(poolId), encodedData] });
    }
    setLoading(false);
  };

  const handlePreview = (data: FormInputs) => {
    setPreviewData(data);
    setShowPreview(true);
  };

  const { write } = useContractWriteWithConfirmations({
    address: alloInfo.id as Address,
    abi: alloABI,
    contractName: "Allo",
    functionName: "registerRecipient",
    fallbackErrorMessage: "Error creating Proposal, please report a bug.",
    value: arbitrableConfig.submitterCollateralAmount,
    onConfirmations: (receipt) => {
      const proposalId = getEventFromReceipt(
        receipt,
        "CVStrategy",
        "ProposalCreated",
      ).args.proposalId;
      publish({
        topic: "proposal",
        type: "update",
        function: "registerRecipient",
        containerId: poolId,
        id: proposalId.toString(), // proposalId is a bigint
        chainId,
      });
      setLoading(false);
      if (pathname) {
        const newPath = pathname.replace(
          "/create-proposal",
          `?${QUERY_PARAMS.poolPage.newProposal}=${proposalId}`,
        );
        router.push(newPath);
      }
    },
  });

  const poolTokenAddr = strategy?.token as Address;
  const { data: poolToken } = useToken({
    address: poolTokenAddr,
    enabled: !!poolTokenAddr && PoolTypes[proposalType] === "funding",
    chainId,
  });

  const INPUT_TOKEN_MIN_VALUE = 1 / 10 ** (poolToken?.decimals ?? 0);
  const spendingLimitNumber = spendingLimit / 10 ** (poolToken?.decimals ?? 0);

  if (!poolToken && PoolTypes[proposalType] === "funding") {
    return (
      <div className="m-40">
        <LoadingSpinner />
      </div>
    );
  }

  const getEncodeData = (metadataIpfs: string) => {
    if (previewData === undefined) {
      throw new Error("no preview data");
    }

    const metadata = [1, metadataIpfs as string];

    const strAmount = previewData.amount?.toString() || "";
    const requestedAmount = parseUnits(
      strAmount,
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      poolToken?.decimals || 0,
    );

    console.debug([
      poolId,
      previewData.beneficiary,
      requestedAmount,
      poolTokenAddr,
      metadata,
    ]);

    const encodedData = encodeAbiParameters(abiParameters, [
      [
        poolId,
        previewData?.beneficiary ||
          "0x0000000000000000000000000000000000000000",
        requestedAmount,
        poolTokenAddr,
        metadata,
      ],
    ]);

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
        />
      : <div className="flex flex-col gap-2 overflow-hidden p-1">
          {proposalTypeName === "funding" && (
            <div className="relative flex flex-col">
              <FormInput
                label="Requested amount"
                subLabel={`Max ${formatNumber(spendingLimitString)} ${poolToken?.symbol} (${spendingLimitPct.toFixed(2)}% of Pool Funds)`}
                register={register}
                required
                registerOptions={{
                  max: {
                    value: spendingLimitNumber,
                    message: `Max amount must remain under the spending limit of ${formatNumber(spendingLimitString)} ${poolToken?.symbol}`,
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
                suffix={poolToken?.symbol}
              />
            </div>
          )}
          {proposalTypeName !== "signaling" && (
            <div className="flex flex-col">
              <FormAddressInput
                label="Beneficiary address"
                value={beneficiary}
                onChange={(e) => {
                  setValue("beneficiary", e.target.value);
                }}
                required
                errors={errors}
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
              onChange={(e) => {
                setValue("description", e.target.value);
              }}
              value={getValues("description")}
              type="markdown"
              rows={10}
              placeholder="Proposal description"
            />
          </div>
        </div>
      }
      <div className="flex w-full items-center justify-between py-6 flex-wrap">
        <div>
          {arbitrableConfig && (
            <WalletBalance
              askedAmount={arbitrableConfig.submitterCollateralAmount}
              label="Collateral deposit"
              setIsEnoughBalance={setIsEnoughBalance}
              token="native"
              tooltip="A stake is required as collateral for proposal submission and is returned upon execution or cancellation, except in the case of disputed and found to be in violation of the Covenant by the Tribunal, where it is forfeited."
            />
          )}
        </div>
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
              onClick={() => createProposal()}
              isLoading={loading}
              disabled={!isEnoughBalance || !isConnected || missmatchUrl}
              tooltip={tooltipMessage}
            >
              Submit
            </Button>
          </div>
        : <Button type="submit">Preview</Button>}
      </div>
    </form>
  );
};

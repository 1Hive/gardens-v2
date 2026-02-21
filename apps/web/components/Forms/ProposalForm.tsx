"use client";

import React, { useEffect, useState, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Address, encodeAbiParameters, parseUnits } from "viem";
import { useAccount, useContractRead, useToken } from "wagmi";
import {
  Allo,
  ArbitrableConfig,
  CVStrategy,
  CVStrategyConfig,
  Maybe,
  MemberCommunity,
  TokenGarden,
} from "#/subgraph/.graphclient";
import { FormAddressInput } from "./FormAddressInput";
import { FormInput } from "./FormInput";
import { FormPreview, FormRow } from "./FormPreview";
import { LoadingSpinner } from "../LoadingSpinner";
import { calculateConvictionGrowthInSeconds } from "../PoolHeader";
import { WalletBalance } from "../WalletBalance";
import { Button, EthAddress, InfoBox, InfoWrapper } from "@/components";
import { QUERY_PARAMS } from "@/constants/query-params";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { ConditionObject, useDisableButtons } from "@/hooks/useDisableButtons";
import { alloABI, cvStrategyABI } from "@/src/generated";
import { PoolTypes } from "@/types";
import { getEventFromReceipt } from "@/utils/contracts";
import { ipfsJsonUpload } from "@/utils/ipfsUtils";
import {
  calculatePercentageBigInt,
  convertSecondsToReadableTime,
} from "@/utils/numbers";

//protocol : 1 => means ipfs!, to do some checks later
type FormInputs = {
  title: string;
  amount: number;
  beneficiary: string;
  description: string;
};

type ProposalFormProps = {
  strategy: Pick<
    CVStrategy,
    "id" | "token" | "maxCVSupply" | "totalEffectiveActivePoints"
  > & {
    config: Pick<CVStrategyConfig, "decay" | "proposalType">;
    registryCommunity: {
      members?: Maybe<Pick<MemberCommunity, "memberAddress">[]>;
    };
  };
  arbitrableConfig:
    | Pick<ArbitrableConfig, "submitterCollateralAmount">
    | undefined;
  poolId: number;
  proposalType: number;
  poolParams: Pick<CVStrategyConfig, "decay">;
  alloInfo: Pick<Allo, "id" | "chainId" | "tokenNative">;
  tokenGarden: Pick<TokenGarden, "symbol" | "decimals">;
  spendingLimit: number | string | undefined;
  spendingLimitPct: number;
  poolBalance: string | undefined;
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

export const ProposalForm = ({
  strategy,
  arbitrableConfig,
  poolId,
  proposalType,
  poolParams,
  alloInfo,
  poolBalance,
  spendingLimitPct,
  spendingLimit,
}: ProposalFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
    watch,
  } = useForm<FormInputs>({ mode: "onBlur" });

  const { publish } = usePubSubContext();

  const { address: connectedWallet } = useAccount();

  const chainId = alloInfo.chainId;
  const beneficiary = watch("beneficiary");

  useEffect(() => {
    if (!connectedWallet) return;
    if (getValues("beneficiary")) return;
    setValue("beneficiary", connectedWallet);
  }, [connectedWallet, getValues, setValue]);

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
  const [requestedAmount, setRequestedAmount] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [isEnoughBalance, setIsEnoughBalance] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const { blockTime, id: chainIdFromPath } = useChainFromPath()!;

  const convictionGrowthSec = calculateConvictionGrowthInSeconds(
    poolParams.decay,
    blockTime,
  );
  const { value: convictionGrowth, unit: convictionGrowthUnit } =
    convertSecondsToReadableTime(convictionGrowthSec);

  const disableSubmitBtn = useMemo<ConditionObject[]>(
    () => [
      {
        condition: !isEnoughBalance,
        message: "Insufficient balance",
      },
      {
        condition: !strategy.registryCommunity.members?.find(
          (x) => x.memberAddress === connectedWallet?.toLowerCase(),
        ),
        message: "Join the community to create a proposal",
      },
    ],
    [isEnoughBalance, connectedWallet, strategy.registryCommunity.members],
  );
  const { tooltipMessage, isButtonDisabled } =
    useDisableButtons(disableSubmitBtn);

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
    value: arbitrableConfig?.submitterCollateralAmount,
    onError: () => {
      setLoading(false);
    },
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
      if (pathname) {
        const newPath = pathname.replace(
          "/create-proposal",
          `/${strategy.id}-${proposalId}`,
        );
        const searchParams = new URLSearchParams();
        searchParams.set(
          QUERY_PARAMS.proposalPage.pendingProposal,
          proposalId.toString(),
        );
        const titleValue = getValues("title");
        if (titleValue) {
          searchParams.set(
            QUERY_PARAMS.proposalPage.pendingProposalTitle,
            encodeURIComponent(titleValue),
          );
        }
        router.push(`${newPath}?${searchParams.toString()}`);
      }
    },
  });

  const poolTokenAddr = strategy?.token as Address;
  const { data: poolToken } = useToken({
    address: poolTokenAddr,
    enabled: !!poolTokenAddr && PoolTypes[proposalType] === "funding",
    chainId,
  });

  const INPUT_TOKEN_MIN_VALUE =
    Number(requestedAmount) == 0 ? 0 : 1 / 10 ** (poolToken?.decimals ?? 0);

  const { data: thresholdFromContract } = useContractRead({
    address: strategy.id as Address,
    abi: cvStrategyABI,
    chainId: chainIdFromPath,
    functionName: "calculateThreshold",
    args: [
      requestedAmount ?
        parseUnits(requestedAmount, poolToken?.decimals ?? 0)
      : 0n,
    ],
    enabled:
      requestedAmount !== undefined &&
      PoolTypes[strategy?.config?.proposalType] === "funding",
  });

  const thresholdPct = calculatePercentageBigInt(
    thresholdFromContract as bigint,
    BigInt(strategy.maxCVSupply),
  );

  if (!poolToken && PoolTypes[proposalType] === "funding") {
    return (
      <div className="m-40 col-span-12">
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
    const amount = parseUnits(strAmount, poolToken?.decimals ?? 0);
    const encodedData = encodeAbiParameters(abiParameters, [
      [
        poolId,
        previewData?.beneficiary ||
          "0x0000000000000000000000000000000000000000",
        amount,
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
      if (Boolean(formRow)) {
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

  function getThresholdColor(
    thresholdPctArgument: number,
  ): "info" | "warning" | "error" {
    if (thresholdPctArgument < 50) return "info";
    if (thresholdPctArgument < 100) return "warning";
    return "error";
  }

  const thColor = getThresholdColor(thresholdPct);

  return (
    <form onSubmit={handleSubmit(handlePreview)} className="w-full">
      {showPreview ?
        <FormPreview
          title={previewData?.title ?? ""}
          description={previewData?.description ?? ""}
          formRows={formatFormRows()}
          onEdit={() => {
            setShowPreview(false);
          }}
          onSubmit={() => {
            if (isButtonDisabled) return;
            createProposal();
          }}
        />
      : <div className="flex flex-col gap-2 overflow-hidden p-1">
          {proposalTypeName === "funding" && (
            <div className="relative flex flex-col">
              <FormInput
                label="Requested amount"
                subLabel={`Pool Funds: ${poolBalance} ${poolToken?.symbol} - Spending limit: ${spendingLimitPct.toFixed(1)}% = ${spendingLimit} ${poolToken?.symbol}`}
                register={register}
                required
                onChange={(e) => {
                  setRequestedAmount(e.target.value);
                }}
                registerOptions={{
                  // max: {
                  //   value: spendingLimit ? +spendingLimit : 0,
                  //   message: `Max amount must remain under the spending limit of ${spendingLimit} ${poolToken?.symbol}`,
                  // },
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

          {requestedAmount && thresholdPct !== 0 && (
            <InfoBox
              title={`Conviction required:${" "} ${thresholdPct > 100 ? "Over 100" : thresholdPct}%`}
              infoBoxType={thColor}
            >
              <div className="flex flex-wrap w-full">
                The{" "}
                <InfoWrapper
                  tooltip={`Conviction accumulates over time based on both the level of support on a proposal and the duration defined by the Conviction Growth parameter (${convictionGrowth} ${convictionGrowthUnit}).`}
                  size="sm"
                  hoverOnChildren={true}
                  hideIcon={true}
                  className={`tooltip-top-right border-b border-dashed border-${thColor} text-sm`}
                >
                  conviction
                </InfoWrapper>{" "}
                required for the proposal to pass within the request amount is{" "}
                {thresholdPct}%.{" "}
                {requestedAmount &&
                  thresholdPct > 50 &&
                  (thresholdPct < 100 ?
                    "It may be difficult to pass."
                  : "It will not pass unless more funds are added to the pool")}
              </div>
            </InfoBox>
          )}
          {proposalTypeName !== "signaling" && (
            <div className="flex flex-col">
              <FormAddressInput
                label="Beneficiary address"
                register={register}
                registerKey="beneficiary"
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
              type="button"
              onClick={() => {
                setShowPreview(false);
                setLoading(false);
              }}
              btnStyle="outline"
            >
              Edit
            </Button>
            <Button
              type="button"
              onClick={() => createProposal()}
              isLoading={loading}
              disabled={isButtonDisabled}
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

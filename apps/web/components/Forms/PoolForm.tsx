"use client";

import "viem/window";
import React, { ReactNode, useEffect, useState } from "react";
// eslint-disable-next-line import/no-extraneous-dependencies
import { ArrowPathRoundedSquareIcon } from "@heroicons/react/24/solid";
import sfMeta from "@superfluid-finance/metadata";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Address, isAddress, parseUnits, zeroAddress } from "viem";
import { polygon } from "viem/chains";
import { useToken } from "wagmi";
import { TokenGarden } from "#/subgraph/.graphclient";
import { AddressListInput } from "./AddressListInput";
import { FormAddressInput } from "./FormAddressInput";
import { FormCheckBox } from "./FormCheckBox";
import { FormInput } from "./FormInput";
import { FormPreview, FormRow } from "./FormPreview";
import { FormRadioButton } from "./FormRadioButton";
import { FormSelect } from "./FormSelect";
import { EthAddress } from "../EthAddress";
import { InfoBox } from "../InfoBox";
import { InfoWrapper } from "../InfoWrapper";
import { SuperfluidStream } from "@/assets";
import { Button } from "@/components/Button";
import { QUERY_PARAMS } from "@/constants/query-params";
import { usePubSubContext } from "@/contexts/pubsub.context";
import {
  DEFAULT_RULING_TIMEOUT_SEC,
  VOTING_POINT_SYSTEM_DESCRIPTION,
} from "@/globals";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useSuperfluidToken } from "@/hooks/useSuperfluidToken";
import { superTokenFactoryAbi } from "@/src/customAbis";
import { registryCommunityABI } from "@/src/generated";
import {
  DisputeOutcome,
  PointSystems,
  PoolTypes,
  SybilResistanceType,
} from "@/types";
import { filterFunctionFromABI } from "@/utils/abi";
import { getEventFromReceipt } from "@/utils/contracts";
import { ipfsJsonUpload } from "@/utils/ipfsUtils";
import {
  calculateDecay,
  calculateMaxRatioNum,
  convertSecondsToReadableTime,
  CV_PASSPORT_THRESHOLD_SCALE,
  CV_SCALE_PRECISION,
  ETH_DECIMALS,
} from "@/utils/numbers";
import { capitalize, ethAddressRegEx } from "@/utils/text";
import { parseTimeUnit } from "@/utils/time";

type PoolSettings = {
  spendingLimit?: number;
  minimumConviction?: number;
  convictionGrowth?: number;
};

type ArbitrationSettings = {
  defaultResolution: number;
  proposalCollateral: number;
  disputeCollateral: number;
  tribunalAddress: string;
  rulingTime: number;
};

type FormInputs = {
  title: string;
  description: string;
  poolTokenAddress: string;
  strategyType: number;
  pointSystemType: number;
  optionType?: number;
  maxAmount?: number;
  minThresholdPoints: string | number;
  sybilResistanceValue?: undefined | number | Address[];
  sybilResistanceType: SybilResistanceType;
} & PoolSettings &
  ArbitrationSettings;

type Props = {
  communityAddr: `0x${string}`;
  alloAddr: `0x${string}`;
  governanceToken: Pick<TokenGarden, "decimals" | "id" | "symbol">;
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
  sybilResistanceType: [0, 1],
  sybilResistanceValue: [0, 1],
  defaultResolution: [0, 1],
  rulingTime: [0, 1],
  proposalCollateral: [0, 1],
  disputeCollateral: [0, 1],
  tribunalAddress: [0, 1],
  poolTokenAddress: [0, 1],
  superfluidEnabled: [1],
};

const sybilResistancePreview = (
  sybilType: SybilResistanceType,
  addresses: string[],
  value?: string | Address[],
): ReactNode => {
  const previewMap: Record<SybilResistanceType, ReactNode> = {
    noSybilResist: "No protections (anyone can vote)",
    allowList: (() => {
      if (addresses.length === 0) {
        return "Allow list (no addresses submitted)";
      }
      return (
        <div className="flex flex-col">
          <div className="w-fit text-nowrap flex-nowrap">Allow list:</div>
          <ul className="space-y-2 overflow-y-auto border1 p-2 rounded-xl w-fit resize-y">
            {addresses.map((address) => (
              <li key={address}>
                <EthAddress
                  address={address as Address}
                  shortenAddress={false}
                />
              </li>
            ))}
          </ul>
        </div>
      );
    })(),
    gitcoinPassport: `Passport score required: ${value}`,
    goodDollar: "GoodDollar verification required",
  };

  return previewMap[
    addresses?.[0] === zeroAddress ? "noSybilResist" : sybilType
  ];
};

const shouldRenderInputMap = (key: string, value: number): boolean => {
  return proposalInputMap[key]?.includes(Number(value)) ?? false;
};

const defaultEthProposalColateral = 0.002;
const defaultEthChallengeColateral = 0.001;
const defaultMaticProposalColateral = 10;
const defaultMaticChallengeColateral = 5;

export function PoolForm({ governanceToken, communityAddr }: Props) {
  const chain = useChainFromPath()!;
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
    watch,
  } = useForm<FormInputs>({
    mode: "onBlur",
    defaultValues: {
      strategyType: 1,
      pointSystemType: 0,
      sybilResistanceType: "allowList",
      rulingTime: parseTimeUnit(DEFAULT_RULING_TIMEOUT_SEC, "seconds", "days"),
      defaultResolution: 1,
      minThresholdPoints: 0,
      poolTokenAddress: "",
      proposalCollateral:
        chain.id === polygon.id ?
          defaultMaticProposalColateral
        : defaultEthProposalColateral,
      disputeCollateral:
        chain.id === polygon.id ?
          defaultMaticChallengeColateral
        : defaultEthChallengeColateral,
      tribunalAddress: chain.globalTribunal ?? "",
    },
  });
  const sybilResistanceType = watch("sybilResistanceType");
  const sybilResistanceValue = watch("sybilResistanceValue");
  const tribunalAddress = watch("tribunalAddress");
  const poolTokenAddress = watch("poolTokenAddress").toLowerCase() as Address;

  const { superToken, setSuperToken, isFetching } = useSuperfluidToken({
    token: poolTokenAddress,
  });

  const { data: customTokenData } = useToken({
    address: poolTokenAddress,
    enabled: !!poolTokenAddress && isAddress(poolTokenAddress),
  });

  const INPUT_TOKEN_MIN_VALUE = 1 / 10 ** governanceToken.decimals;
  const INPUT_MIN_THRESHOLD_VALUE = 0;

  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<FormInputs>();
  const [optionType, setOptionType] = useState(1);

  const [loading, setLoading] = useState(false);
  const [showWarningMessage, setShowWarningMessage] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { publish } = usePubSubContext();
  const { isConnected, missmatchUrl, tooltipMessage } = useDisableButtons();

  const pointSystemType = watch("pointSystemType");
  const strategyType = watch("strategyType");

  useEffect(() => {
    const isUnlimited = PointSystems[pointSystemType] === "unlimited";
    const isUnprotected = sybilResistanceType === "noSybilResist";
    setShowWarningMessage(!isUnlimited && isUnprotected);
  }, [pointSystemType, sybilResistanceType]);

  const formRowTypes: Record<
    string,
    { label: string; parse?: (value: any) => ReactNode | string }
  > = {
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
      parse: (days: string) => {
        const { value, unit } = convertSecondsToReadableTime(
          parseTimeUnit(+days, "days", "seconds"),
        );
        return value + " " + unit + (value > 1 ? "s" : "");
      },
    },
    strategyType: {
      label: "Strategy type:",
      parse: (value: string) => capitalize(PoolTypes[value]),
    },
    pointSystemType: {
      label: "Voting Weight System:",
      parse: (value: string) => capitalize(PointSystems[value]),
    },
    maxAmount: {
      label: "Token max amount:",
    },
    minThresholdPoints: {
      label: "Minimum threshold points:",
      parse: (value: string) => {
        return value ?? "0";
      },
    },
    sybilResistanceType: {
      label: "Protection:",
      parse: () =>
        sybilResistancePreview(
          sybilResistanceType,
          Array.isArray(sybilResistanceValue) ? sybilResistanceValue : [],
          sybilResistanceValue?.toString(),
        ),
    },
    defaultResolution: {
      label: "Dispute default resolution:",
      parse: (value: string) =>
        DisputeOutcome[value] == "approved" ? "Approve" : "Reject",
    },
    rulingTime: {
      label: "Ruling time:",
      parse: (days: string) => {
        const { value, unit } = convertSecondsToReadableTime(
          parseTimeUnit(+days, "days", "seconds"),
        );
        return value + " " + unit + (value > 1 ? "s" : "");
      },
    },
    proposalCollateral: {
      label: "Proposal collateral:",
      parse: (value: string) =>
        value + " " + chain.nativeCurrency?.symbol || "",
    },
    disputeCollateral: {
      label: "Dispute collateral:",
      parse: (value: string) =>
        value + " " + chain.nativeCurrency?.symbol || "",
    },
    tribunalAddress: {
      label: "Tribunal safe:",
      parse: (value: string) => (
        <EthAddress
          address={value as Address}
          icon={"ens"}
          shortenAddress={false}
        />
      ),
    },
    poolTokenAddress: {
      label: "Pool token address:",
      parse: (value: string) => (
        <div className="flex gap-2 items-center">
          <EthAddress address={value as Address} />
          <span className="text-neutral-content">
            {customTokenData?.symbol}
          </span>
        </div>
      ),
    },
    superfluidEnabled: {
      label: "Stream funding",
      parse: (value: boolean) => (value ? "✅" : "❌"),
    },
  } as const;

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
        ?.spendingLimit as number; // percentage
      minimumConviction = poolSettingValues[optionType].values
        ?.minimumConviction as number; // percentage
      convictionGrowth = poolSettingValues[optionType].values
        ?.convictionGrowth as number; // days
    }

    // parse to percentage fraction
    spendingLimit = spendingLimit / 100;
    minimumConviction = minimumConviction / 100;

    const maxRatioNum = calculateMaxRatioNum(spendingLimit, minimumConviction);

    const weightNum = minimumConviction * maxRatioNum ** 2;

    const blockTime = chain.blockTime;

    // pool settings
    const maxRatio = BigInt(Math.round(maxRatioNum * CV_SCALE_PRECISION));
    const weight = BigInt(Math.round(weightNum * CV_SCALE_PRECISION));
    const decay = BigInt(calculateDecay(blockTime, convictionGrowth));

    const minThresholdPoints = parseUnits(
      (previewData?.minThresholdPoints ?? 0).toString(),
      governanceToken.decimals,
    );

    const maxAmountStr = (previewData?.maxAmount ?? 0).toString();

    if (!previewData) {
      throw new Error("No preview data");
    }

    // sybil resistance set
    let allowList: Address[] = [];
    if (
      sybilResistanceType === "allowList" &&
      Array.isArray(sybilResistanceValue)
    ) {
      allowList = sybilResistanceValue;
    } else {
      allowList = [zeroAddress];
    }
    writeCreatePool({
      args: [
        (previewData.poolTokenAddress || zeroAddress) as Address,
        {
          cvParams: {
            decay: decay,
            maxRatio: maxRatio,
            weight: weight,
            minThresholdPoints: minThresholdPoints,
          },
          arbitrableConfig: {
            defaultRuling: BigInt(previewData.defaultResolution),
            defaultRulingTimeout: BigInt(
              Math.round(
                parseTimeUnit(previewData.rulingTime, "days", "seconds"),
              ),
            ),
            submitterCollateralAmount: parseUnits(
              previewData.proposalCollateral.toString(),
              ETH_DECIMALS,
            ),
            challengerCollateralAmount: parseUnits(
              previewData.disputeCollateral.toString(),
              ETH_DECIMALS,
            ),
            tribunalSafe: previewData.tribunalAddress as Address,
            arbitrator: chain.arbitrator as Address,
          },
          pointConfig: {
            maxAmount: parseUnits(maxAmountStr, governanceToken.decimals),
          },
          pointSystem: previewData.pointSystemType,
          proposalType: previewData.strategyType,
          registryCommunity: communityAddr,
          sybilScorer:
            sybilResistanceType === "gitcoinPassport" ?
              (chain.passportScorer as Address)
            : sybilResistanceType === "goodDollar" ?
              (chain.goodDollar as Address)
            : zeroAddress,
          sybilScorerThreshold: BigInt(
            Math.round(
              (
                Array.isArray(sybilResistanceValue) ||
                  !Boolean(previewData.sybilResistanceValue)
              ) ?
                0
              : (previewData.sybilResistanceValue as unknown as number) *
                  CV_PASSPORT_THRESHOLD_SCALE,
            ),
          ),
          initialAllowlist: allowList,
          superfluidToken:
            (superToken?.sameAsUnderlying ? undefined : superToken?.id) ??
            zeroAddress,
        },
        {
          protocol: 1n,
          pointer: ipfsHash,
        },
      ],
    });
  };

  const { write: writeCreatePool } = useContractWriteWithConfirmations({
    address: communityAddr,
    abi: filterFunctionFromABI(registryCommunityABI, (item) => {
      return (
        item.name === "createPool" &&
        item.inputs[1].name === "_params" &&
        !!item.inputs[1].components.find(
          (param) => param.name === "initialAllowlist",
        )
      );
    }),
    contractName: "Registry Community",
    functionName: "createPool",
    fallbackErrorMessage: "Error creating a pool, please report a bug.",
    onError: () => {
      setLoading(false);
    },
    onConfirmations: async (receipt) => {
      const newPoolData = getEventFromReceipt(
        receipt,
        "RegistryCommunity",
        "PoolCreated",
      ).args;
      publish({
        topic: "pool",
        function: "createPool",
        type: "add",
        id: newPoolData._poolId.toString(), // Never propagate direct bigint outside of javascript environment
        containerId: communityAddr,
        chainId: chain.id,
      });
      setLoading(false);
      router.push(
        pathname?.replace(
          "/create-pool",
          `?${QUERY_PARAMS.communityPage.newPool}=${newPoolData._poolId}`,
        ),
      );
    },
  });

  const networkSfMetadata =
    chain.id ? sfMeta.getNetworkByChainId(chain.id) : undefined;

  const {
    writeAsync: writeCreateSuperTokenAsync,
    isLoading: isCreateSuperTokenLoading,
  } = useContractWriteWithConfirmations({
    abi: superTokenFactoryAbi,
    address: networkSfMetadata?.contractsV1.superTokenFactory as Address,
    functionName: "createERC20Wrapper",
    contractName: "SuperTokenFactory",
    onConfirmations: async (receipt) => {
      const newSuperToken = getEventFromReceipt(
        receipt,
        "SuperTokenFactory",
        "SuperTokenCreated",
      ).args;

      setSuperToken({
        name: "Super" + customTokenData?.name,
        symbol: customTokenData?.symbol + "x",
        id: newSuperToken.token,
        underlyingToken: poolTokenAddress,
      });
    },
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

  const createPool = async () => {
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
      contractWrite(ipfsHash);
    }
  };

  const formatFormRows = () => {
    if (!previewData) {
      return [];
    }
    let formattedRows: FormRow[] = [];

    const reorderedData = {
      poolTokenAddress: previewData.poolTokenAddress,
      strategyType: previewData.strategyType,
      pointSystemType: previewData.pointSystemType,
      maxAmount: previewData.maxAmount,
      optionType: previewData.optionType,
      spendingLimit: previewData.spendingLimit,
      minimumConviction: previewData.minimumConviction,
      convictionGrowth: previewData.convictionGrowth,
      minThresholdPoints: previewData.minThresholdPoints,
      sybilResistanceType: previewData.sybilResistanceType,
      sybilResistanceValue: previewData.sybilResistanceValue,
      defaultResolution: previewData.defaultResolution,
      rulingTime: previewData.rulingTime,
      proposalCollateral: previewData.proposalCollateral,
      disputeCollateral: previewData.disputeCollateral,
      tribunalAddress: previewData.tribunalAddress,
      superfluidEnabled: !!superToken,
    };

    Object.entries(reorderedData).forEach(([key, value]) => {
      const formRow = formRowTypes[key];
      if (Boolean(formRow) && shouldRenderInPreview(key)) {
        const parsedValue = formRow.parse ? formRow.parse(value) : value;
        formattedRows.push({
          label: formRow.label,
          data: parsedValue,
        });
      } else {
        return;
      }
    });

    return formattedRows;
  };

  const shouldRenderInPreview = (key: string) => {
    if (key === "maxAmount") {
      if (previewData?.pointSystemType != null) {
        return PointSystems[previewData?.pointSystemType] === "capped";
      } else {
        return false;
      }
    } else if (key === "poolTokenAddress") {
      return !!previewData && PoolTypes[previewData.strategyType] === "funding";
    } else {
      return shouldRenderInputMap(key, strategyType);
    }
  };

  const handleEnableStreaming = async () => {
    writeCreateSuperTokenAsync({
      args: [
        poolTokenAddress,
        1,
        "Super " + customTokenData!.name,
        customTokenData!.symbol + "x",
      ],
    });
  };

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
            if (!isConnected || missmatchUrl) return;
            createPool();
          }}
        />
      : <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <FormInput
              label="Pool Name"
              register={register}
              required
              errors={errors}
              registerKey="title"
              type="text"
              placeholder="Your pool name..."
              testId="input-pool-name"
            />
            <FormInput
              label="Description"
              onChange={(value) => {
                setValue("description", value.target.value);
              }}
              value={getValues("description")}
              required
              errors={errors}
              registerKey="description"
              type="markdown"
              rows={7}
              placeholder="Enter a description of your pool..."
              testId="input-pool-description"
            />
            <FormSelect
              label="Pool type"
              register={register}
              errors={errors}
              registerKey="strategyType"
              required
              options={Object.entries(PoolTypes)
                .slice(0, -1)
                .map(([value, text]) => ({
                  label: capitalize(text),
                  value: value,
                }))}
            />
            {PoolTypes[strategyType] === "funding" && (
              <div className="flex items-end gap-4 flex-wrap md:flex-nowrap">
                <FormAddressInput
                  label="Pool token ERC20 address"
                  register={register}
                  required
                  validateERC20
                  registerOptions={{
                    pattern: {
                      value: ethAddressRegEx,
                      message: "Invalid Eth Address",
                    },
                  }}
                  errors={errors}
                  registerKey="poolTokenAddress"
                  placeholder="0x.."
                  className="font-mono text-sm w-full max-w-[29rem]"
                  suffix={customTokenData?.symbol}
                  testId="input-token-address"
                />
                {networkSfMetadata && poolTokenAddress && customTokenData && (
                  <div className="mb-2">
                    {isFetching ?
                      <span className="loading loading-spinner loading-md mb-2" />
                    : (
                      superToken &&
                      superToken.underlyingToken === poolTokenAddress
                    ) ?
                      <div className="flex gap-1">
                        <InfoWrapper tooltip="This pool will support streaming through Superfluid — allowing continuous funding over time.">
                          <div className="flex items-center">
                            <Image
                              src={SuperfluidStream}
                              alt="Incoming Stream"
                              width={36}
                              height={36}
                              className="mb-2"
                            />
                            {superToken.sameAsUnderlying ?
                              "Natively supports streaming"
                            : <>
                                Fund streaming enabled with{" "}
                                <EthAddress
                                  address={superToken?.id as Address}
                                  shortenAddress={true}
                                  icon={false}
                                  actions="copy"
                                  label={superToken?.symbol}
                                />
                              </>
                            }
                          </div>
                        </InfoWrapper>
                      </div>
                    : <Button
                        btnStyle="outline"
                        color="tertiary"
                        icon={
                          <ArrowPathRoundedSquareIcon height={20} width={20} />
                        }
                        disabled={!isConnected || missmatchUrl}
                        tooltip={
                          tooltipMessage ??
                          "This allows people to add funds to the pool via streaming (Superfluid)."
                        }
                        forceShowTooltip={true}
                        onClick={() => handleEnableStreaming()}
                        isLoading={isCreateSuperTokenLoading}
                        className="mb-0.5"
                      >
                        Create Stream Token
                      </Button>
                    }
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="label w-fit">
                Voting Weight System
                <span className="ml-1">*</span>
              </label>
              <div className="ml-2 flex flex-col gap-2">
                {Object.entries(PointSystems).map(([value, id], i) => (
                  <div key={value}>
                    <FormRadioButton
                      value={value}
                      label={capitalize(id)}
                      inline={true}
                      onChange={() =>
                        setValue("pointSystemType", parseInt(value))
                      }
                      checked={parseInt(value) === pointSystemType}
                      registerKey="pointSystemType"
                      description={VOTING_POINT_SYSTEM_DESCRIPTION[id]}
                    />

                    {PointSystems[pointSystemType] === "capped" &&
                      i === Object.values(PointSystems).indexOf("capped") && (
                        <div className="flex flex-col ml-8 ">
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
                            suffix={customTokenData?.symbol}
                          />
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {shouldRenderInputMap("sybilResistanceType", strategyType) && (
            <div>
              <label className="label w-fit">
                Who can vote?
                <span className="ml-1">*</span>
              </label>

              <div className="flex flex-col gap-2 ml-2">
                <FormRadioButton
                  label="All members"
                  value={"noSybilResist"}
                  inline={true}
                  onChange={() =>
                    setValue("sybilResistanceType", "noSybilResist")
                  }
                  checked={sybilResistanceType === "noSybilResist"}
                  registerKey="sybilResistanceType"
                  description="Anyone in the community can vote"
                />
                <FormRadioButton
                  label="Allow list"
                  value={"allowList"}
                  inline={true}
                  onChange={() => setValue("sybilResistanceType", "allowList")}
                  checked={sybilResistanceType === "allowList"}
                  registerKey="sybilResistanceType"
                  description="Add a list of addresses that can vote"
                />
                <FormRadioButton
                  label="Human Passport"
                  value={"gitcoinPassport"}
                  inline={true}
                  onChange={() =>
                    setValue("sybilResistanceType", "gitcoinPassport")
                  }
                  checked={sybilResistanceType === "gitcoinPassport"}
                  registerKey="SybilResistanceType"
                  description={
                    <>
                      Set a minimum score on{" "}
                      <a
                        href="https://passport.xyz/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Passport
                      </a>{" "}
                      needed for members to vote
                    </>
                  }
                />
                {chain.goodDollar && (
                  <FormRadioButton
                    label="GoodDollar"
                    value={"goodDollar"}
                    inline={true}
                    onChange={() =>
                      setValue("sybilResistanceType", "goodDollar")
                    }
                    checked={sybilResistanceType === "goodDollar"}
                    registerKey="sybilResistanceType"
                    description={
                      <>
                        Members verify uniqueness with a secure face scan on{" "}
                        <a
                          href="https://www.gooddollar.org/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          GoodDollar
                        </a>
                      </>
                    }
                  />
                )}
              </div>

              {showWarningMessage && (
                <div className="mt-6">
                  <InfoBox
                    title="Warning"
                    content={`This setup may be vulnerable to Sybil attacks (duplicated accounts gaining unfair influence). 
                    To ensure fair governance, consider enabling voting protection (e.g. Allowlist or Gitcoin Passport).`}
                    infoBoxType="warning"
                  />
                </div>
              )}
              <div className="flex flex-col gap-2 my-2">
                <hr />
                <span className="text-neutral-soft-content mx-auto pt-2">
                  Council safe can edit this section once the pool is created.
                </span>
              </div>
              {sybilResistanceType === "gitcoinPassport" && (
                <FormInput
                  label="Gitcoin Passport score"
                  register={register}
                  required={sybilResistanceType === "gitcoinPassport"}
                  registerOptions={{
                    min: {
                      value: 1 / CV_PASSPORT_THRESHOLD_SCALE,
                      message: `Amount must be greater than ${1 / CV_PASSPORT_THRESHOLD_SCALE}`,
                    },
                  }}
                  otherProps={{
                    step: 1 / CV_PASSPORT_THRESHOLD_SCALE,
                    min: 1 / CV_PASSPORT_THRESHOLD_SCALE,
                  }}
                  errors={errors}
                  registerKey="sybilResistanceValue"
                  type="number"
                  placeholder="0"
                />
              )}

              {sybilResistanceType === "allowList" && (
                <AddressListInput
                  register={register}
                  registerKey="sybilResistanceValue"
                  addresses={sybilResistanceValue}
                  setValue={setValue}
                  errors={errors}
                  pointSystemType={pointSystemType}
                />
              )}
            </div>
          )}

          {/* arbitration section */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <h4 className="my-4">Arbitration settings</h4>
            </div>
            <FormInput
              tooltip={
                'Deposited by proposal creator and forfeited if the proposal is ruled as "Rejected" by the Tribunal (violation of Covenant found).\n Deposit is returned when the proposal is either cancelled by the creator or executed successfully.'
              }
              type="number"
              label={"Collateral to Create Proposal"}
              register={register}
              registerKey="proposalCollateral"
              required
              otherProps={{
                step: 1 / 10 ** ETH_DECIMALS,
                min: 1 / 10 ** ETH_DECIMALS,
              }}
              suffix={chain.nativeCurrency?.symbol ?? "ETH"}
            />
            <FormInput
              tooltip={
                'Deposited by the proposal disputer and forfeited if the proposal is ruled as "Allowed" by the Tribunal (no violation of Covenant found). Deposit is returned if the proposal is ruled as "Rejected."'
              }
              type="number"
              label={"Collateral to Dispute Proposal"}
              register={register}
              registerKey="disputeCollateral"
              required
              otherProps={{
                step: 1 / 10 ** ETH_DECIMALS,
                min: 1 / 10 ** ETH_DECIMALS,
              }}
              suffix={chain.nativeCurrency?.symbol ?? "ETH"}
            />
            <FormInput
              label="Ruling Time"
              registerKey="rulingTime"
              register={register}
              type="number"
              required
              otherProps={{
                step: 0.0001,
              }}
              suffix="Days"
              tooltip="Number of days Tribunal has to make a decision on the dispute. Past that time, the default resolution will be applied."
            />
            <FormSelect
              tooltip={
                'Resolution executed if the Tribunal rules "Abstain", or doesn\'t make a ruling in time.'
              }
              label="Default Abstain Resolution"
              options={Object.entries(DisputeOutcome)
                .slice(1)
                .map(([value, text]) => ({
                  label: capitalize(text),
                  value: value,
                }))}
              required
              registerKey="defaultResolution"
              register={register}
            />
            <div className="flex flex-col">
              <FormAddressInput
                tooltip="Enter a Safe address to rule on proposal disputes in the Pool and determine if they are in violation of the Covenant."
                label="Tribunal address"
                required
                validateSafe
                value={tribunalAddress}
                registerKey="tribunalAddress"
                register={register}
                errors={errors}
              />
              <FormCheckBox
                label="Use global tribunal"
                registerKey="useGlobalTribunal"
                tooltip="Check this box to use the Gardens global tribunal Safe to rule on proposal disputes in the Pool, a service we offer if your community does not have an impartial 3rd party that can rule on violations of the Covenant."
                value={
                  tribunalAddress?.toLowerCase() ===
                  chain.globalTribunal?.toLowerCase()
                }
                onChange={() => {
                  setValue(
                    "tribunalAddress",
                    (
                      tribunalAddress.toLowerCase() ===
                        chain.globalTribunal?.toLowerCase()
                    ) ?
                      ""
                    : chain.globalTribunal ?? "",
                  );
                }}
              />
            </div>
          </div>
          {/* pool settings section */}
          <div className="flex flex-col">
            <h4 className="my-4">Pool settings</h4>
            <div className="flex gap-8 flex-wrap">
              {Object.entries(poolSettingValues).map(
                ([key, { label, description }]) => {
                  return (
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
                  );
                },
              )}
            </div>
            <div className="mb-6 mt-2 flex flex-col">
              {shouldRenderInputMap("spendingLimit", strategyType) && (
                <div className="flex flex-col">
                  <FormInput
                    tooltip="Max percentage of the pool funds that can be spent in a single proposal"
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
                      step: 1 / CV_SCALE_PRECISION,
                      min: 1 / CV_SCALE_PRECISION,
                    }}
                    registerOptions={{
                      min: {
                        value: 1 / CV_SCALE_PRECISION,
                        message: "Amount must be greater than 0",
                      },
                    }}
                    suffix="%"
                  />
                </div>
              )}
              {shouldRenderInputMap("minimumConviction", strategyType) && (
                <div className="flex flex-col">
                  <FormInput
                    tooltip="% of Pool's voting weight needed to pass the smallest funding proposal possible. Higher funding requests demand greater conviction to pass."
                    label="Minimum conviction"
                    register={register}
                    errors={errors}
                    registerKey="minimumConviction"
                    type="number"
                    placeholder="10"
                    readOnly={optionType !== 0}
                    className="pr-14"
                    otherProps={{
                      step: 1 / CV_SCALE_PRECISION,
                    }}
                    registerOptions={{
                      max: {
                        value: 99.9,
                        message: "Minimum conviction should be under 100%",
                      },
                    }}
                    suffix="%"
                  />
                </div>
              )}
              {shouldRenderInputMap("convictionGrowth", strategyType) && (
                <div className="flex flex-col">
                  <FormInput
                    tooltip="It's the time for conviction to reach proposal support. This parameter is logarithmic, represented as a half life"
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
                        message: "Max amount cannot exceed 100 DAYS",
                      },
                      min: {
                        value: INPUT_TOKEN_MIN_VALUE,
                        message: `Amount must be greater than ${INPUT_TOKEN_MIN_VALUE}`,
                      },
                    }}
                    suffix="Days"
                  />
                </div>
              )}
              {shouldRenderInputMap("minThresholdPoints", strategyType) && (
                <div className="flex flex-col">
                  <FormInput
                    tooltip={`A fixed amount of ${governanceToken.symbol} that overrides Minimum Conviction when the Pool's activated governance is low.`}
                    label="Minimum threshold points"
                    register={register}
                    registerOptions={{
                      min: {
                        value: INPUT_MIN_THRESHOLD_VALUE,
                        message: `Amount must be greater than ${INPUT_MIN_THRESHOLD_VALUE}`,
                      },
                    }}
                    required
                    otherProps={{
                      step: INPUT_TOKEN_MIN_VALUE,
                      min: INPUT_MIN_THRESHOLD_VALUE,
                    }}
                    errors={errors}
                    registerKey="minThresholdPoints"
                    type="number"
                    placeholder="0"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      }
      <div className="flex w-full items-center justify-center py-6">
        {showPreview ?
          <div className="flex items-center gap-10">
            <Button
              onClick={() => {
                setShowPreview(false);
              }}
              btnStyle="outline"
            >
              Edit
            </Button>
            <Button
              onClick={() => createPool()}
              isLoading={loading}
              disabled={!isConnected || missmatchUrl}
              tooltip={tooltipMessage}
              testId="btn-submit-pool"
            >
              Submit
            </Button>
          </div>
        : <Button type="submit" testId="btn-preview-pool">
            Preview
          </Button>
        }
      </div>
    </form>
  );
}

"use client";

import "viem/window";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Address, parseUnits } from "viem";
import { useToken } from "wagmi";
import { TokenGarden } from "#/subgraph/.graphclient";
import { FormAddressInput } from "./FormAddressInput";
import { FormCheckBox } from "./FormCheckBox";
import { FormInput } from "./FormInput";
import { FormPreview, FormRow } from "./FormPreview";
import { FormRadioButton } from "./FormRadioButton";
import { FormSelect } from "./FormSelect";
import { EthAddress } from "../EthAddress";
import { InfoBox } from "../InfoBox";
import { Button } from "@/components/Button";
import { QUERY_PARAMS } from "@/constants/query-params";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { registryCommunityABI } from "@/src/generated";
import { DisputeOutcome, PointSystems, PoolTypes } from "@/types";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { getEventFromReceipt } from "@/utils/contracts";
import { ipfsJsonUpload } from "@/utils/ipfsUtils";
import {
  calculateDecay,
  CV_PERCENTAGE_SCALE,
  CV_SCALE_PRECISION,
  ETH_DECIMALS,
  MAX_RATIO_CONSTANT,
} from "@/utils/numbers";
import { capitalize, ethAddressRegEx } from "@/utils/text";

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
  passportThreshold?: number;
  isSybilResistanceRequired: boolean;
} & PoolSettings &
  ArbitrationSettings;

type Props = {
  communityAddr: `0x${string}`;
  alloAddr: `0x${string}`;
  token: Pick<TokenGarden, "decimals" | "id" | "symbol">;
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
  isSybilResistanceRequired: [0, 1],
  passportThreshold: [0, 1],
  defaultResolution: [0, 1],
  proposalCollateral: [0, 1],
  disputeCollateral: [0, 1],
  tribunalAddress: [0, 1],
  poolTokenAddress: [0, 1],
};

const shouldRenderInputMap = (key: string, value: number): boolean => {
  return proposalInputMap[key]?.includes(Number(value)) ?? false;
};

export function PoolForm({ token, communityAddr }: Props) {
  const chain = useChainFromPath()!;
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
    watch,
    trigger,
  } = useForm<FormInputs>({
    defaultValues: {
      strategyType: 1,
      pointSystemType: 0,
      defaultResolution: 1,
      minThresholdPoints: 0,
      poolTokenAddress: token.id,
      proposalCollateral: +(
        process.env.NEXT_PUBLIC_DEFAULT_PROPOSAL_COLLATERAL! || 0.002
      ),
      disputeCollateral: +(
        process.env.NEXT_PUBLIC_DEFAULT_DISPUTE_COLLATERAL! || 0.001
      ),
    },
  });
  const isSybilResistanceRequired = watch("isSybilResistanceRequired");
  const INPUT_TOKEN_MIN_VALUE = 1 / 10 ** token.decimals;
  const INPUT_MIN_THRESHOLD_VALUE = 0;

  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<FormInputs>();
  const [optionType, setOptionType] = useState(1);
  const [tribunalAddress, setTribunalAddress] = useState(
    chain.globalTribunal ?? "",
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { publish } = usePubSubContext();
  const watchedAddress = watch("poolTokenAddress").toLowerCase() as Address;
  const { data: customTokenData } = useToken({
    address: watchedAddress ?? "0x",
  });
  const pointSystemType = watch("pointSystemType");
  const strategyType = watch("strategyType");

  const formRowTypes: Record<string, any> = {
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
      parse: (value: string) => value + " days",
    },
    strategyType: {
      label: "Strategy type:",
      parse: (value: string) => PoolTypes[value],
    },
    pointSystemType: {
      label: "Voting Weight System:",
      parse: (value: string) => PointSystems[value],
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
    isSybilResistanceRequired: {
      label: "Sybil resistance enabled:",
      parse: (value: boolean) => (value ? "Yes" : "No"),
    },
    passportThreshold: {
      label: "Passport score required:",
      parse: (value: number) => value,
    },
    defaultResolution: {
      label: "Default resolution:",
      parse: (value: string) =>
        DisputeOutcome[value] == "approved" ? "Approve" : "Reject",
    },
    proposalCollateral: {
      label: "Proposal collateral:",
      parse: (value: string) =>
        value + " " + chain.nativeCurrency?.symbol ?? "ETH",
    },
    disputeCollateral: {
      label: "Dispute collateral:",
      parse: (value: string) =>
        value + " " + chain.nativeCurrency?.symbol ?? "ETH",
    },
    tribunalAddress: {
      label: "Tribunal safe:",
      parse: (value: string) => (
        <EthAddress address={value as Address} icon={"ens"} />
      ),
    },
    poolTokenAddress: {
      label: "Pool token address:",
      parse: (value: string) => (
        <div className="flex gap-2 items-center">
          <EthAddress address={value as Address} />
          <span className="text-black">{customTokenData?.symbol}</span>
        </div>
      ),
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

    const maxRatioNum = spendingLimit / MAX_RATIO_CONSTANT;
    const weightNum = minimumConviction * maxRatioNum ** 2;

    const blockTime = chain.blockTime;
    // pool settings

    const maxRatio = BigInt(Math.round(maxRatioNum * CV_SCALE_PRECISION));
    const weight = BigInt(Math.round(weightNum * CV_SCALE_PRECISION));
    const decay = BigInt(calculateDecay(blockTime, convictionGrowth));

    const minThresholdPoints = parseUnits(
      (previewData?.minThresholdPoints ?? 0).toString(),
      token.decimals,
    );

    const maxAmountStr = (previewData?.maxAmount ?? 0).toString();

    if (!previewData) {
      throw new Error("No preview data");
    }

    writeCreatePool({
      args: [
        previewData.poolTokenAddress as Address,
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
              process.env.NEXT_PUBLIC_DEFAULT_RULING_TIMEOUT ?? 300,
            ),
            submitterCollateralAmount: parseUnits(
              previewData.proposalCollateral.toString(),
              ETH_DECIMALS,
            ),
            challengerCollateralAmount: parseUnits(
              previewData.disputeCollateral.toString(),
              ETH_DECIMALS,
            ),
            tribunalSafe: tribunalAddress as Address,
            arbitrator: chain.arbitrator as Address,
          },
          pointConfig: { maxAmount: parseUnits(maxAmountStr, token.decimals) },
          pointSystem: previewData.pointSystemType,
          proposalType: previewData.strategyType,
          registryCommunity: communityAddr,
          sybilScorer: chain.passportScorer as Address,
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
    abi: abiWithErrors(registryCommunityABI),
    contractName: "Registry Community",
    functionName: "createPool",
    fallbackErrorMessage: "Error creating a pool. Please ty again.",
    onConfirmations: (receipt) => {
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
      if (isSybilResistanceRequired) {
        addStrategy(newPoolData);
      } else {
        setLoading(false);
      }
      router.push(
        pathname?.replace(
          "/create-pool",
          `?${QUERY_PARAMS.communityPage.newPool}=${newPoolData._poolId}`,
        ),
      );
    },
  });

  const addStrategy = async (
    newPoolData: ReturnType<
      typeof getEventFromReceipt<"RegistryCommunity", "PoolCreated">
    >["args"],
  ) => {
    try {
      const res = await fetch("/api/passport-oracle/addStrategy", {
        method: "POST",
        body: JSON.stringify({
          strategy: newPoolData._strategy,
          threshold:
            (previewData?.passportThreshold ?? 0) * CV_PERCENTAGE_SCALE,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.debug(res);
      setLoading(false);
      router.push(
        pathname?.replace(
          "/create-pool",
          `?${QUERY_PARAMS.communityPage.newPool}=${newPoolData._poolId.toString()}`,
        ),
      );
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

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
    setLoading(false);
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
      minThresholdPoints: previewData.minThresholdPoints,
      optionType: previewData.optionType,
      spendingLimit: previewData.spendingLimit,
      minimumConviction: previewData.minimumConviction,
      convictionGrowth: previewData.convictionGrowth,
      isSybilResistanceRequired: previewData.isSybilResistanceRequired,
      passportThreshold: previewData.passportThreshold,
      defaultResolution: previewData.defaultResolution,
      proposalCollateral: previewData.proposalCollateral,
      disputeCollateral: previewData.disputeCollateral,
      tribunalAddress: tribunalAddress,
    };

    Object.entries(reorderedData).forEach(([key, value]) => {
      const formRow = formRowTypes[key];
      if (formRow && shouldRenderInPreview(key)) {
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
    if (key === "passportThreshold") {
      return previewData?.isSybilResistanceRequired;
    } else if (key === "maxAmount") {
      if (previewData?.pointSystemType) {
        return PointSystems[previewData?.pointSystemType] === "capped";
      } else {
        return false;
      }
    } else {
      return shouldRenderInputMap(key, strategyType);
    }
  };

  useEffect(() => {
    if (watchedAddress) {
      trigger("poolTokenAddress");
    }
  }, [customTokenData, watchedAddress, trigger]);

  return (
    <form onSubmit={handleSubmit(handlePreview)} className="w-full">
      {showPreview ?
        <FormPreview
          title={previewData?.title ?? ""}
          description={previewData?.description ?? ""}
          formRows={formatFormRows()}
          previewTitle="Check pool creation details"
        />
      : <div className="flex flex-col gap-6">
          <div className="flex flex-col">
            <FormInput
              label="Pool Name"
              register={register}
              required
              errors={errors}
              registerKey="title"
              type="text"
              placeholder="Your pool name..."
            />
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
            />
          </div>
          <div className="flex flex-col">
            <FormInput
              label="Pool token ERC20 address"
              register={register}
              required
              registerOptions={{
                pattern: {
                  value: ethAddressRegEx,
                  message: "Invalid Eth Address",
                },
                validate: () =>
                  customTokenData?.symbol !== undefined ||
                  "Not a supported ERC20 token",
              }}
              errors={errors}
              registerKey="poolTokenAddress"
              placeholder="0x.."
              type="text"
              className="pr-14"
            >
              {customTokenData?.symbol && (
                <span className="absolute right-4 top-4 text-black">
                  {customTokenData?.symbol}
                </span>
              )}
            </FormInput>
          </div>
          <div className="flex flex-col">
            <FormSelect
              label="Strategy type"
              register={register}
              errors={errors}
              registerKey="strategyType"
              options={Object.entries(PoolTypes)
                .slice(0, -1)
                .map(([value, text]) => ({
                  label: capitalize(text),
                  value: value,
                }))}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <h3 className="my-4 text-xl">Arbitration settings</h3>
              <InfoBox
                infoBoxType="info"
                content={`The tribunal Safe, represented by trusted members, is
                responsible for resolving proposal disputes. The global tribunal
                Safe is a shared option featuring trusted members of the Gardens
                community. Its use is recommended for objective dispute
                resolution.`}
              />
            </div>
            <div className="flex gap-4 mt-2">
              <FormRadioButton
                label="Global gardens tribunal"
                checked={
                  tribunalAddress.toLowerCase() ===
                  chain.globalTribunal?.toLowerCase()
                }
                onChange={() => setTribunalAddress(chain.globalTribunal ?? "")}
                registerKey="tribunalOption"
                value="global"
              />
              <FormRadioButton
                label="Custom tribunal"
                checked={
                  tribunalAddress.toLowerCase() !==
                  chain.globalTribunal?.toLowerCase()
                }
                onChange={() => {
                  setTribunalAddress((oldAddress) =>
                    chain.globalTribunal ? "" : oldAddress,
                  );
                  document.getElementById("tribunalAddress")?.focus();
                }}
                registerKey="tribunalOption"
                value="custom"
              />
            </div>
            <FormAddressInput
              label="Tribunal address"
              registerKey="tribunalAddress"
              onChange={(newValue) => setTribunalAddress(newValue)}
              value={tribunalAddress}
            />
            <div className="flex flex-col">
              <FormSelect
                tooltip="The default resolution will be applied in the case of abstained or dispute ruling timeout."
                label="Default resolution"
                options={Object.entries(DisputeOutcome)
                  .slice(1)
                  .map(([value, text]) => ({
                    label: capitalize(text),
                    value: value,
                  }))}
                registerKey="defaultResolution"
                register={register}
                errors={undefined}
              />
            </div>
            <div className="flex gap-4 max-w-md">
              <FormInput
                tooltip="Proposal submission stake. Locked until proposal is resolved, can be forfeited if disputed."
                type="number"
                label={`Proposal collateral (${chain.nativeCurrency?.symbol ?? "ETH"})`}
                register={register}
                registerKey="proposalCollateral"
                required
                otherProps={{
                  step: 1 / 10 ** ETH_DECIMALS,
                  min: 1 / 10 ** ETH_DECIMALS,
                }}
              />
              <FormInput
                tooltip="Proposal dispute stake. Locked until dispute is resolved, can be forfeited if dispute is denied."
                type="number"
                label={`Dispute collateral (${chain.nativeCurrency?.symbol ?? "ETH"})`}
                register={register}
                registerKey="disputeCollateral"
                required
                otherProps={{
                  step: 1 / 10 ** ETH_DECIMALS,
                  min: 1 / 10 ** ETH_DECIMALS,
                }}
              />
            </div>
          </div>
          <div className="flex flex-col">
            <h4 className="my-4 text-xl">Select pool settings</h4>
            <div className="flex gap-8">
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
                <div className="flex max-w-64 flex-col">
                  <FormInput
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
                      max: {
                        value: 100,
                        message: "Max amount cannot exceed 100%",
                      },
                      min: {
                        value: 1 / CV_SCALE_PRECISION,
                        message: "Amount must be greater than 0",
                      },
                    }}
                  >
                    <span className="absolute right-4 top-4 text-black">%</span>
                  </FormInput>
                </div>
              )}
              {shouldRenderInputMap("minimumConviction", strategyType) && (
                <div className="flex max-w-64 flex-col">
                  <FormInput
                    label="Minimum conviction"
                    register={register}
                    required
                    errors={errors}
                    registerKey="minimumConviction"
                    type="number"
                    placeholder="10"
                    readOnly={optionType !== 0}
                    className="pr-14"
                    otherProps={{
                      step: 1 / CV_SCALE_PRECISION,
                      min: 1 / CV_SCALE_PRECISION,
                    }}
                    registerOptions={{
                      max: {
                        value: 100,
                        message: "Max amount cannot exceed 100%",
                      },
                      min: {
                        value: 1 / CV_SCALE_PRECISION,
                        message: "Amount must be greater than 0",
                      },
                    }}
                  >
                    <span className="absolute right-4 top-4 text-black">%</span>
                  </FormInput>
                </div>
              )}
              <div className="flex max-w-64 flex-col">
                <FormInput
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
                >
                  <span className="absolute right-4 top-4 text-black">
                    days
                  </span>
                </FormInput>
              </div>
            </div>
          </div>
          {shouldRenderInputMap("minThresholdPoints", strategyType) && (
            <div className="flex flex-col">
              <FormInput
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

          <div className="flex flex-col">
            <FormSelect
              label="Pool System"
              register={register}
              errors={errors}
              registerKey="pointSystemType"
              options={Object.entries(PointSystems).map(([value, text]) => ({
                label: text,
                value: value,
              }))}
            />
          </div>
          {pointSystemType == 1 && (
            <div className="flex flex-col">
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
              >
                <span className="absolute right-4 top-4 text-black">
                  {token.symbol}
                </span>
              </FormInput>
            </div>
          )}
          {shouldRenderInputMap("isSybilResistanceRequired", strategyType) && (
            <div className="flex flex-col">
              <FormCheckBox
                label="Add sybil resistance with Gitcoin Passport"
                register={register}
                errors={errors}
                registerKey="isSybilResistanceRequired"
                type="checkbox"
              />
              {isSybilResistanceRequired && (
                <FormInput
                  label="Gitcoin Passport score required"
                  register={register}
                  required
                  registerOptions={{
                    min: {
                      value: 1 / CV_PERCENTAGE_SCALE,
                      message: `Amount must be greater than ${1 / CV_PERCENTAGE_SCALE}`,
                    },
                  }}
                  otherProps={{
                    step: 1 / CV_PERCENTAGE_SCALE,
                    min: 1 / CV_PERCENTAGE_SCALE,
                  }}
                  errors={errors}
                  registerKey="passportThreshold"
                  type="number"
                  placeholder="0"
                />
              )}
            </div>
          )}
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
            <Button onClick={() => createPool()} isLoading={loading}>
              Submit
            </Button>
          </div>
        : <Button type="submit">Preview</Button>}
      </div>
    </form>
  );
}

import React, { ReactNode, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Address, formatUnits, parseUnits, zeroAddress } from "viem";
import { getPoolDataQuery, TokenGarden } from "#/subgraph/.graphclient";
import { AddressListInput } from "./AddressListInput";
import { FormAddressInput } from "./FormAddressInput";
import { FormCheckBox } from "./FormCheckBox";
import { FormInput } from "./FormInput";
import { FormPreview, FormRow } from "./FormPreview";
import { FormSelect } from "./FormSelect";
import { Button } from "../Button";
import { EthAddress } from "../EthAddress";
import { chainConfigMap } from "@/configs/chains";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useSuperfluidToken } from "@/hooks/useSuperfluidToken";
import { cvStrategyABI } from "@/src/generated";
import { DisputeOutcome, PoolTypes, SybilResistanceType } from "@/types";
import {
  calculateDecay,
  CV_PASSPORT_THRESHOLD_SCALE,
  calculateMaxRatioNum,
  convertSecondsToReadableTime,
  CV_SCALE_PRECISION,
  ETH_DECIMALS,
} from "@/utils/numbers";
import { capitalize } from "@/utils/text";
import { parseTimeUnit } from "@/utils/time";

type ArbitrationSettings = {
  defaultResolution: number;
  proposalCollateral: number | string;
  disputeCollateral: number | string;
  tribunalAddress: string;
  rulingTime: number;
};

type FormInputs = {
  spendingLimit: number | string;
  minimumConviction: number | string;
  convictionGrowth: number | string;
  minThresholdPoints: string;
  sybilResistanceValue?: undefined | number | Address[];
  sybilResistanceType: SybilResistanceType;
} & ArbitrationSettings;

type Props = {
  strategy: getPoolDataQuery["cvstrategies"][0];
  token?: Pick<TokenGarden, "decimals">;
  initValues: FormInputs | undefined;
  proposalType: string;
  pointSystemType: number;
  proposalOnDispute: boolean;
  setModalOpen: (value: boolean) => void;
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
      if (addresses.length === 1 && addresses[0] === zeroAddress) {
        return "No protections (anyone can vote)";
      }
      return (
        <div className="flex flex-col">
          <div className="w-fit text-nowrap flex-nowrap">Allow list:</div>
          <ul className="space-y-2 border1 p-2 rounded-xl w-fit resize-y">
            {addresses.map((address) => (
              <li key={address}>
                <EthAddress address={address as Address} showPopup={false} />
              </li>
            ))}
          </ul>
        </div>
      );
    })(),
    gitcoinPassport: `Passport score required: ${value}`,
    goodDollar: "GoodDollar verification required",
  };

  return previewMap[sybilType];
};

const parseAllowListMembers = (
  activeMembers: Address[],
  initialList: Address[],
  currentList: Address[],
) => {
  const initialSet = new Set(initialList);
  const currentSet = new Set(currentList);

  const membersToAdd: Address[] = [];
  const membersToRemove: Address[] = [];

  // Check if transitioning from everyone allowed to allow list
  if (
    initialList.length === 1 &&
    initialList[0] === zeroAddress &&
    currentList.length > 1 // more than just zeroAddress
  ) {
    // We should remove currently staking users (to deactive them from the pool)
    return {
      membersToAdd,
      membersToRemove: [
        zeroAddress,
        ...activeMembers.filter((x) => !membersToAdd.includes(x)), // Force deactive all currently active but excluded members
      ],
    };
  }

  for (const address of initialSet) {
    if (!currentSet.has(address)) {
      membersToRemove.push(address);
    }
  }

  for (const address of currentSet) {
    if (!initialSet.has(address)) {
      membersToAdd.push(address);
    }
  }

  return { membersToAdd, membersToRemove };
};

export default function PoolEditForm({
  token,
  strategy,
  initValues,
  proposalType,
  pointSystemType,
  setModalOpen,
}: Props) {
  const {
    id: chainId,
    nativeCurrency,
    arbitrator,
    globalTribunal,
  } = useChainFromPath()!;
  const nativeDecimals = nativeCurrency?.decimals ?? ETH_DECIMALS;
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormInputs>({
    mode: "onBlur",
    defaultValues:
      initValues ?
        {
          // sybil resistance
          sybilResistanceValue: initValues.sybilResistanceValue,
          sybilResistanceType: initValues.sybilResistanceType,
          //pool settings
          spendingLimit: initValues.spendingLimit,
          minimumConviction: initValues.minimumConviction,
          convictionGrowth: parseTimeUnit(
            +initValues.convictionGrowth,
            "seconds",
            "days",
          ), // convert seconds to days
          minThresholdPoints: initValues.minThresholdPoints,
          // arb settings
          defaultResolution: initValues.defaultResolution,
          rulingTime: parseTimeUnit(
            initValues.rulingTime, // ?? 7 days
            "seconds",
            "days",
          ),
          proposalCollateral: formatUnits(
            BigInt(initValues.proposalCollateral),
            nativeDecimals,
          ),
          disputeCollateral: formatUnits(
            BigInt(initValues.disputeCollateral),
            nativeDecimals,
          ),
          tribunalAddress: initValues.tribunalAddress,
        }
      : undefined,
  });

  const sybilResistanceValue = watch("sybilResistanceValue");

  const derivedType =
    strategy.sybil == null ? "allowList"
    : strategy.sybil.type === "Passport" ? "gitcoinPassport"
    : "goodDollar";

  const formSybilType =
    watch("sybilResistanceType") ??
    initValues?.sybilResistanceType ??
    derivedType;

  useEffect(() => {
    if (initValues?.sybilResistanceValue != null) {
      setValue("sybilResistanceValue", initValues.sybilResistanceValue as any, {
        shouldDirty: false,
      });
    }
  }, [initValues?.sybilResistanceValue, setValue]);

  const INPUT_TOKEN_MIN_VALUE = 1 / 10 ** (token?.decimals ?? 18);
  const INPUT_MIN_THRESHOLD_VALUE = 0;
  const shouldRenderInput = (key: string): boolean => {
    if (
      PoolTypes[proposalType] === "signaling" &&
      (key === "spendingLimit" ||
        key === "minThresholdPoints" ||
        key === "minimumConviction")
    ) {
      return false;
    }
    return true;
  };

  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<FormInputs>();
  const tribunalAddress = watch("tribunalAddress");
  const { superToken } = useSuperfluidToken({
    token: strategy.token,
    enabled: !strategy.config.superfluidToken,
  });

  const [loading, setLoading] = useState(false);
  const { publish } = usePubSubContext();

  const formRowTypes: Record<string, any> = {
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
    minThresholdPoints: {
      label: "Minimum threshold points:",
      parse: (value: string) => {
        // check if string is empty or undefined with ||
        return value || "0";
      },
    },
    sybilResistanceType: {
      label: "Pool voting authorization:",
      parse: () =>
        sybilResistancePreview(
          derivedType,
          Array.isArray(sybilResistanceValue) ? sybilResistanceValue : [],
          sybilResistanceValue?.toString(),
        ),
    },
    defaultResolution: {
      label: "Default resolution:",
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
      parse: (value: string) => value + " " + nativeCurrency?.symbol || "",
    },
    disputeCollateral: {
      label: "Dispute collateral:",
      parse: (value: string) => value + " " + nativeCurrency?.symbol || "",
    },
    tribunalAddress: {
      label: "Tribunal safe:",
      parse: (value: string) => (
        <EthAddress address={value as Address} icon={"ens"} showPopup={false} />
      ),
    },
  };

  const { write: setPoolParamsWrite } = useContractWriteWithConfirmations({
    address: strategy.id as Address,
    contractName: "CV Strategy",
    functionName: "setPoolParams",
    fallbackErrorMessage: "Error editing a pool, please report a bug.",
    onConfirmations: () => {
      publish({
        topic: "pool",
        function: "setPoolParams",
        type: "update",
        id: strategy.poolId,
        chainId: chainId,
      });
    },
    onError: () => {
      setLoading(false);
    },
    onSuccess: () => {
      setModalOpen(false);
    },
    abi: cvStrategyABI,
  });

  const contractWrite = () => {
    setLoading(true);
    if (!previewData) {
      throw new Error("No preview data");
    }
    let spendingLimit: number;
    let minimumConviction;
    let convictionGrowth;

    spendingLimit = previewData.spendingLimit as number;
    minimumConviction = previewData.minimumConviction as number;
    convictionGrowth = previewData.convictionGrowth as number;

    // parse to percentage fraction
    spendingLimit = spendingLimit / 100;
    minimumConviction = minimumConviction / 100;

    const maxRatioNum = calculateMaxRatioNum(spendingLimit, minimumConviction);

    const weightNum = minimumConviction * maxRatioNum ** 2;
    const blockTime = chainConfigMap[chainId!].blockTime;

    // pool settings
    const maxRatio = BigInt(Math.round(maxRatioNum * CV_SCALE_PRECISION));
    const weight = BigInt(Math.round(weightNum * CV_SCALE_PRECISION));
    const decay = BigInt(calculateDecay(blockTime, convictionGrowth));

    const minThresholdPoints = parseUnits(
      (previewData.minThresholdPoints ?? 0).toString(),
      token?.decimals ?? 18,
    );

    const initialAllowList =
      initValues && Array.isArray(initValues?.sybilResistanceValue) ?
        initValues.sybilResistanceValue
      : [];

    const currentAllowList =
      Array.isArray(previewData.sybilResistanceValue) ?
        previewData.sybilResistanceValue
      : [];

    const { membersToAdd, membersToRemove } = parseAllowListMembers(
      strategy.memberActive?.map((x) => x.id as Address) ?? [],
      initialAllowList,
      currentAllowList,
    );

    const sybilValue =
      +(previewData.sybilResistanceValue ?? 0) * CV_PASSPORT_THRESHOLD_SCALE;
    setPoolParamsWrite({
      args: [
        {
          arbitrator: arbitrator as Address,
          tribunalSafe: tribunalAddress as Address,
          submitterCollateralAmount: parseUnits(
            previewData.proposalCollateral.toString(),
            nativeDecimals,
          ),
          challengerCollateralAmount: parseUnits(
            previewData.disputeCollateral.toString(),
            nativeDecimals,
          ),
          defaultRuling: BigInt(previewData.defaultResolution),
          defaultRulingTimeout: BigInt(
            Math.round(
              parseTimeUnit(previewData.rulingTime, "days", "seconds"),
            ),
          ),
        },
        {
          maxRatio: maxRatio,
          weight: weight,
          decay: decay,
          minThresholdPoints: minThresholdPoints,
        },
        BigInt(sybilValue || 0),
        membersToAdd,
        membersToRemove,
        (strategy.config.superfluidToken as Address) ??
          (superToken?.sameAsUnderlying ? undefined : superToken?.id) ??
          zeroAddress,
      ],
    });
  };

  const formatFormRows = () => {
    if (!previewData) {
      return [];
    }
    let formattedRows: FormRow[] = [];

    const reorderedData = {
      sybilResistanceType: previewData.sybilResistanceType,
      sybilResistanceValue: previewData.sybilResistanceValue,
      spendingLimit: previewData.spendingLimit,
      minimumConviction: previewData.minimumConviction,
      convictionGrowth: previewData.convictionGrowth,
      minThresholdPoints: previewData.minThresholdPoints,
      defaultResolution: previewData.defaultResolution,
      rulingTime: previewData.rulingTime,
      proposalCollateral: previewData.proposalCollateral,
      disputeCollateral: previewData.disputeCollateral,
      tribunalAddress: tribunalAddress,
    };

    Object.entries(reorderedData).forEach(([key, value]) => {
      const formRow = formRowTypes[key];
      if (formRow && shouldRenderInput(key)) {
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

  const handlePreview = (data: FormInputs) => {
    setPreviewData(data);
    setShowPreview(true);
  };

  return (
    <>
      <form onSubmit={handleSubmit(handlePreview)}>
        <input
          type="hidden"
          {...register("sybilResistanceType")}
          value={formSybilType}
        />

        {showPreview ?
          <FormPreview
            formRows={formatFormRows()}
            onEdit={() => {
              setShowPreview(false);
              setLoading(false);
            }}
            onSubmit={() => contractWrite()}
          />
        : <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              {derivedType === "gitcoinPassport" ?
                <FormInput
                  label="Gitcoin Passport score"
                  register={register}
                  required={derivedType === "gitcoinPassport"}
                  registerOptions={{
                    valueAsNumber: true,
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
              : derivedType === "allowList" && (
                  <AddressListInput
                    label="Allow list"
                    register={register}
                    registerKey="sybilResistanceValue"
                    addresses={sybilResistanceValue}
                    // required={sybilResistanceType === "allowList"}
                    setValue={setValue}
                    errors={errors}
                    pointSystemType={pointSystemType}
                  />
                )
              }
            </div>
            {/* pool settings section */}
            <div className="flex flex-col">
              <h6 className="mb-4">Conviction params</h6>
              {shouldRenderInput("spendingLimit") && (
                <div className="flex flex-col">
                  <FormInput
                    label="Spending limit"
                    register={register}
                    required
                    errors={errors}
                    registerKey="spendingLimit"
                    type="number"
                    placeholder="20"
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
              {shouldRenderInput("minimumConviction") && (
                <div className="flex flex-col">
                  <FormInput
                    label="Minimum conviction"
                    register={register}
                    required
                    errors={errors}
                    registerKey="minimumConviction"
                    type="number"
                    placeholder="10"
                    className="pr-14"
                    otherProps={{
                      step: 1 / CV_SCALE_PRECISION,
                      min: 1 / CV_SCALE_PRECISION,
                    }}
                    registerOptions={{
                      max: {
                        value: 99.9,
                        message: "Minimum conviction should be under 100%",
                      },
                      min: {
                        value: 1 / CV_SCALE_PRECISION,
                        message: "Minimum conviction must be greater than 0",
                      },
                    }}
                    suffix="%"
                  />
                </div>
              )}
              {shouldRenderInput("convictionGrowth") && (
                <div className="flex flex-col">
                  <FormInput
                    label="Conviction growth"
                    register={register}
                    required
                    errors={errors}
                    registerKey="convictionGrowth"
                    type="number"
                    placeholder="10"
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
              {shouldRenderInput("minThresholdPoints") && (
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
                    otherProps={{
                      step: INPUT_TOKEN_MIN_VALUE,
                      min: INPUT_MIN_THRESHOLD_VALUE,
                    }}
                    required
                    errors={errors}
                    registerKey="minThresholdPoints"
                    type="number"
                    placeholder="0"
                  />
                </div>
              )}
            </div>
            {/* arbitration section */}
            <div className="flex flex-col gap-4">
              <h6 className="mt-4">Arbitration settings</h6>
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
                  step: 1 / 10 ** nativeDecimals,
                  min: 1 / 10 ** nativeDecimals,
                }}
                suffix={nativeCurrency?.symbol ?? ""}
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
                  step: 1 / 10 ** nativeDecimals,
                  min: 1 / 10 ** nativeDecimals,
                }}
                suffix={nativeCurrency?.symbol ?? ""}
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
                    globalTribunal?.toLowerCase()
                  }
                  onChange={() => {
                    setValue(
                      "tribunalAddress",
                      (
                        tribunalAddress.toLowerCase() ===
                          globalTribunal?.toLowerCase()
                      ) ?
                        ""
                      : globalTribunal ?? "",
                    );
                  }}
                />
              </div>
            </div>
          </div>
        }
        <div className="flex w-full items-center justify-end pt-6">
          {showPreview ?
            <div className="flex items-center gap-4">
              <Button
                onClick={() => {
                  setShowPreview(false);
                  setLoading(false);
                }}
                btnStyle="outline"
              >
                Edit
              </Button>
              <Button onClick={() => contractWrite()} isLoading={loading}>
                Submit
              </Button>
            </div>
          : <div className="flex items-center gap-4">
              <Button
                className="flex-1"
                btnStyle="outline"
                color="danger"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button className="flex-1" type="submit">
                Preview
              </Button>
            </div>
          }
        </div>
      </form>
    </>
  );
}

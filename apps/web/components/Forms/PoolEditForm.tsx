import React, { useState } from "react";
import { trimEnd } from "lodash-es";
import { useForm } from "react-hook-form";
import { Address, formatUnits, parseUnits } from "viem";
import { TokenGarden } from "#/subgraph/.graphclient";
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
import { cvStrategyABI } from "@/src/generated";
import { DisputeOutcome, PoolTypes } from "@/types";
import { abiWithErrors } from "@/utils/abiWithErrors";
import {
  calculateDecay,
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
} & ArbitrationSettings;

type Props = {
  strategyAddr: Address;
  token: TokenGarden["decimals"];
  chainId: string;
  initValues: FormInputs;
  proposalType: string;
  proposalOnDispute: boolean;
  setModalOpen: (value: boolean) => void;
};

export default function PoolEditForm({
  token,
  strategyAddr,
  chainId,
  initValues,
  proposalType,
  setModalOpen,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInputs>({
    defaultValues: {
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
        ETH_DECIMALS,
      ),
      disputeCollateral: formatUnits(
        BigInt(initValues.disputeCollateral),
        ETH_DECIMALS,
      ),
      tribunalAddress: initValues.tribunalAddress,
    },
  });

  const INPUT_TOKEN_MIN_VALUE = 1 / 10 ** token.decimals;
  const INPUT_MIN_THRESHOLD_VALUE = 0;
  const shouldRenderInput = (key: string): boolean => {
    if (
      PoolTypes[proposalType] === "signaling" &&
      (key === "spendingLimit" || key === "minThresholdPoints")
    ) {
      return false;
    }
    return true;
  };

  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<FormInputs>();
  const [tribunalAddress, setTribunalAddress] = useState(
    initValues?.tribunalAddress ?? "",
  );
  const [loading, setLoading] = useState(false);
  const { publish } = usePubSubContext();
  const chain = useChainFromPath()!;

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
        <EthAddress address={value as Address} icon={"ens"} />
      ),
    },
  };

  const contractWrite = () => {
    setLoading(true);
    let spendingLimit: number;
    let minimumConviction;
    let convictionGrowth;

    spendingLimit = previewData?.spendingLimit as number;
    minimumConviction = previewData?.minimumConviction as number;
    convictionGrowth = previewData?.convictionGrowth as number;

    // parse to percentage fraction
    spendingLimit = spendingLimit / 100;
    minimumConviction = minimumConviction / 100;

    const maxRatioNum = calculateMaxRatioNum(spendingLimit, minimumConviction);

    const weightNum = minimumConviction * maxRatioNum ** 2;
    const blockTime = chainConfigMap[chainId].blockTime;

    // pool settings
    const maxRatio = BigInt(Math.round(maxRatioNum * CV_SCALE_PRECISION));
    const weight = BigInt(Math.round(weightNum * CV_SCALE_PRECISION));
    const decay = BigInt(calculateDecay(blockTime, convictionGrowth));

    const minThresholdPoints = parseUnits(
      (previewData?.minThresholdPoints ?? 0).toString(),
      token.decimals,
    );

    if (!previewData) {
      throw new Error("No preview data");
    }

    writeEditPool({
      args: [
        {
          arbitrator: chain.arbitrator as Address,
          tribunalSafe: tribunalAddress as Address,
          submitterCollateralAmount: parseUnits(
            previewData.proposalCollateral.toString(),
            token?.decimals,
          ),
          challengerCollateralAmount: parseUnits(
            previewData.disputeCollateral.toString(),
            token?.decimals,
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
      ],
    });
  };

  const formatFormRows = () => {
    if (!previewData) {
      return [];
    }
    let formattedRows: FormRow[] = [];

    const reorderedData = {
      minimumConviction: previewData.minimumConviction,
      convictionGrowth: previewData.convictionGrowth,
      minThresholdPoints: previewData.minThresholdPoints,
      spendingLimit: previewData.spendingLimit,
      defaultResolution: previewData.defaultResolution,
      rulingTime: previewData.rulingTime,
      proposalCollateral: previewData.proposalCollateral,
      disputeCollateral: previewData.disputeCollateral,
      tribunalAddress: tribunalAddress,
    };

    Object.entries(reorderedData).forEach(([key, value]) => {
      const formRow = formRowTypes[key];
      if (
        formRow
        // && shouldRenderInPreview(key)
      ) {
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

  const { write: writeEditPool } = useContractWriteWithConfirmations({
    address: strategyAddr,
    abi: abiWithErrors(cvStrategyABI),
    contractName: "CV Strategy",
    functionName: "setPoolParams",
    fallbackErrorMessage: "Error editing a pool. Please ty again.",
    onConfirmations: () => {
      publish({
        topic: "pool",
        function: "setPoolParams",
        type: "update",
        containerId: strategyAddr,
        chainId: chainId,
      });
    },
    onSettled: () => {
      setLoading(false);
    },
    onSuccess: () => {
      setModalOpen(false);
    },
  });

  const handlePreview = (data: FormInputs) => {
    setPreviewData(data);
    setShowPreview(true);
  };
  return (
    <form
      onSubmit={handleSubmit(handlePreview)}
      className="w-[480px] max-w-2xl"
    >
      {showPreview ?
        <FormPreview
          formRows={formatFormRows()}
          previewTitle="Check pool details"
        />
      : <div className="flex flex-col gap-6">
          {/* pool settings section */}
          <div className="flex flex-col">
            {shouldRenderInput("minimumConviction") && (
              <div className="flex max-w-64 flex-col">
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
              <div className="flex max-w-64 flex-col">
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
            {shouldRenderInput("spendingLimit") && (
              <div className="flex max-w-64 flex-col">
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
                    max: {
                      value: 100,
                      message: "Max amount cannot exceed 100%",
                    },
                    min: {
                      value: 1 / CV_SCALE_PRECISION,
                      message: "Amount must be greater than 0",
                    },
                  }}
                  suffix="%"
                />
              </div>
            )}
          </div>
          {/* arbitration section */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <h6 className="mt-4">Arbitration settings</h6>
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
              suffix={chain.nativeCurrency?.symbol ?? ""}
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
              suffix={chain.nativeCurrency?.symbol ?? ""}
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
                registerKey="tribunalAddress"
                required
                onChange={(newValue) => setTribunalAddress(newValue)}
                value={tribunalAddress}
              />
              <FormCheckBox
                label="Use global tribunal"
                register={register}
                registerKey="useGlobalTribunal"
                type="checkbox"
                tooltip="Check this box to use the Gardens global tribunal Safe to rule on proposal disputes in the Pool, a service we offer if your community does not have an impartial 3rd party that can rule on violations of the Covenant."
                value={
                  tribunalAddress.toLowerCase() ===
                  chain.globalTribunal?.toLowerCase()
                }
                onChange={() => {
                  setTribunalAddress((oldAddress) =>
                    oldAddress === chain.globalTribunal ?
                      ""
                    : chain.globalTribunal ?? "",
                  );
                }}
              />
            </div>
          </div>
        </div>
      }
      <div className="flex w-full items-center justify-center pt-6">
        {showPreview ?
          <div className="flex items-center gap-10">
            <Button
              onClick={() => {
                setShowPreview(false);
                setLoading(false);
              }}
              btnStyle="outline"
            >
              Go Back
            </Button>
            <Button onClick={() => contractWrite()} isLoading={loading}>
              Submit
            </Button>
          </div>
        : <div className="flex items-center gap-10">
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
  );
}

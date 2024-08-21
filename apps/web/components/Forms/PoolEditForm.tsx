import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Address, formatUnits, getAddress, parseUnits } from "viem";
import { TokenGarden } from "#/subgraph/.graphclient";
import { FormAddressInput } from "./FormAddressInput";
import { FormInput } from "./FormInput";
import { FormPreview, FormRow } from "./FormPreview";
import { FormRadioButton } from "./FormRadioButton";
import { FormSelect } from "./FormSelect";
import { Button } from "../Button";
import { EthAddress } from "../EthAddress";
import { InfoBox } from "../InfoBox";
import { chainConfigMap } from "@/configs/chains";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { cvStrategyABI } from "@/src/generated";
import { DisputeOutcome, PoolTypes } from "@/types";
import { abiWithErrors } from "@/utils/abiWithErrors";
import {
  calculateDecay,
  CV_SCALE_PRECISION,
  ETH_DECIMALS,
  MAX_RATIO_CONSTANT,
} from "@/utils/numbers";
import { capitalize } from "@/utils/text";

type ArbitrationSettings = {
  defaultResolution: number;
  proposalCollateral: number | string;
  disputeCollateral: number | string;
  tribunalAddress: string;
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
  proposalOnDispute: isProposalOnDispute,
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
      convictionGrowth: initValues.convictionGrowth,
      minThresholdPoints: initValues.minThresholdPoints,
      // arb settings
      defaultResolution: initValues.defaultResolution,
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
      parse: (value: string) => value + " days",
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

    const maxRatioNum = spendingLimit / MAX_RATIO_CONSTANT;
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
            process.env.NEXT_PUBLIC_DEFAULT_RULING_TIMEOUT ?? 300,
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
    <form onSubmit={handleSubmit(handlePreview)} className=" max-w-2xl">
      {showPreview ?
        <FormPreview
          formRows={formatFormRows()}
          previewTitle="Check pool details"
        />
      : <div className="flex flex-col">
          <div className="flex flex-col gap-6">
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
                >
                  <span className="absolute right-4 top-4 text-black">
                    days
                  </span>
                </FormInput>
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
                >
                  <span className="absolute right-4 top-4 text-black">%</span>
                </FormInput>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <h3 className="my-4 text-xl">Arbitration settings</h3>
              {isProposalOnDispute ?
                <InfoBox
                  infoBoxType="warning"
                  content={
                    "A disputed proposal is pending resolution. Please wait until it's resolved before adjusting proposal dispute settings."
                  }
                />
              : <InfoBox
                  infoBoxType="info"
                  content={`The tribunal Safe, represented by trusted members, is
                      responsible for resolving proposal disputes. The global tribunal
                      Safe is a shared option featuring trusted members of the Gardens
                      community. Its use is recommended for objective dispute
                      resolution.`}
                />
              }
            </div>
            <div className="flex flex-col gap-4">
              {!isProposalOnDispute && (
                <div className="flex gap-4 mt-2">
                  <FormRadioButton
                    label="Global gardens tribunal"
                    checked={
                      tribunalAddress.toLowerCase() ===
                      chain.globalTribunal?.toLowerCase()
                    }
                    onChange={() =>
                      setTribunalAddress(chain.globalTribunal ?? "")
                    }
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
              )}
              <FormAddressInput
                label="Tribunal address"
                registerKey="tribunalAddress"
                register={register}
                required
                onChange={(newValue) => setTribunalAddress(newValue)}
                value={tribunalAddress}
                readOnly={isProposalOnDispute}
              />
              <div className="flex flex-col">
                <FormSelect
                  tooltip="The default resolution will be applied in the case of abstained or dispute ruling timeout."
                  label="Default resolution"
                  required
                  register={register}
                  errors={errors}
                  options={Object.entries(DisputeOutcome)
                    .slice(1)
                    .map(([value, text]) => ({
                      label: capitalize(text),
                      value: +value,
                    }))}
                  registerKey="defaultResolution"
                  readOnly={isProposalOnDispute}
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
                  readOnly={isProposalOnDispute}
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
                  readOnly={isProposalOnDispute}
                />
              </div>
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
        : <Button type="submit">Preview</Button>}
      </div>
    </form>
  );
}

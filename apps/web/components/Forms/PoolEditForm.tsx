import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { Address, parseUnits } from "viem";
import { TokenGarden } from "#/subgraph/.graphclient";
import { FormAddressInput } from "./FormAddressInput";
import { FormInput } from "./FormInput";
import { FormPreview, FormRow } from "./FormPreview";
import { FormRadioButton } from "./FormRadioButton";
import { FormSelect } from "./FormSelect";
import { Button } from "../Button";
import { InfoBox } from "../InfoBox";
import { chainDataMap } from "@/configs/chainServer";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { cvStrategyABI } from "@/src/generated";
import { DisputeOutcome } from "@/types";
import { abiWithErrors } from "@/utils/abiWithErrors";
import {
  calculateDecay,
  CV_SCALE_PRECISION,
  MAX_RATIO_CONSTANT,
} from "@/utils/numbers";
import { capitalize } from "@/utils/text";

type ArbitrationSettings = {
  defaultResolution: number;
  proposalCollateral: number;
  disputeCollateral: number;
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
};

export default function PoolEditForm({
  token,
  strategyAddr,
  chainId,
  initValues,
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
      proposalCollateral: initValues.proposalCollateral,
      disputeCollateral: initValues.disputeCollateral,
      tribunalAddress: initValues.tribunalAddress,
    },
  });
  console.log(initValues);
  const INPUT_TOKEN_MIN_VALUE = 1 / 10 ** token.decimals;
  const INPUT_MIN_THRESHOLD_VALUE = 0;
  const globalTribunalAddress = process.env.NEXT_PUBLIC_GLOBAL_TRIBUNAL_ADDRESS;

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
      parse: (value: string) => DisputeOutcome[value],
    },
    proposalCollateral: {
      label: "Proposal collateral:",
    },
    challengeCollateral: {
      label: "Dispute collateral:",
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

    const blockTime = chainDataMap[chainId].blockTime;

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
    };

    Object.entries(reorderedData).forEach(([key, value]) => {
      const formRow = formRowTypes[key];

      if (formRow) {
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
    onError: () =>
      toast.error("Something went wrong creating a pool, check logs"),
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
                <span className="absolute right-4 top-4 text-black">days</span>
              </FormInput>
            </div>
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
                errors={errors}
                registerKey="minThresholdPoints"
                type="number"
                placeholder="0"
              />
            </div>
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
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <h3 className="my-4 text-xl">Proposal dispute resolution</h3>
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
                checked={tribunalAddress === globalTribunalAddress}
                onChange={() => setTribunalAddress(globalTribunalAddress ?? "")}
                registerKey="tribunalOption"
                value="global"
              />
              <FormRadioButton
                label="Custom tribunal"
                checked={tribunalAddress !== globalTribunalAddress}
                onChange={() => {
                  setTribunalAddress((oldAddress) =>
                    globalTribunalAddress ? "" : oldAddress,
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
                    value: value + 1,
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
              />
              <FormInput
                tooltip="Proposal dispute stake. Locked until dispute is resolved, can be forfeited if dispute is denied."
                type="number"
                label={`Dispute collateral (${chain.nativeCurrency?.symbol ?? "ETH"})`}
                register={register}
                registerKey="disputeCollateral"
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
        : <Button type="submit">Preview</Button>}
      </div>
    </form>
  );
}

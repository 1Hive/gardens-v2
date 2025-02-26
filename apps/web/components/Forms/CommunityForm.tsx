"use client";

import React, { useState } from "react";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { usePathname, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Address, parseUnits } from "viem";
import { TokenGarden } from "#/subgraph/.graphclient";
import { FormAddressInput } from "./FormAddressInput";
import { FormCheckBox } from "./FormCheckBox";
import { FormInput } from "./FormInput";
import { FormPreview, FormRow } from "./FormPreview";
import { Button } from "@/components";
import { QUERY_PARAMS } from "@/constants/query-params";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { registryFactoryABI } from "@/src/generated";
import { getEventFromReceipt } from "@/utils/contracts";
import { ipfsJsonUpload } from "@/utils/ipfsUtils";
import {
  CV_PERCENTAGE_SCALE,
  CV_PERCENTAGE_SCALE_DECIMALS,
} from "@/utils/numbers";
import { ethAddressRegEx } from "@/utils/text";

//protocol : 1 => means ipfs!, to do some checks later

type FormInputs = {
  title: string;
  covenant: string;
  stakeAmount: number;
  isKickMemberEnabled: boolean;
  feeReceiver: string;
  feeAmount: number;
  councilSafe: string;
  ipfsHash: string;
};

type FormRowTypes = {
  label: string;
  parse?: (value: any) => string;
};

export const CommunityForm = ({
  chainId,
  tokenGarden,
  registryFactoryAddr,
}: {
  chainId: number;
  tokenGarden: Pick<TokenGarden, "address" | "symbol" | "decimals">;
  registryFactoryAddr: Address;
}) => {
  const INPUT_TOKEN_MIN_VALUE = 1 / 10 ** (tokenGarden?.decimals ?? 0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
    watch,
    trigger,
  } = useForm<FormInputs>({ mode: "onBlur" });

  const { publish } = usePubSubContext();

  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<FormInputs>();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isConnected, missmatchUrl, tooltipMessage } = useDisableButtons();
  const councilSafe = watch("councilSafe");
  const chainFromPath = useChainFromPath()!;

  const formRowTypes: Record<string, FormRowTypes> = {
    stakeAmount: {
      label: "Member Stake Amount:",
      parse: (value: number) => `${value} ${tokenGarden.symbol}`,
    },
    isKickMemberEnabled: {
      label: "Council can expel members:",
      parse: (value: boolean) => (value ? "Yes" : "No"),
    },
    feeAmount: {
      label: "Community Fee Amount:",
      parse: (value: number) => `${value || "0"}%`,
    },
    feeReceiver: {
      label: "Fee Receiver:",
      parse: (value: string) => value || "0x",
    },
    councilSafe: { label: "Council Safe:" },
  };

  const createCommunity = async () => {
    setLoading(true);
    const json = {
      // image: getValues("image IPFS"), ???
      covenant: getValues("covenant"),
    };

    const ipfsHash = await ipfsJsonUpload(json);
    if (ipfsHash) {
      if (previewData === undefined) {
        throw new Error("No preview data");
      }
      const gardenTokenAddress = tokenGarden.address;
      const communityName = previewData?.title;
      const stakeAmount = parseUnits(
        previewData?.stakeAmount.toString() as string,
        tokenGarden.decimals,
      );
      const communityFeeAmount = parseUnits(
        previewData?.feeAmount.toString() as string,
        CV_PERCENTAGE_SCALE_DECIMALS,
      );

      const communityFeeReceiver =
        previewData?.feeReceiver ||
        "0x0000000000000000000000000000000000000000";
      const councilSafeAddress = previewData?.councilSafe;
      // arb safe 0xda7bdebd79833a5e0c027fab1b1b9b874ddcbd10
      const isKickMemberEnabled = previewData?.isKickMemberEnabled;
      const covenantIpfsHash = ipfsHash;

      write?.({
        args: [
          {
            _allo: chainFromPath.allo as Address,
            _feeReceiver: communityFeeReceiver as Address,
            _communityName: communityName,
            _registerStakeAmount: stakeAmount,
            _communityFee: communityFeeAmount,
            _councilSafe: councilSafeAddress as Address,
            _gardenToken: gardenTokenAddress as Address,
            _isKickEnabled: isKickMemberEnabled,
            _nonce: 0n,
            _registryFactory: registryFactoryAddr,
            covenantIpfsHash: covenantIpfsHash,
            _metadata: { protocol: 1n, pointer: "" },
          },
        ],
      });
    }
    setLoading(false);
  };

  const { write } = useContractWriteWithConfirmations({
    address: registryFactoryAddr,
    abi: registryFactoryABI,
    functionName: "createRegistry",
    contractName: "Registry Factory",
    fallbackErrorMessage: "Error creating community, please report a bug.",
    onConfirmations: async (receipt) => {
      const newCommunityAddr = getEventFromReceipt(
        receipt,
        "RegistryFactory",
        "CommunityCreated",
      ).args._registryCommunity;
      publish({
        topic: "community",
        type: "add",
        function: "createRegistry",
        containerId: tokenGarden.address,
        id: newCommunityAddr, // new community address
      });
      if (pathname) {
        router.push(
          pathname?.replace(
            "/create-community",
            `?${QUERY_PARAMS.gardenPage.newCommunity}=${newCommunityAddr}`,
          ),
        );
      }
    },
    onSettled: () => setLoading(false),
  });

  const handlePreview = (data: FormInputs) => {
    setPreviewData(data);
    setShowPreview(true);
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

    return formattedRows;
  };

  return (
    <form onSubmit={handleSubmit(handlePreview)} className="w-full">
      {showPreview ?
        <FormPreview
          title={previewData?.title ?? ""}
          description={previewData?.covenant ?? ""}
          formRows={formatFormRows()}
        />
      : <div className="flex flex-col gap-2 p-1">
          <div className="flex flex-col">
            <FormInput
              label="Community Name"
              register={register}
              required
              errors={errors}
              registerKey="title"
              type="text"
              placeholder="1hive"
            />
          </div>
          <div className="flex flex-col">
            <FormInput
              label="Membership Stake Amount"
              register={register}
              required
              className="pr-[90px]"
              errors={errors}
              registerKey="stakeAmount"
              type="number"
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
              suffix={tokenGarden.symbol}
              tooltip="Amount of tokens user must stake to join and participate in community governance. Refundable upon leaving the community."
            />
          </div>
          <div className="flex flex-col">
            <FormInput
              label="Community fee %"
              register={register}
              errors={errors}
              registerKey="feeAmount"
              type="number"
              placeholder="0"
              className="pr-14"
              otherProps={{
                step: 1 / CV_PERCENTAGE_SCALE,
                min: 0,
              }}
              registerOptions={{
                max: {
                  value: 100,
                  message: "Max amount cannot exceed 100%",
                },
                min: {
                  value: 0,
                  message: "Amount must be greater than 0",
                },
              }}
              suffix="%"
              tooltip="A percentage fee applied from the membership stake amount when joining a community."
            />
          </div>
          <div className="flex flex-col">
            <FormInput
              label="Community fee Receiver address"
              register={register}
              registerOptions={{
                pattern: {
                  value: ethAddressRegEx,
                  message: "Invalid Eth Address",
                },
              }}
              errors={errors}
              registerKey="feeReceiver"
              placeholder="0x.."
              type="text"
              tooltip="Safe or Ethereum address that receives the fees paid by members."
            />
          </div>
          <div className="flex flex-col">
            <FormAddressInput
              tooltip="The moderators of the community. Choose a Safe address that can create pools and manage settings in the community."
              label="Council Safe address"
              required
              validateSafe
              value={councilSafe}
              placeholder="0x.."
              registerKey="councilSafe"
              register={register}
              errors={errors}
              trigger={trigger}
            />
          </div>

          <div className="flex">
            <FormCheckBox
              label="council safe can remove members"
              register={register}
              errors={errors}
              registerKey="isKickMemberEnabled"
              type="checkbox"
              tooltip="If enabled, the council can remove members from the community. Removed members will receive their staked tokens back and can rejoin later."
            />
          </div>
          <div className="flex flex-col">
            <FormInput
              label="Covenant"
              register={register}
              required
              errors={errors}
              registerKey="covenant"
              onChange={(e) => {
                setValue("covenant", e.target.value);
              }}
              value={getValues("covenant")}
              type="markdown"
              rows={7}
              placeholder="Covenant description..."
            />
            <div className="flex sm:items-center gap-4">
              <a
                href="https://www.notion.so/1hive-gardens/Covenant-the-community-constitution-103d6929d014801da379c5952d66d1a0"
                target="_blank"
                rel="noreferrer"
                className="text-primary-content flex items-center gap-1 hover:opacity-90"
              >
                Tools for creating your Community&apos;s Covenant
                <ArrowTopRightOnSquareIcon
                  width={16}
                  height={16}
                  className="text-primary-content"
                />
              </a>
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
                setLoading(false);
              }}
              btnStyle="outline"
            >
              Edit
            </Button>
            <Button
              onClick={() => createCommunity()}
              isLoading={loading}
              disabled={!isConnected || missmatchUrl}
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

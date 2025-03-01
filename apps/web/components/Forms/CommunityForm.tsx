/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
"use client";

import React, { useState, useEffect } from "react";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { usePathname, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Address, parseUnits } from "viem";
import { useChainId, useSwitchNetwork } from "wagmi";
import { getRegistryFactoryDataDocument } from "#/subgraph/.graphclient";
import { getRegistryFactoryDataQuery } from "#/subgraph/.graphclient";
import { FormCheckBox } from "./FormCheckBox";
import { FormInput } from "./FormInput";
import { FormPreview, FormRow } from "./FormPreview";
import { FormSelect } from "./FormSelect";
import { Button } from "@/components";
import { chainConfigMap, ChainIcon } from "@/configs/chains";
import { QUERY_PARAMS } from "@/constants/query-params";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useERC20Validation } from "@/hooks/useERC20TokenValidation";
import {
  allChains,
  useSubgraphQueryMultiChain,
} from "@/hooks/useSubgraphQueryMultiChain";
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
  chainId: number;
  tokenAddress: string;
};

type FormRowTypes = {
  label: string;
  parse?: (value: any) => string;
};

export const CommunityForm = () => {
  const INPUT_TOKEN_MIN_VALUE = 1 / 10 ** 18;

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
    trigger,
    watch,
  } = useForm<FormInputs>({ mode: "onBlur" });

  const selectedChainId = getValues("chainId");
  const connectedChainId = useChainId();

  const tokenAddress = watch("tokenAddress");

  const { isToken, tokenData } = useERC20Validation({
    address: tokenAddress,
    // enabled: !!selectedChainId,
    chainId: selectedChainId,
  });

  useEffect(() => {
    if (tokenAddress) {
      trigger("tokenAddress");
    }
    console.log(tokenAddress, "trigger");
  }, [tokenAddress]);

  const {
    data: registryFactoryData,
    // fetching
  } = useSubgraphQueryMultiChain<getRegistryFactoryDataQuery>({
    query: getRegistryFactoryDataDocument,
  });

  const registryFactories = registryFactoryData?.map(
    (factory) => factory.registryFactories[0],
  );

  const { publish } = usePubSubContext();

  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<FormInputs>();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isConnected, tooltipMessage } = useDisableButtons();

  const registryFactoryAddr = registryFactories?.find(
    (factory) => factory.chainId === getValues("chainId"),
  )?.id as Address;

  const SUPPORTED_CHAINS = Object.entries(chainConfigMap)
    .filter(([chainId, _]) => allChains.find((id) => id === Number(chainId))) // filters for enabled supported chains
    .filter(([chainId, _]) =>
      registryFactories?.find((factory) => factory.chainId === Number(chainId)),
    ) // filters for registryFactories
    .map(([chainId, chainConfig]) => ({
      name: chainConfig.name,
      chainId: chainId,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const formRowTypes: Record<string, FormRowTypes> = {
    stakeAmount: {
      label: "Member Stake Amount:",
      parse: (value: number) => `${value} ${tokenData.symbol || ""}`,
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
    chainId: {
      label: "Chain:",
      parse: (value: number) =>
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        SUPPORTED_CHAINS.find((c) => c.chainId === value.toString())?.name ||
        "",
    },
    tokenAddress: {
      label: "Community Token Address:",
      parse: (value: string) => value,
    },
  };

  const createCommunity = async () => {
    setLoading(true);

    if (
      selectedChainId &&
      switchNetwork &&
      selectedChainId !== connectedChainId
    ) {
      try {
        await switchNetwork(selectedChainId);
        // Wait a moment for the network switch to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error("Failed to switch networks:", error);
        setLoading(false);
        return;
      }
    }

    const json = {
      covenant: getValues("covenant"),
    };

    const ipfsHash = await ipfsJsonUpload(json);
    if (ipfsHash) {
      if (previewData === undefined) {
        throw new Error("No preview data");
      }
      const govTokenAddr = getValues("tokenAddress") as Address;
      const communityName = previewData?.title;
      const stakeAmount = parseUnits(
        previewData?.stakeAmount.toString() as string,
        tokenData.decimals || 18,
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
            _allo: chainConfigMap[selectedChainId]?.allo as Address,
            _feeReceiver: communityFeeReceiver as Address,
            _communityName: communityName,
            _registerStakeAmount: stakeAmount,
            _communityFee: communityFeeAmount,
            _councilSafe: councilSafeAddress as Address,
            _gardenToken: govTokenAddr as Address,
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
        containerId: getValues("tokenAddress"),
        id: newCommunityAddr,
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
    // enabled: !!selectedChainId,
    chainId: selectedChainId,
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

  const chainOptions = [
    { label: "Select Chain", value: "" },
    ...SUPPORTED_CHAINS.map((network) => ({
      label: network.name,
      value: network.chainId,
      icon: <ChainIcon chain={network.chainId} height={20} />,
    })),
  ];

  const { switchNetwork } = useSwitchNetwork();

  const handleChainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chainId = Number(e.target.value);
    if (chainId) {
      switchNetwork?.(chainId);
    }
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
          <FormSelect
            label="Chain"
            register={register}
            required
            registerKey="chainId"
            options={chainOptions}
            errors={errors}
            tooltip="Select the blockchain network for your community"
            onChange={handleChainChange}
          />

          <div className="flex flex-col">
            <FormInput
              label="Governance Token Address"
              register={register}
              required
              // onChange={() => trigger("tokenAddress")}
              registerOptions={{
                pattern: {
                  value: ethAddressRegEx,
                  message: "Invalid Token Address",
                },
                validate: () =>
                  isToken ||
                  `Not a valid ERC20 token in ${chainConfigMap[selectedChainId]?.name} network`,
              }}
              errors={errors}
              registerKey="tokenAddress"
              placeholder="0x..."
              type="text"
              className="pr-14 font-mono text-sm"
              suffix={tokenData.symbol}
              tooltip="ERC20 token address that will be used for the governance of the community"
            />
          </div>

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
              suffix={tokenData.symbol}
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
            <FormInput
              label="Council Safe address"
              register={register}
              required
              registerOptions={{
                pattern: {
                  value: ethAddressRegEx,
                  message: "Invalid Eth Address",
                },
                // validate: async (value) =>
                //   (await addressIsSAFE(value)) ||
                //   `Not a valid Safe address in ${getChain(getValues("chainId"))?.name} network`,
              }}
              errors={errors}
              registerKey="councilSafe"
              placeholder="0x.."
              type="text"
              tooltip="The moderators of the community. Choose a Safe address that can create pools and manage settings in the community."
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
              disabled={!isConnected}
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

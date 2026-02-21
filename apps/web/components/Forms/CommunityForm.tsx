/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { usePathname, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Address, isAddress, parseUnits } from "viem";
import { erc20ABI, useNetwork, usePublicClient, useSwitchNetwork } from "wagmi";
import { getRegistryFactoryDataDocument } from "#/subgraph/.graphclient";
import { getRegistryFactoryDataQuery } from "#/subgraph/.graphclient";
import FormAddressInput from "./FormAddressInput";
import { FormCheckBox } from "./FormCheckBox";
import { FormInput } from "./FormInput";
import { FormPreview, FormRow } from "./FormPreview";
import { FormSelect } from "./FormSelect";
import { LoadingSpinner } from "../LoadingSpinner";
import { Button } from "@/components";
import { chainConfigMap, ChainIcon } from "@/configs/chains";
import { isProd } from "@/configs/isProd";
import { QUERY_PARAMS } from "@/constants/query-params";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useFlag } from "@/hooks/useFlag";
import { useSubgraphQueryMultiChain } from "@/hooks/useSubgraphQueryMultiChain";
import { registryFactoryABI } from "@/src/generated";
import { getEventFromReceipt } from "@/utils/contracts";
import { ipfsJsonUpload } from "@/utils/ipfsUtils";
import {
  CV_PERCENTAGE_SCALE,
  CV_PERCENTAGE_SCALE_DECIMALS,
} from "@/utils/numbers";
import { ethAddressRegEx } from "@/utils/text";

// Constants
const INPUT_TOKEN_MIN_VALUE = 1 / 10 ** 18;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

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

type TokenData = {
  symbol: string;
  decimals: number;
};

export const CommunityForm = () => {
  // Form hooks
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
    trigger,
    watch,
  } = useForm<FormInputs>({ mode: "onBlur" });

  // States and contexts
  const selectedChainId = watch("chainId");
  const { chain } = useNetwork();
  const connectedChainId = chain?.id;
  const tokenAddress = watch("tokenAddress");
  const councilSafe = watch("councilSafe");
  const { publish } = usePubSubContext();
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<FormInputs>();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const publicClient = usePublicClient();
  const { isConnected, tooltipMessage } = useDisableButtons();
  const { switchNetwork, data: switchNetworkData } = useSwitchNetwork();
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [tokenIsFetching, setTokenIsFetching] = useState<boolean>(false);

  // Effect to validate token address when it changes
  useEffect(() => {
    if ((tokenAddress && switchNetworkData?.id != null) || selectedChainId) {
      trigger("tokenAddress");
    }
  }, [switchNetworkData?.id, connectedChainId, selectedChainId]);

  // Registry factory data query
  const { data: registryFactoryData } =
    useSubgraphQueryMultiChain<getRegistryFactoryDataQuery>({
      query: getRegistryFactoryDataDocument,
    });

  // Memoization of derived values
  const registryFactories = useMemo(
    () => registryFactoryData?.map((factory) => factory.registryFactories[0]),
    [registryFactoryData],
  );

  const registryFactoryAddr = useMemo(
    () =>
      registryFactories?.find(
        (factory) => factory.chainId === getValues("chainId"),
      )?.id as Address,
    [registryFactories, getValues("chainId")],
  );

  const isQueryAllChains = useFlag("queryAllChains");

  const allChains = Object.entries(chainConfigMap)
    .filter(
      ([_, chainConfig]) =>
        isQueryAllChains ||
        (isProd ? !chainConfig.isTestnet : !!chainConfig.isTestnet),
    )
    .map(([chainId]) => Number(chainId));

  const SUPPORTED_CHAINS = useMemo(
    () =>
      Object.entries(chainConfigMap)
        .filter(([chainId, _]) =>
          allChains.find((id) => id === Number(chainId)),
        )
        .filter(([chainId, _]) =>
          registryFactories?.find(
            (factory) => (factory.chainId as string) === chainId,
          ),
        )
        .map(([chainId, chainConfig]) => ({
          name: chainConfig.name,
          chainId: chainId,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [registryFactories],
  );

  const chainOptions = useMemo(
    () => [
      { label: "Select Network", value: "" },
      ...SUPPORTED_CHAINS.map((network) => ({
        label: network.name,
        value: network.chainId,
        icon: <ChainIcon chain={network.chainId} height={20} />,
      })),
    ],
    [SUPPORTED_CHAINS],
  );

  // Form row types definition
  const formRowTypes: Record<string, FormRowTypes> = useMemo(
    () => ({
      stakeAmount: {
        label: "Member Stake Amount:",
        parse: (value: number) => `${value} ${tokenData?.symbol || ""}`,
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
        label: "Network:",
        parse: (value: number) =>
          SUPPORTED_CHAINS.find((c) => c.chainId === value.toString())?.name ||
          "",
      },
      tokenAddress: {
        label: "Community Token Address:",
        parse: (value: string) => value,
      },
    }),
    [SUPPORTED_CHAINS, tokenData?.symbol],
  );

  // Contract write with confirmations
  const { write } = useContractWriteWithConfirmations({
    address: registryFactoryAddr,
    abi: registryFactoryABI,
    functionName: "createRegistry",
    contractName: "Registry Factory",
    fallbackErrorMessage: "Error creating community, please report a bug.",
    onError: () => {
      setLoading(false);
    },
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
            `/${selectedChainId}/${tokenAddress}/${newCommunityAddr}?${QUERY_PARAMS.communityPage.newCommunity}=true`,
          ),
        );
      }
    },
    chainId: selectedChainId,
  });

  // Event handlers
  const handleChainChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const chainId = Number(e.target.value);
      setValue("chainId", chainId);
      if (chainId) {
        switchNetwork?.(chainId);
      }
    },
    [setValue, switchNetwork],
  );

  const handlePreview = useCallback((data: FormInputs) => {
    setPreviewData(data);
    setShowPreview(true);
  }, []);

  const handleBackToEdit = useCallback(() => {
    setShowPreview(false);
    setLoading(false);
  }, []);

  // Function to create community
  const createCommunity = useCallback(async () => {
    if (!previewData) {
      return;
    }

    try {
      setLoading(true);

      // Switch network if necessary
      if (
        selectedChainId &&
        switchNetwork &&
        selectedChainId !== connectedChainId
      ) {
        try {
          await switchNetwork(selectedChainId);
          // Wait for network switch to complete
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error("Failed to switch networks:", error);
          setLoading(false);
          return;
        }
      }

      // Upload covenant to IPFS
      const json = {
        covenant: getValues("covenant"),
      };

      const ipfsHash = await ipfsJsonUpload(json);
      if (!ipfsHash) {
        throw new Error("Failed to upload to IPFS");
      }

      // Prepare transaction data
      const govTokenAddr = getValues("tokenAddress") as Address;
      const communityName = previewData.title;
      const stakeAmount = parseUnits(
        previewData.stakeAmount.toString(),
        tokenData?.decimals ?? 18,
      );
      const communityFeeAmount = parseUnits(
        previewData.feeAmount.toString(),
        CV_PERCENTAGE_SCALE_DECIMALS,
      );

      const communityFeeReceiver = previewData.feeReceiver || ZERO_ADDRESS;
      const councilSafeAddress = previewData.councilSafe;
      const isKickMemberEnabled = previewData.isKickMemberEnabled;

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
            covenantIpfsHash: ipfsHash,
            _metadata: { protocol: 1n, pointer: "" },
          },
        ],
      });
    } catch (error) {
      console.error("Error creating community:", error);
      setLoading(false);
    }
  }, [
    previewData,
    selectedChainId,
    connectedChainId,
    switchNetwork,
    getValues,
    tokenData?.decimals,
    registryFactoryAddr,
    write,
  ]);

  // Format form rows for preview
  const formatFormRows = useCallback((): FormRow[] => {
    if (!previewData) {
      return [];
    }

    return Object.entries(previewData)
      .filter(([key]) => formRowTypes[key])
      .map(([key, value]) => {
        const formRow = formRowTypes[key];
        const parsedValue = formRow.parse ? formRow.parse(value) : value;
        return {
          label: formRow.label,
          data: parsedValue,
        };
      });
  }, [previewData, formRowTypes]);

  const validateTokenAddress = async (address: string) => {
    if (!isAddress(address)) return "Invalid Token Address";
    if (!selectedChainId) return "Please select a chain first";
    if (+selectedChainId !== Number(connectedChainId))
      return `Connect to ${chainConfigMap[selectedChainId]?.name} network`;
    try {
      setTokenIsFetching(true);
      const [symbol, decimals] = await Promise.all([
        publicClient?.readContract({
          address: address as `0x${string}`,
          abi: erc20ABI,
          functionName: "symbol",
        }),
        publicClient?.readContract({
          address: address as `0x${string}`,
          abi: erc20ABI,
          functionName: "decimals",
        }),
      ]);

      if (symbol && typeof decimals === "number") {
        setTokenData({
          symbol: symbol as string,
          decimals: decimals,
        });
        return true;
      } else {
        setTokenData(null);
        return `Not a valid ERC20 token in ${chainConfigMap[selectedChainId]?.name} network`;
      }
    } catch (err) {
      console.error(err);
      setTokenData(null);
      return `Not a valid ERC20 token in ${chainConfigMap[selectedChainId]?.name} network`;
    } finally {
      setTokenIsFetching(false);
    }
  };

  // Conditional rendering
  return (
    <form onSubmit={handleSubmit(handlePreview)} className="w-full">
      {showPreview ?
        <FormPreview
          title={previewData?.title ?? ""}
          description={previewData?.covenant ?? ""}
          formRows={formatFormRows()}
          onEdit={handleBackToEdit}
          onSubmit={() => {
            if (!isConnected) return;
            createCommunity();
          }}
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
            <FormSelect
              label="Governance Token Network"
              register={register}
              required
              registerKey="chainId"
              options={chainOptions}
              errors={errors}
              tooltip="Select the blockchain network for your community governance token"
              onChange={handleChainChange}
            />
          </div>
          <div className="flex flex-col">
            <FormInput
              label="Governance Token Address"
              register={register}
              required
              registerOptions={{
                validate: validateTokenAddress,
              }}
              errors={errors}
              registerKey="tokenAddress"
              placeholder="0x..."
              type="text"
              className="pr-14 font-mono text-sm"
              suffix={
                tokenIsFetching ?
                  <LoadingSpinner className="text-neutral-soft-content" />
                : tokenData ?
                  tokenData?.symbol
                : null
              }
              tooltip="ERC20 token address that will be used for the governance of the community"
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
              placeholder="0.1"
              registerOptions={{
                min: {
                  value: INPUT_TOKEN_MIN_VALUE,
                  message: "Amount must be greater than 0",
                },
              }}
              otherProps={{
                step: INPUT_TOKEN_MIN_VALUE,
                min: INPUT_TOKEN_MIN_VALUE,
              }}
              suffix={tokenData?.symbol}
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
            />
          </div>

          <div className="flex">
            <FormCheckBox
              label="council safe can remove members"
              register={register}
              errors={errors}
              registerKey="isKickMemberEnabled"
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
                className="text-tertiary-content flex items-start gap-1 hover:text-tertiary-hover-content dark:text-tertiary-dark-border dark:hover:text-tertiary-dark-border-hover"
              >
                Tools for creating your Community&apos;s Covenant
                <ArrowTopRightOnSquareIcon
                  width={16}
                  height={16}
                  className="text-inherit"
                />
              </a>
            </div>
          </div>
        </div>
      }
      <div className="flex w-full items-center justify-center py-6">
        {showPreview ?
          <div className="flex items-center gap-10">
            <Button onClick={handleBackToEdit} btnStyle="outline">
              Edit
            </Button>
            <Button
              onClick={createCommunity}
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

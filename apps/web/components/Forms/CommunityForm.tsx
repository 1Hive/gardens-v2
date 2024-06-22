"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { registryFactoryABI, safeABI } from "@/src/generated";
import { Address, Chain, createPublicClient, http, parseUnits } from "viem";
import { useContractWrite } from "wagmi";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { Button } from "@/components";
import { ipfsJsonUpload } from "@/utils/ipfsUtils";
import { toast } from "react-toastify";
import FormPreview, { FormRow } from "./FormPreview";
import { FormInput } from "./FormInput";
import { FormCheckBox } from "./FormCheckBox";
import { FormSelect } from "./FormSelect";
import { TokenGarden } from "#/subgraph/.graphclient";
import { Option } from "./FormSelect";
import { usePathname, useRouter } from "next/navigation";
import { getChain } from "@/configs/chainServer";
import { getChainIdFromPath } from "@/utils/path";
import { SCALE_PRECISION_DECIMALS } from "@/utils/numbers";
import { getContractsAddrByChain } from "@/constants/contracts";
import { usePubSubContext } from "@/contexts/pubsub.context";

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

const ethereumAddressRegEx = /^(0x)?[0-9a-fA-F]{40}$/;
const feeOptions: Option[] = [
  { value: 0, label: "0%" },
  { value: 0.01, label: "1%" },
  { value: 0.02, label: "2%" },
];

export const CommunityForm = ({
  chain,
  tokenGarden,
  registryFactoryAddr,
  alloContractAddr,
}: {
  chain: number;
  tokenGarden: TokenGarden;
  registryFactoryAddr: Address;
  alloContractAddr: Address;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitted },
    getValues,
    setValue,
    reset,
    watch,
  } = useForm<FormInputs>();

  const { publish } = usePubSubContext();

  const INPUT_TOKEN_MIN_VALUE = 1 / 10 ** tokenGarden.decimals;
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<FormInputs>();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // const [file, setFile] = useState<File | null>(null);

  const publicClient = createPublicClient({
    chain: getChain(getChainIdFromPath()) as Chain,
    transport: http(),
  });

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
      parse: (value: number) => `${value * 100 ?? "0"} %`,
    },
    feeReceiver: { label: "Fee Receiver:" },
    councilSafe: { label: "Council Safe:" },
  };

  // const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
  //   if (!e.target.files) return;
  //   const selectedFile = e.target.files[0];

  //   const ipfsUpload = ipfsFileUpload(selectedFile);

  //   toast
  //     .promise(ipfsUpload, {
  //       pending: "Uploading image...",
  //       success: "Successfully uploaded!",
  //       error: "Try uploading banner image again",
  //     })
  //     .then((data) => {
  //       console.log("https://ipfs.io/ipfs/" + data);
  //       setFile(selectedFile);
  //       setIpfsFileHash(data);
  //     })
  //     .catch((error: any) => {
  //       console.error(error);
  //     });
  // };

  const createCommunity = () => {
    setLoading(true);
    const json = {
      // image: getValues("image IPFS"), ???
      covenant: getValues("covenant"),
    };

    const ipfsUpload = ipfsJsonUpload(json);

    toast
      .promise(ipfsUpload, {
        pending: "Preparing everything, wait a moment...",
        // success: "All ready!",
        error: "Error uploading data to IPFS",
      })
      .then((ipfsHash) => {
        console.log("https://ipfs.io/ipfs/" + ipfsHash);
        if (previewData === undefined) throw new Error("No preview data");
        const argsArray = contractWriteParsedData(ipfsHash);
        write?.({ args: [argsArray] });
      })
      .catch((error: any) => {
        console.error(error);
        setLoading(false);
      });
  };

  const { write, error, isError, data } = useContractWrite({
    address: registryFactoryAddr,
    abi: abiWithErrors(registryFactoryABI),
    functionName: "createRegistry",
    onSuccess: () => {
      publish({
        topic: "community",
        type: "add",
        function: "createRegistry",
        containerId: tokenGarden.id,
        chainId: tokenGarden.chainId,
      });
      if (pathname) {
        router.push(pathname?.replace(`/create-community`, ""));
      }
    },
    onError: (err) => {
      console.log(err);
      toast.error("Something went wrong creating Community");
    },
    onSettled: () => setLoading(false),
  });

  const contractWriteParsedData = (ipfsHash: string) => {
    const gardenTokenAddress = tokenGarden?.id;
    const communityName = previewData?.title;
    const stakeAmount = parseUnits(
      previewData?.stakeAmount.toString() as string,
      tokenGarden.decimals,
    );
    const communityFeeAmount = parseUnits(
      previewData?.feeAmount.toString() as string,
      SCALE_PRECISION_DECIMALS,
    );
    const communityFeeReceiver = previewData?.feeReceiver;
    const councilSafeAddress = previewData?.councilSafe;
    // arb safe 0xda7bdebd79833a5e0c027fab1b1b9b874ddcbd10
    const metadata = [1n, "ipfsHash"];
    const isKickMemberEnabled = previewData?.isKickMemberEnabled;
    const covenantIpfsHash = ipfsHash;
    const strategyTemplate = getContractsAddrByChain(chain)?.strategyTemplate;
    if (!strategyTemplate) {
      console.log("No strategy template found for chain", chain);
      toast.error("No strategy template found for chain");
    }
    const args = [
      alloContractAddr,
      gardenTokenAddress,
      stakeAmount,
      communityFeeAmount,
      0n,
      registryFactoryAddr,
      communityFeeReceiver,
      metadata,
      councilSafeAddress,
      communityName,
      isKickMemberEnabled,
      covenantIpfsHash,
      strategyTemplate,
    ];
    console.log(args);

    return args;
  };

  const handlePreview = (data: FormInputs) => {
    setPreviewData(data);
    setShowPreview(true);
  };

  const formatFormRows = () => {
    if (!previewData) return [];
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

  const addressIsSAFE = async (walletAddress: Address) => {
    let isSafe = false;
    try {
      const data = await publicClient.readContract({
        address: walletAddress,
        abi: abiWithErrors(safeABI),
        functionName: "getOwners",
      });
      isSafe = !!data;
    } catch (error) {
      console.log(
        walletAddress + " is not a valid Safe address in the network",
      );
    }
    return isSafe;
  };

  return (
    <form onSubmit={handleSubmit(handlePreview)} className="w-full">
      {showPreview ? (
        <FormPreview
          title={previewData?.title || ""}
          description={previewData?.covenant || ""}
          formRows={formatFormRows()}
          previewTitle="Check details and covenant description"
        />
      ) : (
        <div className="flex flex-col gap-2 overflow-hidden p-1">
          <div className="flex flex-col">
            <FormInput
              label="Community Name"
              register={register}
              required
              errors={errors}
              registerKey="title"
              type="text"
              placeholder="1hive"
            ></FormInput>
          </div>
          <div className="flex flex-col">
            <FormInput
              label="Membership Stake Amount"
              register={register}
              required
              className="pr-14"
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
            >
              <span className="absolute right-4 top-4 text-black">
                {tokenGarden.symbol}
              </span>
            </FormInput>
          </div>
          <div className="flex flex-col">
            <FormSelect
              label="Community fee %"
              register={register}
              errors={errors}
              registerKey="feeAmount"
              options={feeOptions}
            ></FormSelect>
          </div>
          <div className="flex flex-col">
            <FormInput
              label="Community fee Receiver address"
              register={register}
              required
              registerOptions={{
                pattern: {
                  value: ethereumAddressRegEx,
                  message: "Invalid Eth Address",
                },
              }}
              errors={errors}
              registerKey="feeReceiver"
              placeholder="0x.."
              type="text"
            ></FormInput>
          </div>
          <div className="flex flex-col">
            <FormInput
              label="Council Safe address"
              register={register}
              required
              registerOptions={{
                pattern: {
                  value: ethereumAddressRegEx,
                  message: "Invalid Eth Address",
                },
                validate: async (value) =>
                  (await addressIsSAFE(value)) ||
                  `Not a valid Safe address in ${getChain(chain)?.name} network`,
              }}
              errors={errors}
              registerKey="councilSafe"
              placeholder="0x.."
              type="text"
            ></FormInput>
          </div>

          <div className="flex">
            <FormCheckBox
              label="Admins can expel members"
              register={register}
              errors={errors}
              registerKey="isKickMemberEnabled"
              type="checkbox"
            ></FormCheckBox>
          </div>
          <div className="flex flex-col">
            <FormInput
              label="Covenant description"
              register={register}
              required
              errors={errors}
              registerKey="covenant"
              type="textarea"
              rows={7}
              placeholder="Covenant description..."
            ></FormInput>
          </div>

          {/* Upload image */}
          {/* <label htmlFor="cover-photo" className={labelClassname}>
            Banner Image
          </label>
          <div className="mt-2  flex justify-center rounded-lg border border-dashed border-secondary px-6 py-10">
            <div className="text-center">
              {file ? (
                <Image
                  src={URL.createObjectURL(file)}
                  alt="Project cover photo"
                  width={100}
                  height={100}
                />
              ) : (
                <>
                  <div className="mt-4 flex flex-col text-sm leading-6 text-gray-400 ">
                    <PhotoIcon
                      className="mx-auto h-12 w-12 text-secondary"
                      aria-hidden="true"
                    />
                    <label
                      htmlFor={"image"}
                      className="relative cursor-pointer rounded-lg bg-surface font-semibold transition-colors duration-200 ease-in-out focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-200 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 hover:text-primary"
                    >
                      <span className="text-secondary">Upload a file</span>
                      <input
                        id={"image"}
                        name={"image"}
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={(e) => setFile(e.target.files?[0])}
                      />
                    </label>

                    <div className="mt-1 space-y-1">
                      <p className="pl-1 text-black">or drag and drop</p>
                      <p className="text-xs leading-5 text-black">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div> */}
        </div>
      )}
      <div className="flex w-full items-center justify-center py-6">
        {showPreview ? (
          <div className="flex items-center gap-10">
            <Button
              type="button"
              onClick={() => createCommunity()}
              isLoading={loading}
            >
              Submit
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowPreview(false);
                setLoading(false);
              }}
              variant="fill"
            >
              Edit
            </Button>
          </div>
        ) : (
          <Button type="submit">Preview</Button>
        )}
      </div>
    </form>
  );
};

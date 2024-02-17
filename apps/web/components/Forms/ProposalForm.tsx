"use client";
import React, { useEffect, useState, ChangeEvent } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { FormModal } from "./FormModal";
import { registryFactoryABI } from "@/src/generated";
import { parseUnits } from "viem";
import { usePrepareContractWrite, useContractWrite } from "wagmi";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { Button } from "@/components";
import { ipfsJsonUpload } from "@/utils/ipfsUpload";
import { toast } from "react-toastify";

//docs link: https://react-hook-form.com/

//protocol : 1 => means ipfs!, to do some checks later

type FormInputs = {
  type: string;
  title: number;
  amount: number;
  beneficiary: string;
  description: string;
};

type PreviewDataProps = {
  [x: string]: FormInputs;
};
const ethereumAddressRegExp = /^(0x)?[0-9a-fA-F]{40}$/;

export const ProposalForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitted },
    getValues,
    setValue,
    reset,
    watch,
  } = useForm<FormInputs>();

  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  // TODO: add types pr
  const [previewData, setPreviewData] = useState<any>(null); // preview data
  const [metadataIpfs, setMetadataIpfs] = useState<string>(); // ipfs hash of proposal title and description
  const [formData, setFormData] = useState(undefined) as any; // args for contract write

  const handleJsonUpload = () => {
    const sampleJson = {
      title: getValues("title"),
      descripcion: getValues("description"),
    };

    const ipfsUpload = ipfsJsonUpload(sampleJson);

    toast
      .promise(ipfsUpload, {
        pending: "Uploading to IPFS...",
        success: "Successfully uploaded!",
        error: "Something went wrong",
      })
      .then((data) => {
        console.log("https://ipfs.io/ipfs/" + data);
        setMetadataIpfs(data);
      })
      .catch((error: any) => {
        console.error(error);
      });
  };

  const handlePreview = () => {
    handleJsonUpload();

    const data = {
      type: getValues("type"),
      title: getValues("title"),
      amount: getValues("amount"),
      beneficiary: getValues("beneficiary"),
      description: getValues("description"),
    };

    setPreviewData(data);
    setIsEditMode(true);
  };

  // const { config } = usePrepareContractWrite({
  //   //TODO: add dynamic address
  //   //contract for localhost deploy
  //   address: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
  //   //contract for arb sepolia
  //   // address: "0xfbe59fe1a2630311c98b3f3a917bab764397a72b",
  //   abi: abiWithErrors(registryFactoryABI),
  //   functionName: "createRegistry",
  //   args: [formData],
  // });

  // const { write, error, isError, data } = useContractWrite(config);

  const handleInputData = (data: any) => {
    setFormData([]);
  };

  const handleCreateNewCommunity: SubmitHandler<FormInputs> = (data: any) => {
    try {
      handleInputData(data);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  };

  useEffect(() => {
    if (!isSubmitting && isSubmitted) {
      //write?.();
    }
  }, [isSubmitting, isSubmitted]);

  const inputClassname = "input input-bordered input-accent w-full max-w-md";
  const labelClassname = "mb-2 text-xs text-black";

  const proposalType = watch("type");

  return (
    <>
      <FormModal
        label="Create Proposal"
        title={`Create Proposal`}
        description={`Propose and request funds for pool enhancements. Share your vision and request funds for upgrades that benefit the entire community`}
      >
        <form onSubmit={handleSubmit(handleCreateNewCommunity)}>
          {!isEditMode ? (
            <div className="flex flex-col space-y-6 overflow-hidden px-1">
              <div className="flex flex-col">
                <label htmlFor="type" className={labelClassname}>
                  Select Proposal Type
                </label>
                <select
                  itemType="number"
                  className="select select-accent w-full max-w-md"
                  {...register("type", { required: true })}
                >
                  <option value={"1"}>Funding</option>
                  <option value={"2"}>Suggestion</option>
                  <option value={"3"}>Streaming</option>
                </select>
              </div>

              {proposalType === "1" && (
                <>
                  <div className="flex flex-col">
                    <label htmlFor="stake" className={labelClassname}>
                      Requested Amount
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      className={inputClassname}
                      {...register("amount", {
                        required: true,
                      })}
                    />
                  </div>
                </>
              )}
              {(proposalType === "1" || proposalType === "3") && (
                <div className="flex flex-col">
                  <label htmlFor="beneficiary" className={labelClassname}>
                    Beneficary Address
                  </label>
                  <input
                    type="text"
                    placeholder="Add the beneficiary's address"
                    className={inputClassname}
                    {...register("beneficiary", {
                      required: true,
                      pattern: {
                        value: ethereumAddressRegExp,
                        message: "Invalid Eth Address",
                      },
                    })}
                  />
                </div>
              )}
              <div className="flex flex-col">
                <label htmlFor="title" className={labelClassname}>
                  Title
                </label>
                <input
                  type="text"
                  placeholder="Add the title of the proposal"
                  className={inputClassname}
                  {...register("title", {
                    required: true,
                  })}
                />
              </div>

              <label htmlFor="description" className={labelClassname}>
                Proposal Description
              </label>
              <textarea
                className="textarea textarea-accent line-clamp-5"
                placeholder="Add proposal description"
                rows={7}
                {...register("description", {
                  required: true,
                })}
              ></textarea>
            </div>
          ) : (
            <CommunityOverview data={previewData} />
          )}

          <div className="flex w-full items-center justify-center py-6">
            {!isEditMode ? (
              <Button type="button" onClick={handlePreview} variant="fill">
                Preview
              </Button>
            ) : (
              <div className="flex items-center gap-10">
                <Button type="submit">Submit</Button>
                <Button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  variant="fill"
                >
                  Edit
                </Button>
              </div>
            )}
          </div>
        </form>
      </FormModal>
    </>
  );
};

const CommunityOverview: React.FC<PreviewDataProps> = (data) => {
  const { type, title, amount, beneficiary, description } = data.data;

  const proposalType = {
    0: "Funding",
    1: "Signaling",
    2: "Streaming",
  } as any;

  return (
    <>
      <div className="px-4 sm:px-0">
        <p className="mt-0 max-w-2xl text-sm leading-6 text-gray-500">
          Check proposals details
        </p>
      </div>
      <div>
        {data && (
          <div className="relative">
            <PreviewData label="Proposal Type" data={proposalType[type]} />
            {amount && beneficiary && (
              <>
                <PreviewData label="Requested Amount" data={amount} />
                <PreviewData label="Beneficiary" data={beneficiary} />
              </>
            )}

            <div className="divider-default divider"></div>
            <div className="mt-4 flex flex-col items-center space-y-4">
              <h4 className="text-xl font-medium leading-6 text-gray-900">
                {title}
              </h4>
              <p className="text-md max-h-56 overflow-y-auto rounded-xl p-2 text-justify leading-7">
                {description}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const PreviewData = ({ label, data }: { label: string; data: any }) => {
  return (
    <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
      <dt className="text-sm font-medium leading-6 text-gray-900">{label}</dt>
      <dd className="mt-1 text-lg leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
        {data}
      </dd>
    </div>
  );
};

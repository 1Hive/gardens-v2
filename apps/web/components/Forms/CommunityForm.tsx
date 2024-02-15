"use client";
import React, {
  HTMLInputTypeAttribute,
  useEffect,
  useState,
  ChangeEvent,
} from "react";
import {
  useForm,
  SubmitHandler,
  UseFormRegister,
  RegisterOptions,
  FieldValues,
  FieldErrors,
  Path,
} from "react-hook-form";
import { FormModal } from "./FormModal";
import { registryFactoryABI } from "@/src/generated";
import { parseUnits } from "viem";
import { usePrepareContractWrite, useContractWrite } from "wagmi";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { Button } from "@/components";
import { ipfsFileUpload, ipfsJsonUpload } from "@/utils/ipfsUpload";
import { toast } from "react-toastify";
import { PhotoIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
// import { FormInput } from "@/components/Forms"

//docs link: https://react-hook-form.com/

//protocol : 1 => means ipfs!, to do some checks later

type FormInputs = {
  name: string;
  stake: number;
  isKickMemberEnabled: boolean;
  feeReceiver: string;
  feeAmount: number;
  councilSafe: string;
  ipfsHash: string;
};
const ethereumAddressRegExp = /^(0x)?[0-9a-fA-F]{40}$/;

export const CommunityForm = ({ tokenGarden }: { tokenGarden: any }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitted },
    getValues,
    setValue,
    reset,
    watch,
  } = useForm<FormInputs>();

  const [file, setFile] = useState<File>(); //banner image

  const [covenant, setCovenant] = useState<string>();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFile = e.target.files[0];

    const ipfsUpload = ipfsFileUpload(selectedFile);

    toast
      .promise(ipfsUpload, {
        pending: "Uploading image...",
        success: "Successfully uploaded!",
        error: "Try uploading banner image again",
      })
      .then((data) => {
        console.log("https://ipfs.io/ipfs/" + data);
        setFile(selectedFile);
      })
      .catch((error: any) => {
        console.error(error);
      });
  };

  const handleJsonUpload = () => {
    const sampleJson = {
      imagen: file,
      descripcion: covenant,
    };

    if (!file) {
      console.log("no image attached");
      return;
    }

    const ipfsUpload = ipfsJsonUpload(sampleJson);

    toast
      .promise(ipfsUpload, {
        pending: "Uploading to IPFS...",
        success: "Successfully uploaded!",
        error: "Something went wrong",
      })
      .then((data) => {
        console.log("https://ipfs.io/ipfs/" + data);
      })
      .catch((error: any) => {
        console.error(error);
      });
  };

  const hanldePreview = () => {
    if (!file) {
      console.log("no attached data");
    }

    console.log(file);
    console.log(covenant);
  };

  const [formData, setFormData] = useState(undefined) as any;

  //TODO: cleanUp
  const { config } = usePrepareContractWrite({
    //contract for localhost deploy
    address: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    //contract for arb sepolia
    // address: "0xfbe59fe1a2630311c98b3f3a917bab764397a72b",
    abi: abiWithErrors(registryFactoryABI),
    functionName: "createRegistry",

    onError: (err) => {
      console.log(err);
    },
    onSuccess: (data) => {
      console.log(data?.result);
    },
    args: [formData],
  });

  const { write, error, isError, data } = useContractWrite(config);

  //TODO: 1)use custom button for submit and create community
  //TODO   2) handle IPFS submit

  const handleInputData = async (data: any) => {
    if (!data) {
      console.log("data not provided");
    }

    let decimals = 18;

    //contract for localhost deploy:
    const alloContractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
    //contract for arb sepolia:
    //const alloContractAddress = "0x1133ea7af70876e64665ecd07c0a0476d09465a1";
    const gardenTokenAddress = tokenGarden?.id;
    const communityName = data?.name;
    const stakeAmount = parseUnits(data?.stake, decimals);
    const protocolFeeAmount = parseUnits(data?.feeReceiver, decimals);
    const protocolFeeReceiver =
      data?.feeReceiver || "0x0000000000000000000000000000000000000000";
    const councilSafeAddress =
      data?.councilSafe || "0xc05301902A91DcA455Bff2B9beBeE28A4830E3EC";
    const metadata = [1n, "example"];
    const isKickMemberEnabled = data?.isKickMemberEnabled;
    const ipfsHash = "";

    setFormData([
      alloContractAddress,
      gardenTokenAddress,
      stakeAmount,
      0n,
      0n,
      "0x0000000000000000000000000000000000000000",
      protocolFeeReceiver,
      metadata,
      councilSafeAddress,
      communityName,
      isKickMemberEnabled,
      ipfsHash,
    ]);
  };

  const handleCreateNewCommunity: SubmitHandler<FormInputs> = async (
    data: any,
  ) => {
    try {
      await handleInputData(data);

      console.log(formData);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  };

  useEffect(() => {
    if (!isSubmitting && isSubmitted) {
      write?.();
    }
  }, [isSubmitting, isSubmitted]);

  const isKickMemberEnabled = watch("isKickMemberEnabled");
  const inputClassname = "input input-bordered input-info w-full max-w-md";
  const labelClassname = "mb-2 text-xs text-secondary";

  console.log("covenant", covenant);

  return (
    <>
      {/* <div className="m-8 flex max-w-[600px] flex-col gap-4">
        <h3>Upload to Ipfs sample component</h3>
        <input
          type="file"
          onChange={handleFileChange}
          className="file-input file-input-bordered w-full max-w-xs"
        />
        <Button onClick={handleJsonUpload}>Upload Sample Json</Button>
      </div> */}
      <FormModal
        label="Create Community"
        title={`Welcome to the ${tokenGarden?.symbol} Community Form!`}
        description={`Create a vibrant community around the ${tokenGarden.name} by
        providing the necessary details below.`}
      >
        <form onSubmit={handleSubmit(handleCreateNewCommunity)}>
          <div className="flex flex-col space-y-6 overflow-hidden px-1">
            <div className="flex flex-col">
              <label htmlFor="Community Name" className={labelClassname}>
                Community Name
              </label>
              <input
                type="text"
                placeholder="1hive"
                className={inputClassname}
                {...register("name", {
                  required: true,
                })}
              />
            </div>

            <div className="flex flex-col">
              <label htmlFor="stake" className={labelClassname}>
                {`Membership Stake Amount ( ${tokenGarden.symbol} tokens )`}
              </label>
              <input
                type="number"
                placeholder=""
                className={inputClassname}
                {...register("stake", {
                  required: true,
                })}
              />
            </div>

            <div className="flex flex-col">
              <label htmlFor="feeAmount" className={labelClassname}>
                Protocol fee %
              </label>
              <select
                className="select select-accent w-full max-w-md"
                {...register("feeAmount", { required: true })}
              >
                <option>Select %</option>
                <option>0</option>
                <option>1</option>
                <option>2</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label htmlFor="feeReceiver" className={labelClassname}>
                Protocol fee Receiver address
              </label>
              <input
                type="text"
                placeholder="0x.."
                className={inputClassname}
                {...register("feeReceiver", {
                  required: true,
                  pattern: {
                    value: ethereumAddressRegExp,
                    message: "Invalid Eth Address",
                  },
                })}
              />
            </div>

            <div className="flex flex-col">
              <label htmlFor="councilSafe" className={labelClassname}>
                Council safe address
              </label>
              <input
                type="text"
                placeholder="0x.."
                className={inputClassname}
                {...register("councilSafe", {
                  required: true,
                  pattern: {
                    value: ethereumAddressRegExp,
                    message: "Invalid Eth Address",
                  },
                })}
              />
            </div>

            <div className="mb-4 flex items-center">
              <input
                defaultChecked
                id="checkbox-1"
                type="checkbox"
                value=""
                {...register("isKickMemberEnabled")}
                className="checkbox-accent checkbox"
              />
              <label htmlFor="checkbox-1" className="ms-2 text-sm font-medium ">
                {isKickMemberEnabled
                  ? "Admins can expel members"
                  : "Admins can not expel members"}
              </label>
            </div>

            {/* Covenant text */}
            <label htmlFor="councilSafe" className={labelClassname}>
              Covenant descrition
            </label>
            <textarea
              className="textarea textarea-info line-clamp-5"
              placeholder="1Hive is a community of ...The goal of the 1Hive protocol is to foster a healthy community Our Standards...
              Examples of behavior that contributes to a positive environment ..."
              rows={7}
              onChange={(e) => setCovenant(e.target.value)}
            ></textarea>

            {/* Upload image */}
            <label htmlFor="cover-photo" className={labelClassname}>
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
                        // htmlFor={name}
                        className="relative cursor-pointer rounded-lg bg-surface font-semibold transition-colors duration-200 ease-in-out focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-200 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 hover:text-primary"
                      >
                        <span className="text-secondary">Upload a file</span>
                        <input
                          // id={name}
                          // name={name}
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={handleFileChange}
                          // required={required}
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
            </div>
            <Button type="submit">Submit</Button>
            <Button type="button" onClick={hanldePreview}>
              Preview
            </Button>
          </div>
        </form>
      </FormModal>
    </>
  );
};

// type FormInputProps<T extends FieldValues> = {
//   type: HTMLInputTypeAttribute;
//   registerKey: Path<T>;
//   placeholder: string;
//   register: UseFormRegister<T>;
//   required?: boolean | string;
//   registerOptions?: RegisterOptions;
// };

// // TODO: handle errors for each input

// const FormInput = <T extends FieldValues>({
//   type,
//   registerKey,
//   placeholder = "",
//   register,
//   required = false,
//   registerOptions,
// }: FormInputProps<T>) => (
//   <>
//     <input
//       type={type}
//       className={inputClassname}
//       placeholder={placeholder}
//       {...register(registerKey, {
//         required,
//         ...registerOptions,
//       })}
//     />

//     {/* {errors[registerKey] && (
//       <p className="text-red-500">{errors[registerKey]?.message}</p>
//     )} */}
//   </>

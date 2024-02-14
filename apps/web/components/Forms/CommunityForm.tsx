"use client";
import React, { HTMLInputTypeAttribute, useEffect, useState } from "react";
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

  const [registryParams, setRegistryParams] = useState(undefined) as any;

  const { config } = usePrepareContractWrite({
    address: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    abi: abiWithErrors(registryFactoryABI),
    functionName: "createRegistry",
    onSuccess: (data) => {
      console.log(data?.result);
    },
    args: [registryParams],
  });

  console.log(isSubmitting, isSubmitted);
  const { write, error, isError, data } = useContractWrite(config);

  //TODO: 1)use custom button for submit and create community
  //TODO   2) handle IPFS submit

  const handleInputData = async (data: any) => {
    if (!data) {
      console.log("data not provided");
    }

    let decimals = 18;

    const alloContractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
    const gardenTokenAddress = tokenGarden?.id;
    const communityName = data?.name;
    const stakeAmount = parseUnits(data?.stake, decimals).toString();
    const protocolFeeAmount = parseUnits(
      data?.feeReceiver,
      decimals,
    ).toString();
    const protocolFeeReceiver =
      data?.feeReceiver || "0x0000000000000000000000000000000000000000";
    const councilSafeAddress =
      data?.councilSafe || "0xc05301902A91DcA455Bff2B9beBeE28A4830E3EC";
    const metadata = [1n, "example"];
    const isKickMemberEnabled = data?.isKickMemberEnabled;
    const ipfsHash = "";

    setRegistryParams([
      alloContractAddress,
      gardenTokenAddress,
      stakeAmount,
      protocolFeeAmount,
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
      if (!registryParams) {
        console.log("Parameters currently undefined");
      }
      await handleInputData(data);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  };

  useEffect(() => {
    if (!isSubmitting && isSubmitted) {
      write?.();
    }
  }, [isSubmitting, isSubmitted]);

  const ethereumAddressRegExp = /^(0x)?[0-9a-fA-F]{40}$/;
  const isKickMemberEnabled = watch("isKickMemberEnabled");

  return (
    <>
      <FormModal
        label="Create Community"
        title={`Welcome to the ${tokenGarden?.symbol} Community Form!`}
        description={`Create a vibrant community around the ${tokenGarden.name} by
        providing the necessary details below.`}
      >
        <form onSubmit={handleSubmit(handleCreateNewCommunity)}>
          <div className="flex flex-col space-y-6 overflow-hidden p-1">
            <FormInput
              type="text"
              register={register}
              registerKey="name"
              required="Name required"
              placeholder="ComunityName"
            />
            <FormInput
              type="number"
              register={register}
              registerKey="stake"
              required
              placeholder={`Membership Stake Amount (${tokenGarden.symbol} tokens)`}
            />

            <select
              className="select select-accent w-full max-w-md"
              {...register("feeAmount", { required: true })}
            >
              <option>Protocol Fee %</option>
              <option>0.5</option>
              <option>1</option>
              <option>2</option>
            </select>

            <FormInput
              type="text"
              register={register}
              registerKey="feeReceiver"
              registerOptions={{
                required: "required",
                pattern: {
                  value: ethereumAddressRegExp,
                  message: "Invalid Eth Address",
                },
              }}
              required
              placeholder="Protocol Fee Reciever Address"
            />

            {errors.feeReceiver && (
              <p className="text-error">{errors.feeReceiver.message}</p>
            )}
            <FormInput
              type="text"
              register={register}
              registerKey="councilSafe"
              registerOptions={{
                required: true,
                pattern: {
                  value: ethereumAddressRegExp,
                  message: "Invalid Eth Address",
                },
              }}
              required
              placeholder={`Membership Stake Amount (${tokenGarden.symbol} tokens)`}
            />

            {/* <input
              type="text"
              placeholder="Test with a random ipfsHash"
              className="input input-bordered input-info w-full max-w-md"
              {...register("ipfsHash", {
                required: true,
              })}
            /> */}
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
                  ? "Grant admin permission to expel members"
                  : "Not allow admin expel memebr"}
              </label>
            </div>

            <Button type="submit">submit</Button>
          </div>
        </form>
      </FormModal>
    </>
  );
};

type FormInputProps<T extends FieldValues> = {
  type: HTMLInputTypeAttribute;
  registerKey: Path<T>;
  placeholder: string;
  register: UseFormRegister<T>;
  required?: boolean | string;
  registerOptions?: RegisterOptions;
};

// TODO: handle errors for each input

const FormInput = <T extends FieldValues>({
  type,
  registerKey,
  placeholder = "",
  register,
  required = false,
  registerOptions,
}: FormInputProps<T>) => (
  <>
    <input
      type={type}
      className="input input-bordered input-info w-full max-w-md"
      placeholder={placeholder}
      {...register(registerKey, {
        required,
        ...registerOptions,
      })}
    />

    {/* {errors[registerKey] && (
      <p className="text-red-500">{errors[registerKey]?.message}</p>
    )} */}
  </>
);

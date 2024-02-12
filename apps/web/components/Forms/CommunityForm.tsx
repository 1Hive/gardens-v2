"use client";
import React, { HTMLInputTypeAttribute, useState } from "react";
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
import { encodeFunctionParams } from "@/utils/encodeFunctionParams";

// Params to pass to the form:
// params._allo = address(allo());
// params._gardenToken = IERC20(address(token));

// registerStakeAmount = params._registerStakeAmount; //@todo can be zero? // number
// communityFee = params._communityFee; //number
// isKickEnabled = params._isKickEnabled; //boolean
// communityName = params._communityName; //string
// covenantIpfsHash = params.covenantIpfsHash; // Image + Covenant ???
// councilSafe = Safe(params._councilSafe); //address
// feeReceiver = params._feeReceiver; // address

// registryFactory = params._registryFactory; //

//docs link: https://react-hook-form.com/

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
    reset,
    watch,
  } = useForm<FormInputs>();

  const [registryParams, setRegistryParams] = useState();

  console.log("tokenGarden", tokenGarden);

  //TODO 1) handle IPFS submit
  //TODO: 2) encode parameters
  //TODO:  3) write to contracts > func: "createRegistry" , address: ""
  const onSubmit: SubmitHandler<FormInputs> = async (data: any) => {
    const {
      name,
      stake,
      isKickMemberEnabled,
      feeReceiver,
      feeAmount,
      councilSafe,
      ipfsHash,
    } = data;

    setRegistryParams(data);

    console.log("Community Name", name);
    console.log("Stake Amount ", stake);
    console.log("isKickMemberEnabled ", isKickMemberEnabled);
    console.log("feeReceiver Address", feeReceiver);
    console.log("feeAmount", feeAmount);
    console.log("councilSafe Address", councilSafe);
    console.log("ipfshash", ipfsHash);
  };

  const ethereumAddressRegExp = /^(0x)?[0-9a-fA-F]{40}$/;
  const isKickMemberEnabled = watch("isKickMemberEnabled");

  return (
    <>
      <FormModal
        label="Create Community"
        title={`Welcome to the ${tokenGarden?.symbol}  Creation Form!`}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col space-y-6 overflow-hidden px-1">
            <input
              type="text"
              placeholder="Community Name"
              className="input input-bordered input-info w-full max-w-md"
              {...register("name", {
                required: true,
              })}
            />

            <input
              type="number"
              placeholder={`Membership Stake Amount (${tokenGarden.symbol} tokens)`}
              className="input input-bordered input-info w-full max-w-md"
              {...register("stake", {
                required: true,
              })}
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
            <input
              type="text"
              placeholder="Protocol Fee Reciever Address"
              className="input input-bordered input-info w-full max-w-md"
              {...register("feeReceiver", {
                required: true,
                pattern: {
                  value: ethereumAddressRegExp,
                  message: "Invalid Eth Address",
                },
              })}
            />
            <input
              type="text"
              placeholder="Council Safe Address"
              className="input input-bordered input-info w-full max-w-md"
              {...register("councilSafe", {
                required: true,
                pattern: {
                  value: ethereumAddressRegExp,
                  message: "Invalid Eth Address",
                },
              })}
            />
            <input
              type="text"
              placeholder="Test with a random ipfsHash"
              className="input input-bordered input-info w-full max-w-md"
              {...register("ipfsHash", {
                required: true,
              })}
            />
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
                  ? "Enable admin to kick members"
                  : "Disabled admin tokick members"}
              </label>
            </div>

            <button type="submit" className="btn btn-primary">
              Submit
            </button>
          </div>
        </form>
      </FormModal>
    </>
  );
};

// TODO: Abstract input component
// type FormInputProps<T extends FieldValues> = {
//   type: HTMLInputTypeAttribute;
//   label: string;
//   registerKey: Path<T>;
//   placeholder: string;
//   register: UseFormRegister<T>;
//   required?: boolean | string;
//   //errors: DeepMap<T, FieldErrors>;
//   registerOptions?: RegisterOptions;
// };

// //TODO: handle errors for each input

// const FormInput = <T extends FieldValues>({
//   type,
//   label,
//   registerKey,
//   placeholder = "",
//   register,
//   required = false,
//   //   errors,
//   registerOptions,
// }: FormInputProps<T>) => (
//   <div className="group relative z-0 mb-5 w-full">
//     <input
//       type={type}
//       className="peer block w-full appearance-none border-0 border-b-2 border-gray-300 bg-transparent px-0 py-2.5 text-sm text-gray-900 focus:border-secondary focus:outline-none focus:ring-0"
//       placeholder={placeholder}
//       {...register(registerKey, {
//         required,
//         ...registerOptions,
//       })}
//     />
//     <label className="absolute top-3 -z-10 origin-[0] -translate-y-6 scale-75 transform text-sm text-gray-500 duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:start-0 peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:font-medium peer-focus:text-slate-600 rtl:peer-focus:left-auto rtl:peer-focus:translate-x-1/4">
//       {label}
//     </label>
//     {/* {errors[registerKey] && (
//       <p className="text-red-500">{errors[registerKey]?.message}</p>
//     )} */}
//   </div>
// );

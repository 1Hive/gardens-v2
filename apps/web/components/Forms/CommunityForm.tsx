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
import { encodeFunctionParams } from "@/utils/encodeFunctionParams";
import {
  encodeAbiParameters,
  parseAbiParameters,
  getAbiItem,
  formatUnits,
  parseUnits,
} from "viem";
import { usePrepareContractWrite, useContractWrite } from "wagmi";
import { abiWithErrors } from "@/utils/abiWithErrors";
// Params to pass to the form:
// params._allo = address(allo()); // 0x1133ea7af70876e64665ecd07c0a0476d09465a1
// params._gardenToken = IERC20(address(token)); // > taken form props

// registerStakeAmount = params._registerStakeAmount; // number
// communityFee = params._communityFee; //number
// isKickEnabled = params._isKickEnabled; //boolean
// communityName = params._communityName; //string
// covenantIpfsHash = params.covenantIpfsHash; // Image + Covenant ???
// councilSafe = Safe(params._councilSafe); address =>0xa872c9fda78f9211758e79fdb651a00d54b8f08e
// feeReceiver = params._feeReceiver; // address =>
//0x98d1d9413176413c25fe306bcdb2614bb2976e69

// registryFactory = params._registryFactory; => 0xfbe59fe1a2630311c98b3f3a917bab764397a72b

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
    chainId: 1337,
    onError: (err) => {
      console.log(err);
    },
    onSettled: (data) => {
      console.log(data?.result);
    },
    args: [registryParams],
  });

  const { write, error, isError, data } = useContractWrite(config);

  //TODO: 1)use custom button for submit and create community
  //TODO   2) handle IPFS submit
  //TODO:   3) write to contracts > func: "createRegistry" , address: ""

  const handleInputData = async (data: any) => {
    setRegistryParams([
      "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
      data.stake,
      1n,
      0n,
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000",
      [1n, "Example"],
      "0xc05301902A91DcA455Bff2B9beBeE28A4830E3EC",
      data.name,
      false,
      "",
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

      const { name, stake } = data;
      console.log("Community Name:", name);
      console.log("Stake Amount:", stake);
    } catch (error) {
      console.error("An error occurred:", error);
    }

    //"0xc05301902A91DcA455Bff2B9beBeE28A4830E3EC",
    // const parameters = [];
    // for (const key in data) {
    //   if (data.hasOwnProperty(key)) {
    //     parameters.push(data[key]);
    //   }
    // }
  };

  useEffect(() => {
    // Ensure the contract write is prepared when registryParams changes
    if (registryParams) {
      // You may need to adjust the arguments depending on the specific requirements of your use case
      write?.();
    }
  }, [registryParams]);

  const ethereumAddressRegExp = /^(0x)?[0-9a-fA-F]{40}$/;
  const isKickMemberEnabled = watch("isKickMemberEnabled");
  console.log(registryParams);

  return (
    <>
      <button onClick={() => write?.()}>write</button>

      <FormModal
        label="Create Community"
        title={`Welcome to the ${tokenGarden?.symbol}  Creation Form!`}
      >
        <form onSubmit={handleSubmit(handleCreateNewCommunity)}>
          <div className="flex flex-col space-y-6 overflow-hidden px-1">
            <input
              type="text"
              placeholder="Community Name"
              className="input input-bordered input-info w-full max-w-md"
              {...register("name", {
                required: true,
              })}
            />
            {errors.name && <p className="text-black">{errors.name.message}</p>}

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
                required: "required field",
                pattern: {
                  value: ethereumAddressRegExp,
                  message: "Invalid Eth Address",
                },
              })}
            />
            {errors.feeReceiver && (
              <p className="text-error">{errors.feeReceiver.message}</p>
            )}
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
                  ? "Grant admin kick members permission"
                  : "Not allow admin kick members"}
              </label>
            </div>

            <button type="submit" className="btn btn-primary">
              {isSubmitting ? "loading" : "submit"}
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

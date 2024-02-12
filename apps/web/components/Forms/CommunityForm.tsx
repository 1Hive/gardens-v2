"use client";
import React from "react";
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

// Params to pass to the form
// registerStakeAmount = params._registerStakeAmount; //@todo can be zero? // number
// communityFee = params._communityFee; //number
// isKickEnabled = params._isKickEnabled; //boolean
// communityName = params._communityName; //string
// covenantIpfsHash = params.covenantIpfsHash; // Image + Covenant ???
// registryFactory = params._registryFactory; //
// feeReceiver = params._feeReceiver; // address
// councilSafe = Safe(params._councilSafe); //address

//docs link: https://react-hook-form.com/

type FormInputs = {
  name: string;
  stake: number;
};

export const CommunityForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitted },
    getValues,
    reset,
  } = useForm<FormInputs>();

  const onSubmit: SubmitHandler<FormInputs> = async (data: any) => {
    //TODO handle IPFS submit
    //TODO: handle encode parameters
    //TODO: handle write to contracts
    console.log(data);
  };

  //console.log(errors);

  return (
    <>
      <FormModal label="Create Community">
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormInput
            type="text"
            label="Community Name"
            registerKey="name"
            register={register}
            required={"Address required"}
            // errors={errors as FieldErrors<FormInputs>}
            registerOptions={
              {
                //EXAMPLES:
                // minLength: { value: 10, message: "to short" },
                //pattern: { value: /^[A-Za-z]+$/, message: "Invalid name" },
                //validate:(value) => value.includes("a")
              }
            }
            placeholder=""
          />
          {errors.name && <p className="text-error">{errors.name.message}</p>}

          <button type="submit" className="btn btn-primary">
            Submit
          </button>
        </form>
      </FormModal>
    </>
  );
};

type FormInputProps<T extends FieldValues> = {
  type: string;
  label: string;
  registerKey: Path<T>;
  placeholder: string;
  register: UseFormRegister<T>;
  required?: boolean | string;
  //errors: DeepMap<T, FieldErrors>;
  registerOptions?: RegisterOptions;
};

//TODO: handle errors for each input

const FormInput = <T extends FieldValues>({
  type,
  label,
  registerKey,
  placeholder = "",
  register,
  required = false,
  //   errors,
  registerOptions,
}: FormInputProps<T>) => (
  <div className="group relative z-0 mb-5 w-full">
    <label className="absolute top-3 -z-10 origin-[0] -translate-y-6 scale-75 transform text-sm text-gray-500 duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:start-0 peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:font-medium peer-focus:text-slate-600 rtl:peer-focus:left-auto rtl:peer-focus:translate-x-1/4">
      {label}
    </label>
    <input
      type={type}
      className="peer block w-full appearance-none border-0 border-b-2 border-gray-300 bg-transparent px-0 py-2.5 text-sm text-gray-900 focus:border-secondary focus:outline-none focus:ring-0"
      placeholder={placeholder}
      {...register(registerKey, {
        required,
        ...registerOptions,
      })}
    />
    {/* {errors[registerKey] && (
      <p className="text-red-500">{errors[registerKey]?.message}</p>
    )} */}
  </div>
);

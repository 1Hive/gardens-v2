"use client";
import { HTMLInputTypeAttribute } from "react";
import {
  FieldValues,
  Path,
  RegisterOptions,
  UseFormRegister,
} from "react-hook-form";

type FormInputProps<T extends FieldValues> = {
  type: HTMLInputTypeAttribute;
  registerKey: Path<T>;
  placeholder: string;
  register: UseFormRegister<T>;
  required?: boolean | string;
  registerOptions?: RegisterOptions;
};

//TODO: handle errors for each input

export const FormInput = <T extends FieldValues>({
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

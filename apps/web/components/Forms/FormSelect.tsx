import React from "react";
import { RegisterOptions } from "react-hook-form";

export type Option = { label: string; value: string | number };

type Props = {
  label: string;
  registerKey: any;
  register: any;
  errors: any;
  required?: boolean;
  registerOptions?: RegisterOptions;
  options: Option[];
};

export function FormSelect({
  label = "",
  registerKey,
  register,
  errors,
  required = false,
  registerOptions,
  options,
}: Props) {
  return (
    <>
      <label htmlFor={registerKey} className="my-2 text-lg text-black">
        {label}
      </label>
      <select
        className="select select-info w-full max-w-md"
        id={registerKey}
        {...register(registerKey, {
          required,
          ...registerOptions,
        })}
      >
        {options.map(({ value, label }, index) => (
          <option value={value} key={index + "_" + value}>
            {label}
          </option>
        ))}
      </select>
    </>
  );
}

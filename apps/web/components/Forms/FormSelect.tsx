import React from "react";
import { RegisterOptions } from "react-hook-form";
import { InfoIcon } from "../InfoIcon";

export type Option = { label: string; value: string | number };

type Props = {
  label: string;
  registerKey: any;
  register: any;
  errors: any;
  required?: boolean;
  registerOptions?: RegisterOptions;
  options: Option[];
  tooltip?: string;
};

export function FormSelect({
  label = "",
  registerKey,
  register,
  required = false,
  registerOptions,
  options,
  tooltip,
}: Props) {
  return (
    <>
      <label htmlFor={registerKey} className="label w-fit">
        {tooltip ?
          <InfoIcon tooltip={tooltip}>{label}</InfoIcon>
        : label}
      </label>
      <select
        className="select select-info w-full max-w-md"
        id={registerKey}
        {...register(registerKey, {
          required,
          ...registerOptions,
        })}

      >
        {options.map(({ value, label: lab }) => (
          <option value={value} key={value}>
            {lab}
          </option>
        ))}
      </select>
    </>
  );
}

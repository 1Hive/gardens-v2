import React from "react";
import { RegisterOptions } from "react-hook-form";
import { InfoWrapper } from "../InfoWrapper";

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
  readOnly?: boolean;
  disabled?: boolean;
};

export function FormSelect({
  label = "",
  registerKey,
  register,
  required = false,
  registerOptions,
  options,
  tooltip,
  readOnly,
  disabled,
}: Props) {
  return (
    <>
      <label htmlFor={registerKey} className="label w-fit">
        {tooltip ?
          <InfoWrapper tooltip={tooltip}>{label}</InfoWrapper>
        : label}
      </label>
      <select
        className={`select select-info w-full max-w-md ${readOnly ? "!border-gray-300 focus:outline !outline-gray-300 !pointer-events-none bg-none	" : ""}`}
        id={registerKey}
        {...register(registerKey, {
          required,
          readOnly,
          disabled,
          ...registerOptions,
        })}
        disabled={disabled}
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

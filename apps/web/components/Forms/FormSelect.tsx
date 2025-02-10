import React from "react";
import { RegisterOptions, UseFormRegister } from "react-hook-form";
import { InfoWrapper } from "../InfoWrapper";

export type Option = { label: string; value: string | number };

type Props = {
  label: string;
  registerKey: any;
  register?: UseFormRegister<any>;
  errors?: any;
  required?: boolean;
  registerOptions?: RegisterOptions;
  placeholder?: string;
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
  placeholder,
  options,
  tooltip,
  readOnly,
  disabled,
  errors,
}: Props) {
  const hasError = errors?.[registerKey];

  return (
    <div className="flex flex-col">
      <label htmlFor={registerKey} className="label w-fit cursor-pointer">
        {tooltip ?
          <InfoWrapper tooltip={tooltip}>
            {label}
            {required && <span className="ml-1">*</span>}
          </InfoWrapper>
        : <>
            {label}
            {required && <span className="ml-1">*</span>}
          </>
        }
      </label>
      <select
        className={`select select-info w-full max-w-md ${
          readOnly &&
          "!border-gray-300 focus:none !outline-gray-300 !pointer-events-none bg-transparent !cursor-not-allowed"
        }`}
        id={registerKey}
        {...register?.(registerKey, {
          required,
          disabled,
          ...registerOptions,
        })}
        disabled={disabled}
        defaultValue={""}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(({ value, label: lab }) => (
          <option value={value} key={value}>
            {lab}
          </option>
        ))}
      </select>
      {hasError && (
        <span className="text-danger-content text-sm mt-2">
          {hasError.message || "This field is required"}
        </span>
      )}
    </div>
  );
}

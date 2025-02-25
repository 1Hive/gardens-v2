import React, { ChangeEvent } from "react";
import { RegisterOptions, UseFormRegister } from "react-hook-form";
import { InfoWrapper } from "../InfoWrapper";

export type Option = { label: string; value: string | number };

interface Props {
  label: string;
  registerKey: string;
  register?: UseFormRegister<any>;
  errors?: any;
  required?: boolean;
  registerOptions?: RegisterOptions;
  placeholder?: string;
  options: { label: string; value: string }[];
  tooltip?: string;
  readOnly?: boolean;
  disabled?: boolean;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
}

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
  value,
  onChange,
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
        defaultValue={value}
        onChange={onChange}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(({ value: val, label: lab }) => (
          <option value={val} key={val}>
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

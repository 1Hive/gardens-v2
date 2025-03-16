import React, { ChangeEvent } from "react";
import { RegisterOptions, UseFormRegister } from "react-hook-form";
import { InfoWrapper } from "../InfoWrapper";

export type Option = {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
};

interface Props {
  label?: string;
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
  className?: string;
}

export function FormSelect({
  label,
  registerKey,
  register,
  required = false,
  registerOptions,
  placeholder,
  options,
  className,
  tooltip,
  readOnly,
  disabled,
  errors,
  value,
  onChange,
}: Props) {
  const hasError = errors?.[registerKey];

  // Create a combined onChange handler
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      onChange(e);
    }
  };

  // Register with react-hook-form
  const registered = register?.(registerKey, {
    required,
    disabled,
    onChange: (e) => {
      handleChange(e);
      if (registerOptions?.onChange) {
        registerOptions.onChange(e);
      }
    },
    value: value ?? registerOptions?.value,
    ...registerOptions,
  });

  return (
    <div className="flex flex-col">
      {label && (
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
      )}
      <select
        className={`select select-info w-full max-w-md ${className} ${
          readOnly &&
          "!border-gray-300 focus:none !outline-gray-300 !pointer-events-none bg-transparent !cursor-not-allowed"
        } ${hasError && "!border-danger-content focus:!border-danger-content"}`}
        id={registerKey}
        {...registered}
        onChange={onChange}
        required={required}
        disabled={disabled}
        defaultValue={value}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
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

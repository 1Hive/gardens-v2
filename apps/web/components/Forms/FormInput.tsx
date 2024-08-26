/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
"use client";

import { HTMLInputTypeAttribute } from "react";
import { RegisterOptions } from "react-hook-form";
import { InfoWrapper } from "../InfoWrapper";

type Props = {
  label?: string;
  subLabel?: string | undefined;
  type: HTMLInputTypeAttribute;
  registerKey?: string;
  placeholder?: string;
  register?: any;
  errors?: any;
  required?: boolean;
  registerOptions?: RegisterOptions;
  children?: any;
  rows?: number;
  readOnly?: boolean;
  disabled?: boolean;
  otherProps?: any;
  className?: string;
  value?: string | number;
  step?: number | string;
  tooltip?: string;
  onChange?: (value: any) => void;
};

export function FormInput({
  label,
  subLabel,
  type,
  registerKey = "",
  placeholder = "",
  register = () => ({}),
  errors = false,
  required = false,
  registerOptions,
  children,
  rows,
  readOnly,
  disabled,
  otherProps,
  className,
  value = undefined,
  step,
  tooltip,
  onChange,
}: Props) {
  const fixedInputClassname =
    "!border-gray-300 focus:border-gray-300 focus:outline-gray-300 cursor-not-allowed bg-transparent";
  return (
    <div className="flex flex-col">
      {label && (
        <label htmlFor={registerKey} className="label cursor-pointer ">
          {tooltip ?
            <InfoWrapper tooltip={tooltip}>{label}</InfoWrapper>
          : label}
        </label>
      )}
      {subLabel && <p className="mb-1 text-xs">{subLabel}</p>}
      <div className={`relative ${type !== "textarea" && "max-w-md"}`}>
        {type !== "textarea" ?
          <input
            id={registerKey}
            onChange={onChange}
            value={value}
            type={type}
            placeholder={placeholder}
            className={`hide-input-arrows input input-bordered ${errors[registerKey] ? "input-error" : "input-info"} w-full ${readOnly && fixedInputClassname} ${className}`}
            required={required}
            step={step}
            disabled={disabled || readOnly}
            readOnly={readOnly || disabled}
            {...register(registerKey, {
              required,
              readOnly,
              disabled,
              ...registerOptions,
            })}
            {...otherProps}
          />
        : <textarea
            placeholder={placeholder}
            className={`${className} textarea textarea-info line-clamp-5 w-full overflow-auto h-24 ${errors[registerKey] ? "input-error" : "input-info"}`}
            required={required}
            rows={rows}
            disabled={disabled || readOnly}
            readOnly={readOnly || disabled}
            id={registerKey}
            {...register(registerKey, {
              required,
              ...registerOptions,
            })}
            {...otherProps}
          />
        }
        {children}
      </div>
      {errors && (
        <p className="text-error mt-2 text-sm font-semibold ml-1">
          {errors[registerKey]?.message || ""}
        </p>
      )}
    </div>
  );
}

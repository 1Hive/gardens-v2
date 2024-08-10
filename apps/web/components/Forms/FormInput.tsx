"use client";

import { HTMLInputTypeAttribute } from "react";
import { RegisterOptions } from "react-hook-form";
import { InfoIcon } from "../InfoIcon";

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
  otherProps,
  className,
  value = undefined,
  step,
  tooltip,
  onChange,
}: Props) {
  const fixedInputClassname =
    "border-gray-300 focus:border-gray-300 focus:outline-gray-300 cursor-not-allowed";
  return (
    <div className="flex flex-col">
      {label && (
        <label htmlFor={registerKey} className="label cursor-pointer ">
          {tooltip ?
            <InfoIcon tooltip={tooltip}>{label}</InfoIcon>
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
            {...register(registerKey, {
              required,
              ...registerOptions,
            })}
            {...otherProps}
          />
        : <textarea
            placeholder={placeholder}
            className={`${className} textarea textarea-info line-clamp-5 w-full ${errors[registerKey] ? "input-error" : "input-info"}`}
            required={required}
            rows={rows}
            readOnly={readOnly}
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
        <p className="text-red mt-2 text-sm">
          {errors[registerKey]?.message || ""}
        </p>
      )}
    </div>
  );
}

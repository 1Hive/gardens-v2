/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
"use client";

import { HTMLInputTypeAttribute } from "react";
import MarkdownEditor from "@uiw/react-md-editor";
import { RegisterOptions } from "react-hook-form";
import { InfoWrapper } from "../InfoWrapper";

type Props = {
  label?: string;
  subLabel?: string | undefined;
  type: HTMLInputTypeAttribute | "markdown";
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
        <label htmlFor={registerKey} className="label cursor-pointer w-fit">
          {tooltip ?
            <InfoWrapper tooltip={tooltip}>
              {label}
              {required && <span>*</span>}
            </InfoWrapper>
          : <>
              {label}
              {required && <span className="ml-1">*</span>}
            </>
          }
        </label>
      )}
      {subLabel && <p className="mb-1 text-xs">{subLabel}</p>}
      <div
        className={`relative ${type !== "textarea" && type !== "markdown" && "max-w-md"}`}
      >
        {type !== "textarea" && type !== "markdown" ?
          <input
            id={registerKey}
            onChange={onChange}
            value={value}
            type={type}
            placeholder={placeholder}
            className={`hide-input-arrows input input-bordered ${
              errors[registerKey] ? "input-error" : "input-info"
            } w-full ${readOnly && fixedInputClassname} ${className}`}
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
        : type === "textarea" ?
          <textarea
            id={registerKey}
            placeholder={placeholder}
            className={`${className} textarea textarea-info line-clamp-5 w-full overflow-auto h-24 ${
              errors[registerKey] ? "input-error" : "input-info"
            }`}
            value={value}
            onChange={onChange}
            required={required}
            rows={rows}
            disabled={disabled || readOnly}
            readOnly={readOnly || disabled}
            {...register(registerKey, {
              required,
              ...registerOptions,
            })}
            {...otherProps}
          />
        : <MarkdownEditor
            id={registerKey}
            data-color-mode="light"
            className={`${className} ${
              errors[registerKey] ? "input-error" : "input-info"
            }`}
            value={value}
            onChange={onChange}
            required={required}
            rows={rows}
            disabled={disabled || readOnly}
            readOnly={readOnly || disabled}
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

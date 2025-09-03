/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
"use client";

import { HTMLInputTypeAttribute } from "react";
import React from "react";
import { RegisterOptions, UseFormRegister } from "react-hook-form";
import { InfoWrapper } from "../InfoWrapper";
import MarkdownEditor from "../MarkdownEditor";

type Props = {
  label?: string;
  subLabel?: string | undefined;
  type: HTMLInputTypeAttribute | "markdown";
  registerKey?: string;
  placeholder?: string;
  register?: UseFormRegister<any>;
  errors?: any;
  required?: boolean;
  registerOptions?: RegisterOptions;
  rows?: number;
  readOnly?: boolean;
  disabled?: boolean;
  otherProps?: any;
  className?: string;
  value?: string | number;
  step?: number | string;
  tooltip?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  suffix?: React.ReactNode;
  wide?: boolean;
};

export function FormInput({
  label,
  subLabel,
  type,
  registerKey = "",
  placeholder = "",
  register,
  errors = false,
  required = false,
  registerOptions,
  rows,
  readOnly,
  disabled,
  otherProps,
  className,
  value = undefined,
  step,
  tooltip,
  onChange,
  suffix,
  wide = true,
}: Props) {
  const registered = register?.(registerKey, {
    ...registerOptions,
    required,
    disabled,
    value: value ?? registerOptions?.value,
    onChange: onChange ?? registerOptions?.onChange,
  });

  const fixedInputClassname =
    "!border-gray-300 focus:border-gray-300 focus:outline-gray-300 cursor-not-allowed bg-transparent";

  return (
    <div className={`flex flex-col ${wide ? "w-full" : ""}`}>
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
        className={`relative ${type !== "textarea" && type !== "markdown" && "max-w-[29rem]"}`}
      >
        {type !== "textarea" && type !== "markdown" ?
          <input
            {...registered}
            id={registerKey}
            type={type}
            placeholder={placeholder}
            className={`hide-input-arrows input dark:bg-primary-soft-dark input-bordered ${
              errors[registerKey] ?
                "input-error dark:dark:bg-primary-soft-dark"
              : "input-info dark:bg-primary-soft-dark"
            } w-full ${readOnly && fixedInputClassname} ${className}`}
            required={required}
            step={step}
            disabled={disabled || readOnly}
            readOnly={readOnly || disabled}
            onChange={registered?.onChange ?? onChange}
            {...otherProps}
          />
        : type === "textarea" ?
          <textarea
            {...registered}
            id={registerKey}
            placeholder={placeholder}
            className={`${className} textarea textarea-info line-clamp-5 w-full overflow-auto h-24 dark:bg-primary-soft-dark ${
              errors[registerKey] ? "input-error" : "input-info"
            }`}
            required={required}
            rows={rows}
            disabled={disabled || readOnly}
            readOnly={readOnly || disabled}
            onChange={registered?.onChange ?? onChange}
            value={value}
            {...otherProps}
          />
        : <MarkdownEditor
            {...registered}
            id={registerKey}
            placeholder={placeholder}
            required={required}
            rows={rows}
            errors={errors}
            disabled={disabled || readOnly}
            readOnly={readOnly || disabled}
            onChange={registered?.onChange ?? onChange}
            value={value}
            {...otherProps}
          />
        }
        {Boolean(suffix) && (
          <span className="absolute right-[10px] top-1/2 -translate-y-1/2 text-neutral">
            {suffix}
          </span>
        )}
      </div>
      {errors && (
        <p className="text-error mt-2 text-sm font-semibold ml-1">
          {errors[registerKey]?.message || ""}
        </p>
      )}
    </div>
  );
}

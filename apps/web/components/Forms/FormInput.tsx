/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
"use client";

import { ChangeEvent, HTMLInputTypeAttribute } from "react";
import MarkdownEditor from "@uiw/react-markdown-editor";
import { RegisterOptions, UseFormRegister } from "react-hook-form";
import {} from "react-hook-form";
import { InfoWrapper } from "../InfoWrapper";

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
}: Props) {
  const registered = register?.(registerKey, {
    required,
    disabled,
    onChange: onChange ?? registerOptions?.onChange,
    value: value ?? registerOptions?.value,
    ...registerOptions,
  });

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
            {...registered}
            id={registerKey}
            type={type}
            placeholder={placeholder}
            className={`hide-input-arrows input input-bordered ${
              errors[registerKey] ? "input-error" : "input-info"
            } w-full ${readOnly && fixedInputClassname} ${className}`}
            required={required}
            step={step}
            disabled={disabled || readOnly}
            readOnly={readOnly || disabled}
            onChange={onChange}
            {...otherProps}
          />
        : type === "textarea" ?
          <textarea
            {...registered}
            id={registerKey}
            placeholder={placeholder}
            className={`${className} textarea textarea-info line-clamp-5 w-full overflow-auto h-24 ${
              errors[registerKey] ? "input-error" : "input-info"
            }`}
            required={required}
            rows={rows}
            disabled={disabled || readOnly}
            readOnly={readOnly || disabled}
            onChange={onChange}
            value={value}
            {...otherProps}
          />
        : <div data-color-mode="light">
            <MarkdownEditor
              {...registered}
              className={`textarea p-0 ![--color-canvas-subtle:white] ![--color-neutral-muted:#cceeff44] rounded-2xl ${
                errors[registerKey] ? "textarea-error" : "textarea-info"
              }`}
              id={registerKey}
              style={{
                resize: "vertical",
                overflow: "auto",
                minHeight: "200px",
              }}
              disabled={disabled || readOnly}
              readOnly={readOnly || disabled}
              required={required}
              value={value}
              onChange={(v) => {
                const e = {
                  target: { value: v },
                } as ChangeEvent<HTMLInputElement>;
                registered?.onChange(e);
                onChange?.(e);
              }}
              {...otherProps}
            />
          </div>
        }
        {suffix && (
          <span className="absolute right-[10px] top-1/2 -translate-y-1/2 text-black">
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

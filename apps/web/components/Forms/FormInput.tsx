/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
"use client";

import { HTMLInputTypeAttribute, useEffect, useMemo } from "react";
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
  onChange?: (value: any) => void;
  suffix?: string;
};

export function FormInput({
  label,
  subLabel,
  type,
  registerKey = "",
  placeholder = "",
  register = () => ({}) as any,
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
  const fixedInputClassname =
    "!border-gray-300 focus:border-gray-300 focus:outline-gray-300 cursor-not-allowed bg-transparent";

  useEffect(() => {
    register(registerKey, registerOptions);
  }, [registerKey]);

  const registered = useMemo(() => {
    return register(registerKey, {
      required,
      disabled,
      ...registerOptions,
      onChange: (e) => {
        onChange?.(e);
        registerOptions?.onChange?.(e);
      },
      value: value !== undefined ? value : undefined,
    });
  }, [registerKey]);

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
            required={required}
            rows={rows}
            disabled={disabled || readOnly}
            readOnly={readOnly || disabled}
            {...register(registerKey, {
              required,
              disabled,
              ...registerOptions,
            })}
            {...otherProps}
          />
        : <div data-color-mode="light">
            <MarkdownEditor
              className="textarea textarea-info p-0 ![--color-canvas-subtle:var(--n)] ![--color-neutral-muted:#cceeff44]"
              id={registerKey}
              style={{
                resize: "vertical",
                overflow: "auto",
                minHeight: "200px",
              }}
              disabled={disabled || readOnly}
              readOnly={readOnly || disabled}
              required={required}
              {...register(registerKey, {
                required,
                disabled,
                ...registerOptions,
              })}
              onChange={(v) => {
                const e = { target: { value: v } };
                registered.onChange(e);
                onChange?.(e);
              }}
              {...otherProps}
            />
          </div>
        }
        {suffix && (
          <span className="absolute right-4 top-4 text-black">{suffix}</span>
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

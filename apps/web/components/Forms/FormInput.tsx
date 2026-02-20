/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
"use client";

import React, { HTMLInputTypeAttribute, useRef } from "react";
import { RegisterOptions, UseFormRegister } from "react-hook-form";
import { InfoWrapper } from "../InfoWrapper";
import MarkdownEditor, { type MarkdownEditorHandle } from "../MarkdownEditor";

type Props = {
  label?: string;
  subLabel?: string | undefined;
  type?: HTMLInputTypeAttribute | "markdown";
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
  testId?: string;
};

export function FormInput({
  label,
  subLabel,
  type = "text",
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
  testId,
}: Props) {
  const registered = register?.(registerKey, {
    ...registerOptions,
    required,
    disabled,
    value: value ?? registerOptions?.value,
    onChange: onChange ?? registerOptions?.onChange,
  });
  const { ref: registerRef, ...registeredProps } = registered ?? {};
  const markdownEditorRef = useRef<MarkdownEditorHandle>(null);
  const handleLabelClick = (event: React.MouseEvent<HTMLLabelElement>) => {
    if (type !== "markdown") return;
    event.preventDefault();
    markdownEditorRef.current?.focus();
  };

  const disabledInputClassname =
    "!border-gray-400 focus:border-gray-400 focus:outline-none text-neutral-content cursor-not-allowed opacity-40";

  return (
    <div className={`flex flex-col ${wide ? "w-full" : ""}`}>
      {label && (
        <label
          htmlFor={registerKey}
          className="label cursor-pointer w-fit"
          onClick={handleLabelClick}
        >
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
      {subLabel && (
        <p
          className={`mb-1 ml-1 text-xs ${readOnly || disabled ? "text-neutral-content" : "text-neutral-soft-content"}̀`}
        >
          {subLabel}
        </p>
      )}
      <div
        className={`relative ${type !== "textarea" && type !== "markdown" && "max-w-[29rem]"}`}
      >
        {type !== "textarea" && type !== "markdown" ?
          <input
            {...registeredProps}
            ref={registerRef}
            id={registerKey}
            type={type}
            placeholder={placeholder}
            className={`hide-input-arrows input dark:bg-primary-soft-dark input-bordered ${
              errors[registerKey] ?
                "input-error dark:dark:bg-primary-soft-dark"
              : "input-info dark:bg-primary-soft-dark"
            } w-full ${
              disabled || readOnly ? disabledInputClassname : ""
            } ${className}`}
            required={required}
            step={step}
            disabled={disabled || readOnly}
            readOnly={readOnly || disabled}
            onChange={registered?.onChange ?? onChange}
            data-testid={testId}
            {...otherProps}
          />
        : type === "textarea" ?
          <textarea
            {...registeredProps}
            ref={registerRef}
            id={registerKey}
            placeholder={placeholder}
            className={`${className} textarea textarea-info line-clamp-5 w-full overflow-auto h-24 dark:bg-primary-soft-dark ${
              errors[registerKey] ? "input-error" : "input-info"
            } ${disabled || readOnly ? disabledInputClassname : ""}`}
            required={required}
            rows={rows}
            disabled={disabled || readOnly}
            readOnly={readOnly || disabled}
            onChange={registered?.onChange ?? onChange}
            value={value}
            data-testid={testId}
            {...otherProps}
          />
        : <MarkdownEditor
            {...registeredProps}
            ref={markdownEditorRef}
            id={registerKey}
            placeholder={placeholder}
            required={required}
            rows={rows}
            errors={errors}
            disabled={disabled || readOnly}
            readOnly={readOnly || disabled}
            onChange={registered?.onChange ?? onChange}
            value={value}
            className={`input input-info dark:bg-primary-soft-dark ${disabled || readOnly ? disabledInputClassname : ""}`}
            testId={testId}
            {...otherProps}
          />
        }
        {Boolean(suffix) && (
          <span
            className={`absolute right-[10px] top-1/2 -translate-y-1/2 text-neutral-content ${disabled || readOnly ? "opacity-60" : ""}`}
          >
            {suffix}
          </span>
        )}
      </div>
      {errors && (
        <p className="text-danger-content text-sm mt-2">
          {errors[registerKey]?.message || ""}
        </p>
      )}
    </div>
  );
}

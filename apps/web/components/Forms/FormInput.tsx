"use client";
import { HTMLInputTypeAttribute } from "react";
import {
  FieldValues,
  Path,
  RegisterOptions,
  UseFormRegister,
} from "react-hook-form";

type Props = {
  label: string;
  subLabel?: string | undefined;
  type: HTMLInputTypeAttribute;
  registerKey: string;
  placeholder?: string;
  register: any;
  errors: any;
  required?: boolean;
  registerOptions?: RegisterOptions;
  children?: any;
  rows?: number;
  readOnly?: boolean;
  otherProps?: any;
  className?: string;
};

export function FormInput({
  label = "",
  subLabel,
  type,
  registerKey,
  placeholder = "",
  register,
  errors,
  required = false,
  registerOptions,
  children,
  rows,
  readOnly,
  otherProps,
  className,
}: Props) {
  const fixedInputClassname =
    "border-gray-300 focus:border-gray-300 focus:outline-gray-300 cursor-not-allowed";
  return (
    <>
      <label htmlFor={registerKey} className="my-2 text-lg text-black">
        {label}
      </label>
      {subLabel && <p className="text-xs">{subLabel}</p>}
      <div className={`relative ${type !== "textarea" && "max-w-md"}`}>
        {type !== "textarea" ? (
          <input
            type={type}
            placeholder={placeholder}
            className={`${className} hide-input-arrows input input-bordered ${!!errors[registerKey] ? "input-error" : "input-info"} w-full ${readOnly && fixedInputClassname}`}
            required={required}
            readOnly={readOnly}
            {...register(registerKey, {
              required,
              ...registerOptions,
            })}
            {...otherProps}
          />
        ) : (
          <textarea
            placeholder={placeholder}
            className={`${className} textarea textarea-info line-clamp-5 w-full ${!!errors[registerKey] ? "input-error" : "input-info"}`}
            required={required}
            rows={rows}
            readOnly={readOnly}
            {...register(registerKey, {
              required,
              ...registerOptions,
            })}
            {...otherProps}
          />
        )}
        {children}
      </div>
      <p className="mt-2 text-sm text-red">
        {errors[registerKey]?.message || ""}
      </p>
    </>
  );
}

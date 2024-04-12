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
  registerKey: any;
  placeholder?: string;
  register: any;
  errors: any;
  required?: boolean;
  registerOptions?: RegisterOptions;
  children?: any;
  rows?: number;
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
}: Props) {
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
            className={`hide-input-arrows input input-bordered input-${!!errors[registerKey] ? "error" : "info"} w-full`}
            required
            {...register(registerKey, {
              required,
              ...registerOptions,
            })}
          />
        ) : (
          <textarea
            placeholder={placeholder}
            className="textarea textarea-info line-clamp-5 w-full"
            required
            rows={rows}
            {...register(registerKey, {
              required,
              ...registerOptions,
            })}
          />
        )}
        {children}
      </div>
      <p className="mt-2 text-sm text-red">{errors[registerKey]?.message || ""}</p>
    </>
  );
}

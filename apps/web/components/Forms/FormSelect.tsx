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
  const isNonInteractive = disabled === true || readOnly === true;

  // Register with react-hook-form
  const registered = register?.(registerKey, {
    ...registerOptions,
    required: required ?? registerOptions?.required,
    disabled:
      isNonInteractive ? true
      : registerOptions?.disabled,
    onChange: (e) => {
      (onChange ?? registerOptions?.onChange)?.(e);
    },
    value: value ?? registerOptions?.value,
  });

  const baseSelectClasses = [
    "select",
    hasError ? "select-error" : "select-info",
    "dark:bg-primary-soft-dark",
    "w-full",
    "max-w-[29rem]",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const disabledSelectClassname =
    "!border-gray-400 focus:border-gray-400 focus:outline-none text-neutral-content cursor-not-allowed opacity-40";
  const readOnlyClasses = isNonInteractive ?
    disabledSelectClassname
  : "";
  const errorFocusClasses = hasError ?
    "focus-visible:!outline-danger-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0"
  : "";

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
        className={`${baseSelectClasses} ${readOnlyClasses} ${errorFocusClasses}`.trim()}
        id={registerKey}
        {...registered}
        onChange={onChange ?? registered?.onChange}
        required={required}
        disabled={isNonInteractive}
        aria-readonly={readOnly ? "true" : "false"}
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

import React from "react";
import { RegisterOptions, UseFormRegister } from "react-hook-form";
import { InfoWrapper } from "../InfoWrapper";

type Props = {
  label: string;
  registerKey: string;
  register?: UseFormRegister<any>;
  errors?: any;
  tooltip?: string;
  value?: boolean;
  required?: boolean;
  registerOptions?: RegisterOptions;
  defaultChecked?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  readOnly?: boolean;
  customTooltipIcon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
};

export function FormCheckBox({
  label = "",
  registerKey,
  register,
  required = false,
  registerOptions,
  defaultChecked,
  value,
  onChange,
  tooltip,
  readOnly,
  customTooltipIcon,
  className = "",
  errors = {},
  disabled = false,
}: Props) {
  const hasError = errors?.[registerKey];
  const registered = register?.(registerKey, {
    ...registerOptions,
    required: required ?? registerOptions?.required,
    value: value ?? registerOptions?.value,
    onChange: onChange ?? registerOptions?.onChange,
    disabled: disabled ?? registerOptions?.disabled,
  });

  const checkboxClasses = [
    "checkbox",
    hasError ? "checkbox-error" : "checkbox-info",
    "dark:bg-primary-soft-dark",
    disabled || readOnly ? "cursor-not-allowed opacity-50" : "",
    "disabled:opacity-40",
    "disabled:border-neutral-soft",
    "disabled:bg-neutral-soft",
    "disabled:checked:bg-neutral-soft",
  ]
    .filter(Boolean)
    .join(" ");

  const labelWrapperClasses = [
    "flex",
    "items-center",
    "gap-2",
    disabled || readOnly ? "opacity-60" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const labelClasses = [
    "text-sm",
    "font-medium",
    disabled || readOnly ?
      "cursor-not-allowed text-neutral-soft-content"
    : "cursor-pointer",
  ].join(" ");

  return (
    <div className={`my-2 ${className}`}>
      <div className={labelWrapperClasses}>
        <input
          defaultChecked={defaultChecked}
          checked={value}
          type="checkbox"
          id={registerKey}
          {...registered}
          onChange={registered?.onChange ?? onChange}
          readOnly={readOnly}
          disabled={disabled}
          className={checkboxClasses}
        />
        <label htmlFor={registerKey} className={labelClasses}>
          {tooltip ?
            <InfoWrapper tooltip={tooltip} customIcon={customTooltipIcon}>
              {label}
              {required && <span className="ml-1">*</span>}
            </InfoWrapper>
          : <>
              {label}
              {required && <span className="ml-1">*</span>}
            </>
          }
        </label>
      </div>
      {hasError && (
        <span className="text-danger-content text-sm mt-2 ms-7">
          {hasError.message || "This field is required"}
        </span>
      )}
    </div>
  );
}

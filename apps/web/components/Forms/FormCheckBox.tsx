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
  const isNonInteractive = disabled === true || readOnly === true;
  const registered = register?.(registerKey, {
    ...registerOptions,
    required: required ?? registerOptions?.required,
    value: value ?? registerOptions?.value,
    onChange: onChange ?? registerOptions?.onChange,
    disabled:
      isNonInteractive ? true
      : registerOptions?.disabled,
  });

  const checkboxClasses = [
    "checkbox",
    "shrink-0",
    "h-5",
    "w-5",
    "rounded-md",
    "border-2",
    hasError ? "checkbox-error" : "checkbox-info",
    "border-neutral-soft-content",
    "bg-transparent",
    "dark:bg-transparent",
    isNonInteractive ?
      "cursor-not-allowed !opacity-50 border-neutral-soft-content bg-neutral/70 dark:bg-neutral/40 pointer-events-none hover:border-neutral-soft-content hover:bg-neutral/70"
    : "",
    "disabled:border-neutral-soft-content",
    "disabled:bg-neutral/70",
    "disabled:checked:bg-neutral/70",
    "disabled:checked:text-neutral-content",
  ]
    .filter(Boolean)
    .join(" ");

  const labelWrapperClasses = ["flex", "items-center", "gap-2"]
    .filter(Boolean)
    .join(" ");

  const labelClasses = [
    "text-sm",
    "font-medium",
    isNonInteractive ?
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
          onChange={
            readOnly ? undefined
            : (registered?.onChange ?? onChange)
          }
          readOnly={readOnly}
          disabled={isNonInteractive}
          className={checkboxClasses}
        />
        <label
          htmlFor={isNonInteractive ? undefined : registerKey}
          className={labelClasses}
        >
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

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
}: Props) {
  const registered = register?.(registerKey, {
    ...registerOptions,
    required: required ?? registerOptions?.required,
    value: value ?? registerOptions?.value,
    onChange: onChange ?? registerOptions?.onChange,
  });
  return (
    <div className={`my-2 flex items-center ${className}`}>
      <input
        defaultChecked={defaultChecked}
        checked={value}
        id={registerKey}
        {...registered}
        onChange={registered?.onChange ?? onChange}
        readOnly={readOnly}
        className="checkbox-info checkbox"
      />
      <label
        htmlFor={registerKey}
        className="ms-2 text-sm font-medium cursor-pointer"
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
  );
}

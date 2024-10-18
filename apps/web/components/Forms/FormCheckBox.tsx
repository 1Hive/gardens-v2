import React, { HTMLInputTypeAttribute } from "react";
import { RegisterOptions, UseFormRegister } from "react-hook-form";
import { InfoWrapper } from "../InfoWrapper";

type Props = {
  label: string;
  type: HTMLInputTypeAttribute;
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
}: Props) {
  return (
    <div className="my-3 flex items-center">
      <input
        defaultChecked={defaultChecked}
        type="checkbox"
        checked={value}
        id={registerKey}
        {...register?.(registerKey, {
          required,
          ...registerOptions,
        })}
        readOnly={readOnly}
        className="checkbox-info checkbox"
        onChange={onChange}
      />
      <label htmlFor={registerKey} className="ms-2 text-sm font-medium ">
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
    </div>
  );
}

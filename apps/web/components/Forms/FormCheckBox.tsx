import React, { HTMLInputTypeAttribute } from "react";
import { RegisterOptions } from "react-hook-form";

type Props = {
  label: string;
  type: HTMLInputTypeAttribute;
  registerKey: string;
  register: any;
  errors: any;
  required?: boolean;
  registerOptions?: RegisterOptions;
  defaultChecked?: boolean;
};

export function FormCheckBox({
  label = "",
  registerKey,
  register,
  errors,
  required = false,
  registerOptions,
  defaultChecked = false,
}: Props) {
  return (
    <div className="my-3 flex items-center">
      <input
        defaultChecked={defaultChecked}
        type="checkbox"
        value=""
        id={registerKey}
        {...register(registerKey, {
          required,
          ...registerOptions,
        })}
        className="checkbox-info checkbox"
      />
      <label htmlFor={registerKey} className="ms-2 text-sm font-medium ">
        {label}
      </label>
    </div>
  );
}

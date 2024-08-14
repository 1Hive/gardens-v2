import React from "react";

type Props = {
  value: string | number;
  registerKey: any;
  checked: boolean;
  label: string;
  description?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export function FormRadioButton({
  value,
  registerKey,
  checked,
  label,
  description = "",
  onChange,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          id={label}
          checked={checked ? true : false}
          onChange={onChange}
          value={value}
          type="radio"
          className="radio radio-info"
          name={registerKey}
        />
        <label htmlFor={label} className="label cursor-pointer">{label}</label>
      </div>
      <p className="text-sm">{description}</p>
    </div>
  );
}

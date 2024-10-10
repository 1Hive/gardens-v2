import React from "react";

type Props = {
  value: string | number;
  registerKey: any;
  checked: boolean;
  label: string;
  description?: string;
  inline?: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
};

export function FormRadioButton({
  value,
  registerKey,
  checked,
  label,
  description = "",
  inline = false,
  onChange,
}: Props) {
  return (
    <div className={`flex ${inline ? "items-center" : "flex-col"} gap-2`}>
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
        <label htmlFor={label} className="label font-semibold cursor-pointer">
          {label}
        </label>
      </div>
      <p className="text-sm text-neutral-soft-content">{description}</p>
    </div>
  );
}

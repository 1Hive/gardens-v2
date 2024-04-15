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
          checked={checked}
          onChange={onChange}
          value={value}
          type="radio"
          className="radio"
          name={registerKey}
        />
        <h4 className="text-md font-bold">{label}</h4>
      </div>
      <p className="text-sm">{description}</p>
    </div>
  );
}

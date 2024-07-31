"use client";

import React from "react";
import { Size } from "@/types";

type ButtonProps = {
  type?:
    | "button"
    | "submit"
    | "reset"
    | React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
  btnStyle?: BtnStyle;
  color?: Color;
  onClick?: React.DOMAttributes<HTMLButtonElement>["onClick"];
  className?: string;
  disabled?: boolean;
  tooltip?: string;
  children: React.ReactNode;
  isLoading?: boolean;
  size?: Size;
  icon?: React.ReactNode;
  walletConnected?: boolean;
};

type Color = "primary" | "secondary" | "tertiary" | "danger" | "disabled";
type BtnStyle = "filled" | "outline" | "link";

type BtnStyles = Record<BtnStyle, Record<Color, string>>;

const btnStyles: BtnStyles = {
  filled: {
    primary: "btn !bg-primary-button !text-neutral-inverted-content",
    secondary: "btn !bg-secondary-button !text-neutral-inverted-content",
    tertiary: "btn !bg-tertiary-button !text-neutral-inverted-content",
    danger: "btn !bg-danger-button !text-neutral-inverted-content",
    disabled: "btn !bg-neutral-button !text-neutral-inverted-content",
  },
  outline: {
    primary: "btn btn-outline !text-primary-content !border-primary-content",
    secondary:
      "btn btn-outline !text-secondary-content !border-secondary-content",
    tertiary:
      "btn btn-outline !text-secondary-content !border-tertiary-content",
    danger: "btn btn-outline !text-danger-button !border-danger-button",
    disabled: "btn btn-outline !text-neutral-soft !border-neutral-soft",
  },
  link: {
    primary: "text-primary-content",
    secondary: "text-secondary-content",
    tertiary: "text-tertiary-content",
    danger: "text-danger-button",
    disabled: "text-neutral-soft",
  },
};

export function Button({
  onClick = () => {},
  className: styles,
  disabled = false,
  tooltip = "Connect wallet",
  children,
  btnStyle = "filled",
  color = "primary",
  isLoading = false,
  icon,
  type = "button",
  size = "md",
}: ButtonProps) {
  const buttonElement = (
    <button
      type={type}
      className={`${btnStyles[btnStyle][disabled ? "disabled" : color]} btn-${size}
      relative cursor-pointer items-center justify-center rounded-lg px-6 transition-all ease-out disabled:cursor-not-allowed ${styles} hover:shadow-md disabled:shadow-none`}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      <div
        className={`flex gap-2 items-center justify-center transition-opacity ${isLoading ? "opacity-0" : "opacity-100"}`}
      >
        {icon && icon} {children}
      </div>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="loading loading-spinner" />
        </div>
      )}
    </button>
  );

  return disabled ?
      <div className={`tooltip ${styles}`} data-tip={tooltip}>
        {buttonElement}
      </div>
    : buttonElement;
}

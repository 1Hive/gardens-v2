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
    primary:
      "bg-primary-button text-neutral-inverted-content hover:bg-primary-hover-content",
    secondary: "",
    tertiary: "",
    danger:
      "bg-danger-button text-neutral-inverted-content hover:bg-danger-hover-content",
    disabled: "bg-neutral-button text-neutral-inverted-content",
  },
  outline: {
    primary:
      "text-primary-content outline outline-2 outline-primary-content hover:text-primary-hover-content hover:outline-primary-hover-content",
    secondary: "",
    tertiary: "",
    danger:
      "text-danger-button outline outline-2 outline-danger-button hover:text-danger-hover-content hover:outline-danger-hover-content",
    disabled: "text-neutral-soft outline outline-2 outline-neutral-soft",
  },
  link: {
    primary: "text-primary-content",
    secondary: "",
    tertiary: "",
    danger: "text-danger-button",
    disabled: "text-neutral-soft",
  },
};

export function Button({
  onClick,
  className: styles,
  disabled = false,
  tooltip = "Connect wallet",
  children,
  size,
  btnStyle = "filled",
  color = "primary",
  isLoading = false,
  icon,
  type = "button",
}: ButtonProps) {
  const buttonContent = isLoading ? (
    <span className="loading loading-spinner"></span>
  ) : (
    children  
  );

  const buttonElement = (
    <button
      type={type}
      className={`${btnStyles[btnStyle][disabled ? "disabled" : color]}
      flex cursor-pointer items-center justify-center gap-2 rounded-lg px-6 py-4 transition-all ease-out disabled:cursor-not-allowed ${styles}`}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {icon && icon} {buttonContent}
    </button>
  );

  return disabled ? (
    <div className={`tooltip ${styles}`} data-tip={tooltip}>
      {buttonElement}
    </div>
  ) : (
    buttonElement
  );
}

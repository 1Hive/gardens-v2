"use client";
import React from "react";
import { Size } from "@/types";

type ButtonProps = {
  type?:
    | "button"
    | "submit"
    | "reset"
    | React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
  variant?: BtnType;
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

type Color = "primary" | "secondary" | "tertiary" | "error" | "disabled";
type BtnType = "filled" | "outline" | "link";

type VariantStyles = Record<BtnType, Record<Color, string>>;

const variantStyles: VariantStyles = {
  filled: {
    primary:
      "bg-primary-button text-neutral-inverted-content hover:bg-primary-hover-content",
    secondary: "",
    tertiary: "",
    error:
      "bg-error-button text-neutral-inverted-content hover:bg-error-hover-content",
    disabled: "bg-neutral-button text-neutral-inverted-content",
  },
  outline: {
    primary:
      "text-primary-content outline outline-2 outline-primary-content hover:text-primary-hover-content hover:outline-primary-hover-content",
    secondary: "",
    tertiary: "",
    error:
      "text-error-button outline outline-2 outline-error-button hover:text-error-hover-content hover:outline-error-hover-content",
    disabled: "text-neutral-soft outline outline-2 outline-neutral-soft",
  },
  link: {
    primary: "text-primary-content",
    secondary: "",
    tertiary: "",
    error: "text-error-button",
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
  variant = "filled",
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
      className={`${variantStyles[variant][disabled ? "disabled" : color]}
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

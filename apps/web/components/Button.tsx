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
  showToolTip?: boolean;
  className?: string;
  disabled?: boolean;
  tooltip?: string;
  tooltipClassName?: string;
  tooltipSide?:
    | "tooltip-top"
    | "tooltip-bottom"
    | "tooltip-left"
    | "tooltip-right";
  children: React.ReactNode;
  isLoading?: boolean;
  size?: Size;
  icon?: React.ReactNode;
  walletConnected?: boolean;
};

export type Color =
  | "primary"
  | "secondary"
  | "tertiary"
  | "danger"
  | "disabled";
export type BtnStyle = "filled" | "outline" | "link";

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
      "text-primary-content border border-primary-content hover:text-primary-hover-content hover:outline-primary-hover-content",
    secondary:
      "text-secondary-content border border-secondary-content hover:text-secondary-hover-content hover:outline-secondary-hover-content",
    tertiary: "",
    danger:
      "text-danger-button border border-danger-button hover:text-danger-hover-content hover:outline-danger-hover-content",
    disabled: "text-neutral-soft-content border border-neutral-soft-content",
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
  tooltip,
  showToolTip = true,
  tooltipClassName: tooltipStyles,
  tooltipSide = "tooltip-top",
  children,
  btnStyle = "filled",
  color = "primary",
  isLoading = false,
  icon,
  type = "button",
}: ButtonProps) {
  const buttonElement = (
    <button
      type={type}
      className={`${btnStyles[btnStyle][disabled ? "disabled" : color]}
      flex relative cursor-pointer  justify-center rounded-lg px-6 py-4 transition-all ease-out disabled:cursor-not-allowed h-fit ${styles}`}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      <div
        className={`${isLoading ? "invisible" : "visible"} flex gap-2 items-center`}
      >
        {icon && icon} {children}
      </div>
      <span
        className={`loading loading-spinner absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${isLoading ? "block" : "hidden"}`}
      />
    </button>
  );

  return disabled || showToolTip ?
      <div
        className={`${tooltip ? "tooltip" : ""} ${tooltipSide} ${tooltipStyles}`}
        data-tip={tooltip}
      >
        {buttonElement}
      </div>
    : buttonElement;
}

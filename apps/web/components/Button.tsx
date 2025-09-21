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
  forceShowTooltip?: boolean;
  popTooltip?: boolean; // Allows to display the tooltip programmatically
  className?: string;
  disabled?: boolean;
  tooltip?: string;
  tooltipClassName?: string;
  tooltipSide?:
    | "tooltip-top"
    | "tooltip-bottom"
    | "tooltip-left"
    | "tooltip-right"
    | "tooltip-top-right"
    | "tooltip-top-left";
  children?: React.ReactNode;
  isLoading?: boolean;
  size?: Size;
  icon?: React.ReactNode;
  walletConnected?: boolean;
  style?: React.CSSProperties;
};

export type Color =
  | "primary"
  | "secondary"
  | "tertiary"
  | "danger"
  | "disabled";
export type BtnStyle = "filled" | "outline" | "link" | "ghost";

type BtnStyles = Record<BtnStyle, Record<Color, string>>;

const btnStyles: BtnStyles = {
  filled: {
    primary:
      "bg-primary-button text-neutral-inverted-content hover:bg-primary-hover-content dark:bg-[#3f8f65] dark:text-neutral-inverted-content dark:hover:bg-[#6fcf9f]",
    secondary:
      "bg-secondary-button text-neutral-inverted-content hover:bg-secondary-hover-content dark:bg-[#8a5a2a] dark:text-neutral-inverted-content dark:hover:bg-[#d38b4a]",
    tertiary:
      "bg-tertiary-button text-neutral-inverted-content hover:bg-tertiary-hover-content",
    danger:
      "bg-danger-button text-neutral-inverted-content hover:bg-danger-hover-content dark:bg-[#d65a5a] dark:text-neutral-inverted-content dark:hover:bg-[#e58d8d]",
    disabled:
      "bg-neutral-button text-neutral-inverted-content dark:text-neutral-inverted-content-dark",
  },
  outline: {
    primary:
      "text-primary-content border border-primary-content hover:text-primary-hover-content hover:border-primary-hover-content dark:text-[#63b693] dark:border-[#3f8f65] dark:hover:text-[#c0f3d6] dark:hover:border-[#94e3b9]",
    secondary:
      "text-secondary-content border border-secondary-content hover:text-secondary-hover-content hover:border-secondary-hover-content dark:text-[#e89a4c] dark:border-[#8a5a2a] dark:hover:text-[#ffc37d] dark:hover:border-[#b8763a]",
    tertiary:
      "text-tertiary-content border border-tertiary-content hover:text-tertiary-hover-content hover:border-tertiary-hover-content",
    danger:
      "text-danger-button border border-danger-button hover:text-danger-hover-content hover:border-danger-hover-content dark:text-[#ffb4b4] dark:border-[#d65a5a] dark:hover:text-[#ffe9e9] dark:hover:border-[#f4b4b4]",
    disabled: "text-neutral-soft-content border border-neutral-soft-content",
  },
  link: {
    primary:
      "text-primary-content hover:text-primary-hover-content dark:text-[#63b693] dark:hover:text-[#82deb4]",
    secondary:
      "text-secondary-content hover:text-secondary-hover-content dark:text-[#e89a4c] dark:hover:text-[#ffc37d]",
    tertiary: "text-tertiary-content hover:text-tertiary-hover-content",
    danger:
      "text-danger-button hover:text-danger-hover-content dark:text-[#ffb4b4] dark:hover:text-[#ffd7d7]",
    disabled: "text-neutral-soft dark:text-neutral-inverted-content-dark",
  },
  ghost: {
    primary:
      "text-primary-content hover:text-primary-hover-content hover:border border-primary-content dark:text-[#63b693] dark:hover:text-[#82deb4] dark:hover:border-[#6fcf9f] dark:border-[#3f8f65]",
    secondary:
      "text-secondary-content hover:text-secondary-hover-content hover:border border-secondary-content dark:text-[#e89a4c] dark:hover:text-[#ffc37d] dark:border-[#8a5a2a] dark:hover:border-[#b8763a]",
    tertiary:
      "text-tertiary-content hover:text-tertiary-hover-content hover:border border-tertiary-content",
    danger:
      "text-danger-button hover:text-danger-hover-content hover:border border-danger-button dark:text-[#ffb4b4] dark:hover:text-[#ffd7d7] dark:border-[#d65a5a] dark:hover:border-[#e58d8d]",
    disabled: "text-neutral-soft dark:text-neutral-inverted-content-dark",
  },
};

export function Button({
  onClick,
  className = "",
  disabled = false,
  tooltip,
  forceShowTooltip = false,
  popTooltip = false,
  tooltipClassName: tooltipStyles = "",
  tooltipSide = "tooltip-top",
  children,
  btnStyle = "filled",
  color = "primary",
  isLoading = false,
  icon,
  type = "button",
  style,
}: ButtonProps) {
  const buttonElement = (
    <button
      type={type}
      className={`${btnStyles[btnStyle][disabled ? "disabled" : color]} flex relative cursor-pointer justify-center rounded-lg px-4 py-2 transition-all ease-out disabled:cursor-not-allowed h-fit text-sm gap-2 ${className}`}
      onClick={onClick}
      disabled={disabled || isLoading}
      style={style}
      aria-disabled={disabled || isLoading ? "true" : "false"}
      aria-label={
        children != null ?
          typeof children === "string" ?
            children
          : ""
        : ""
      }
    >
      {isLoading && <span className={"loading loading-spinner loading-sm"} />}
      <div className={"flex gap-2 items-center"}>
        {icon != null && !isLoading && icon} {children}
      </div>
    </button>
  );

  return disabled || forceShowTooltip ?
      <div
        className={`${className} ${tooltip ? "tooltip" : ""} ${tooltipSide} ${tooltipStyles} ${popTooltip ? "tooltip-open" : ""}`}
        data-tip={tooltip}
      >
        {buttonElement}
      </div>
    : buttonElement;
}

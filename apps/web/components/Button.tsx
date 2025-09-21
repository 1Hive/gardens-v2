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
      "bg-primary-button text-neutral-inverted-content hover:bg-primary-hover-content dark:bg-primary-dark-base dark:hover:bg-primary-dark-hover",
    secondary:
      "bg-secondary-button text-neutral-inverted-content hover:bg-secondary-hover-content dark:bg-secondary-dark-base dark:hover:bg-secondary-dark-hover",
    tertiary:
      "bg-tertiary-button text-neutral-inverted-content hover:bg-tertiary-hover-content dark:bg-tertiary-dark-base dark:hover:bg-tertiary-dark-hover",
    danger:
      "bg-danger-button text-neutral-inverted-content hover:bg-danger-hover-content dark:bg-danger-dark-base dark:hover:bg-danger-dark-hover",
    disabled:
      "bg-neutral-button text-neutral-inverted-content dark:text-neutral-soft-content",
  },
  outline: {
    primary:
      "text-primary-content border border-primary-content hover:text-primary-hover-content hover:border-primary-hover-content dark:text-primary-dark-text dark:border-primary-dark-border dark:hover:text-primary-dark-text-hover dark:hover:border-primary-dark-border-hover",
    secondary:
      "text-secondary-content border border-secondary-content hover:text-secondary-hover-content hover:border-secondary-hover-content dark:text-secondary-dark-text dark:border-secondary-dark-border dark:hover:text-secondary-dark-text-hover dark:hover:border-secondary-dark-border-hover",
    tertiary:
      "text-tertiary-content border border-tertiary-content hover:text-tertiary-hover-content hover:border-tertiary-hover-content dark:text-tertiary-dark-text dark:border-tertiary-dark-border dark:hover:text-tertiary-dark-text-hover dark:hover:border-tertiary-dark-border-hover",
    danger:
      "text-danger-button border border-danger-button hover:text-danger-hover-content hover:border-danger-hover-content dark:text-danger-dark-border dark:border-danger-dark-border dark:hover:text-danger-dark-border-hover dark:hover:border-danger-dark-border-hover",
    disabled:
      "text-neutral-soft-content border border-neutral-soft-content dark:text-neutral-soft-content",
  },
  link: {
    primary:
      "text-primary-content hover:text-primary-hover-content dark:text-primary-dark-text dark:hover:text-primary-dark-text-hover",
    secondary:
      "text-secondary-content hover:text-secondary-hover-content dark:text-secondary-dark-text dark:hover:text-secondary-dark-text-hover",
    tertiary:
      "text-tertiary-content hover:text-tertiary-hover-content dark:text-tertiary-dark-text dark:hover:text-tertiary-dark-text-hover",
    danger:
      "text-danger-button hover:text-danger-hover-content dark:text-danger-dark-border dark:hover:text-danger-dark-border-hover",
    disabled: "text-neutral-soft dark:text-neutral-soft-content",
  },
  ghost: {
    primary:
      "text-primary-content hover:text-primary-hover-content hover:border border-primary-content dark:text-primary-dark-text dark:border-primary-dark-border dark:hover:text-primary-dark-text-hover dark:hover:border-primary-dark-border-hover",
    secondary:
      "text-secondary-content hover:text-secondary-hover-content hover:border border-secondary-content dark:text-secondary-dark-text dark:border-secondary-dark-border dark:hover:text-secondary-dark-text-hover dark:hover:border-secondary-dark-border-hover",
    tertiary:
      "text-tertiary-content hover:text-tertiary-hover-content hover:border border-tertiary-content dark:text-tertiary-dark-text dark:border-tertiary-dark-border dark:hover:text-tertiary-dark-text-hover dark:hover:border-tertiary-dark-border-hover",
    danger:
      "text-danger-button hover:text-danger-hover-content hover:border border-danger-button dark:text-danger-dark-border dark:border-danger-dark-border dark:hover:text-danger-dark-border-hover dark:hover:border-danger-dark-border-hover",
    disabled: "text-neutral-soft dark:text-neutral-soft-content",
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

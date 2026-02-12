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
export type BtnStyle = "filled" | "outline" | "link" | "ghost" | "tab";

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
      "bg-danger-button text-neutral-inverted-content hover:bg-danger-hover-content dark:bg-danger-dark-base/70 dark:text-neutral-inverted-content dark:hover:bg-danger-dark-border-hover",
    disabled:
      "bg-neutral-button text-neutral-inverted-content dark:bg-disabled-dark-button dark:text-disabled-dark-text hover:opacity-80",
  },
  outline: {
    primary:
      "text-primary-content border border-primary-content hover:text-primary-hover-content hover:border-primary-hover-content dark:text-primary-dark-border dark:border-primary-dark-border dark:hover:text-primary-dark-border-hover dark:hover:border-primary-dark-border-hover",
    secondary:
      "text-secondary-content border border-secondary-content hover:text-secondary-hover-content hover:border-secondary-hover-content dark:text-secondary-dark-border dark:border-secondary-dark-border dark:hover:text-secondary-dark-border-hover dark:hover:border-secondary-dark-border-hover",
    tertiary:
      "text-tertiary-content border border-tertiary-content hover:text-tertiary-hover-content hover:border-tertiary-hover-content dark:text-tertiary-dark-border dark:border-tertiary-dark-border dark:hover:text-tertiary-dark-border-hover dark:hover:border-tertiary-dark-border-hover",
    danger:
      "text-danger-button border border-danger-button hover:text-danger-hover-content hover:border-danger-hover-content dark:text-danger-dark-border dark:border-danger-dark-border dark:hover:text-danger-dark-border-hover dark:hover:border-danger-dark-border-hover",
    disabled:
      "text-neutral-soft-content border border-neutral-soft-content opacity-70 dark:text-white/30 dark:border-white/10",
  },
  link: {
    primary:
      "text-primary-content hover:text-primary-hover-content dark:text-primary-dark-border dark:hover:text-primary-dark-border-hover",
    secondary:
      "text-secondary-content hover:text-secondary-hover-content dark:text-secondary-dark-border dark:hover:text-secondary-dark-border-hover",
    tertiary:
      "text-tertiary-content hover:text-tertiary-hover-content dark:text-tertiary-dark-border dark:hover:text-tertiary-dark-border-hover",
    danger:
      "text-danger-button hover:text-danger-hover-content dark:text-danger-dark-border dark:hover:text-danger-dark-border-hover",
    disabled: "text-neutral-soft-content opacity-70 dark:text-white/30",
  },
  ghost: {
    primary:
      "text-primary-content border border-transparent hover:text-primary-hover-content hover:border-primary-content dark:text-primary-dark-border dark:border-transparent dark:hover:text-primary-dark-border-hover dark:hover:border-primary-dark-border-hover",
    secondary:
      "text-secondary-content border border-transparent hover:text-secondary-hover-content hover:border-secondary-content dark:text-secondary-dark-border dark:border-transparent dark:hover:text-secondary-dark-border-hover dark:hover:border-secondary-dark-border-hover",
    tertiary:
      "text-tertiary-content border border-transparent hover:text-tertiary-hover-content hover:border-tertiary-content dark:text-tertiary-dark-border dark:border-transparent dark:hover:text-tertiary-dark-border-hover dark:hover:border-tertiary-dark-border-hover",
    danger:
      "text-danger-button border border-transparent hover:text-danger-hover-content hover:border-danger-button dark:text-danger-dark-border dark:border-transparent dark:hover:text-danger-dark-border-hover dark:hover:border-danger-dark-border-hover",
    disabled:
      "text-neutral-soft-content border border-transparent opacity-70 hover:opacity-90 dark:text-white/30",
  },
  tab: {
    primary:
      "cursor-none bg-primary-soft dark:bg-primary capitalize text-primary-button dark:text-primary-content border-[1px] border-primary-button transition-all ease-out duration-200",
    secondary: "",
    tertiary: "",
    danger: "",
    disabled:
      "bg-neutral-button text-neutral-inverted-content dark:bg-disabled-dark-button dark:text-disabled-dark-text hover:opacity-80 capitalize",
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
      className={`${btnStyles[btnStyle][disabled ? "disabled" : color]} flex relative cursor-pointer justify-center rounded-lg px-4 w-full sm:w-auto py-2 transition-all ease-out disabled:cursor-not-allowed disabled:shadow-none h-fit text-sm gap-2 ${className}`}
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
      {isLoading && (
        <span className={"loading loading-spinner loading-sm text-inherit"} />
      )}
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

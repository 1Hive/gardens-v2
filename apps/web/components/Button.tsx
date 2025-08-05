"use client";

import React, { useState } from "react";
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
      "bg-primary-button text-neutral-inverted-content hover:bg-primary-hover-content",
    secondary:
      "bg-secondary-button text-neutral-inverted-content hover:bg-secondary-hover-content",
    tertiary:
      "bg-tertiary-button text-neutral-inverted-content hover:bg-tertiary-hover-content",
    danger:
      "bg-danger-button text-neutral-inverted-content hover:bg-danger-hover-content",
    disabled: "bg-neutral-button text-neutral-inverted-content",
  },
  outline: {
    primary:
      "text-primary-content border border-primary-content hover:text-primary-hover-content hover:border-primary-hover-content",
    secondary:
      "text-secondary-content border border-secondary-content hover:text-secondary-hover-content hover:border-secondary-hover-content",
    tertiary:
      "text-tertiary-content border border-tertiary-content hover:text-tertiary-hover-content hover:border-tertiary-hover-content",
    danger:
      "text-danger-button border border-danger-button hover:text-danger-hover-content hover:border-danger-hover-content",
    disabled: "text-neutral-soft-content border border-neutral-soft-content",
  },
  link: {
    primary: "text-primary-content hover:text-primary-hover-content",
    secondary: "text-secondary-content hover:text-secondary-hover-content",
    tertiary: "text-tertiary-content hover:text-tertiary-hover-content",
    danger: "text-danger-button hover:text-danger-hover-content",
    disabled: "text-neutral-soft",
  },
  ghost: {
    primary:
      "text-primary-content hover:text-primary-hover-content hover:border border-primary-content",
    secondary:
      "text-secondary-content hover:text-secondary-hover-content hover:border border-secondary-content",
    tertiary:
      "text-tertiary-content hover:text-tertiary-hover-content hover:border border-tertiary-content",
    danger:
      "text-danger-button hover:text-danger-hover-content hover:border border-danger-button",
    disabled: "text-neutral-soft",
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
        children ?
          typeof children === "string" ?
            children
          : ""
        : ""
      }
    >
      {isLoading && <span className={"loading loading-spinner loading-sm"} />}
      <div className={"flex gap-2 items-center"}>
        {icon && !isLoading && icon} {children}
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

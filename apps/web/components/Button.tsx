import React from "react";
import cn from "classnames";
import { Size } from "@/types";

type ButtonProps = {
  type?:
    | "button"
    | "submit"
    | "reset"
    | (undefined & React.ButtonHTMLAttributes<HTMLButtonElement>["type"]);
  variant?: keyof VariantStyles;
  onClick?: React.DOMAttributes<HTMLButtonElement>["onClick"];
  className?: string;
  disabled?: boolean;
  tooltip?: string;
  children: React.ReactNode;
  isLoading?: boolean;
  size?: Size;
};

type Variant = "primary" | "outline" | "fill";
type VariantStyles = Record<
  Variant,
  React.HTMLAttributes<HTMLButtonElement>["className"]
>;

// TODO: add real styles, this is just a placeholder
const VARIANT_STYLES: VariantStyles = {
  primary: "bg-primary text-black",
  outline: "bg-white text-primary",
  fill: "bg-secondary text-white",
};

export function Button({
  onClick,
  className,
  disabled = false,
  tooltip = "Connect Wallet",
  children,
  size,
  variant,
  isLoading = false,
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
      className={`${VARIANT_STYLES[variant ?? "primary"]} ${cn({
        "h-7": size === "sm",
        "h-9": size === "md",
        "h-14": size === "lg",
      })} ${cn({
        "border-2": type === "button",
      })} 
      disabled:scale-1 flex cursor-pointer items-center justify-center rounded-lg border-2 border-black px-10 py-3 font-chakra font-bold transition-all ease-out hover:brightness-90 active:scale-95 disabled:scale-100 disabled:cursor-not-allowed disabled:bg-gray-300 ${className}`}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {buttonContent}
    </button>
  );

  return disabled ? (
    <div className="tooltip" data-tip={tooltip}>
      {buttonElement}
    </div>
  ) : (
    buttonElement
  );
}

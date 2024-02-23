import type {
  ButtonHTMLAttributes,
  DOMAttributes,
  HTMLAttributes,
} from "react";
import React from "react";
import cn from "classnames";
import { Size } from "@/types";

type ButtonProps = {
  type?:
    | "button"
    | "submit"
    | "reset"
    | (undefined & ButtonHTMLAttributes<HTMLButtonElement>["type"]);
  variant?: keyof VariantStyles;
  onClick?: DOMAttributes<HTMLButtonElement>["onClick"];
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
  isLoading?: boolean;
  size?: Size;
};

type Variant = "primary" | "outline" | "fill";
type VariantStyles = Record<
  Variant,
  HTMLAttributes<HTMLButtonElement>["className"]
>;

// TODO: add real styles, this is just a placeholder
const VARIANT_STYLES: VariantStyles = {
  primary: "bg-primary text-black",
  outline: "bg-white text-green-300",
  fill: "bg-secondary text-white",
};

export function Button({
  onClick,
  className,
  disabled = false,
  children,
  size,
  variant,
  isLoading = false,
  type = "button",
}: ButtonProps) {
  return (
    // TODO: delete this last cn (is just a to check changes in "type" placeholder
    <button
      type={type}
      className={`${VARIANT_STYLES[variant ?? "primary"]} ${cn({
        "h-7": size === "sm",
        "h-9": size === "md",
        "h-14": size === "lg",
      })}
      ${cn({
        "border-2": type === "button",
      })} 
      flex cursor-pointer items-center w-fit justify-center rounded-lg border-2 border-black px-10 py-3 font-chakra font-bold transition-all ease-out hover:brightness-90 active:scale-95 ${className}`}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? <span className="loading loading-spinner"></span> : children}
    </button>
  );
}

import React from "react";

interface ButtonProps {
  action?: "button" | "submit" | "reset" | undefined;
  type?: "primary" | "secondary";
  handleOnClick?: () => {};
  link?: string;
  styles?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function Button({
  handleOnClick,
  action,
  styles,
  disabled = false,
  children,
  type = "primary",
}: ButtonProps) {
  const buttonTypeStyles: Record<string, string> = {
    primary: "bg-primary",
    secondary: "bg-secondary",
  };

  return (
    <button
      type={action}
      className={`${styles} ${buttonTypeStyles[type]} rounded-lg border-2 border-black bg-primary px-10 py-3 font-chakra font-bold`}
      onClick={handleOnClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

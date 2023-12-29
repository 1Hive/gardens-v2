import React from "react";

interface ButtonProps {
  action?: "button" | "submit" | "reset" | undefined;
  type?: "primary" | "secondary";
  onClick?: () => void;
  link?: string;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function Button({
  onClick: handleOnClick,
  action,
  className,
  disabled = false,
  children,
  type = "primary",
}: ButtonProps) {
  return (
    <button
      type={action}
      className={`${className} rounded-lg border-2 border-black px-10 py-3 font-chakra font-bold transition-all ease-out hover:brightness-90 active:scale-95`}
      onClick={handleOnClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

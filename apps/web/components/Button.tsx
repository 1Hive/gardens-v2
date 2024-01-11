import React from "react";
interface ButtonProps {
  action?: "button" | "submit" | "reset" | undefined;
  style?: "fill" | "outline";
  onClick?: () => void;
  link?: string;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  isLoading?: boolean;
}

export function Button({
  onClick: handleOnClick,
  action,
  className,
  disabled = false,
  children,
  style = "fill",
  isLoading = false,
}: ButtonProps) {
  const btnType = {
    fill: "",
    outline: "",
  };

  return (
    <button
      type={action}
      className={`${btnType[style]} ${className} flex h-[48px] cursor-pointer items-center justify-center rounded-lg border-2 border-black px-10 py-3 font-chakra font-bold transition-all ease-out hover:brightness-90 active:scale-95`}
      onClick={handleOnClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? <span className="loading loading-spinner"></span> : children}
    </button>
  );
}

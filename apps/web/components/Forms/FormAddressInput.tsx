import { useEffect, useRef, useState } from "react";
import { blo } from "blo";
import { RegisterOptions } from "react-hook-form";
import { useIsMounted } from "usehooks-ts";
import { Address, isAddress } from "viem";
import { normalize } from "viem/ens";
import { mainnet, useEnsAddress, useEnsAvatar, useEnsName } from "wagmi";
import { InfoIcon } from "../InfoIcon";
import { isENS } from "@/utils/web3";

/**
 * Address input with ENS name resolution
 */
type Props = {
  label?: string;
  placeholder?: string;
  errors?: any;
  register?: any;
  registerKey: string;
  registerOptions?: RegisterOptions;
  required?: boolean;
  readOnly?: boolean;
  className?: string;
  value?: string;
  disabled?: boolean;
  tooltip?: string;
  onChange?: (value: string) => void;
};

export const FormAddressInput = ({
  label,
  placeholder = "",
  errors = false,
  register = () => ({}),
  registerKey = "",
  registerOptions,
  required = false,
  readOnly,
  className,
  value = undefined,
  disabled = false,
  tooltip,
  onChange,
}: Props) => {
  const [input, setInput] = useState<string | undefined>(value);
  const [isValid, setIsValid] = useState<boolean | null>(true);
  const isMounted = useIsMounted();
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: resolvedAddress } = useEnsAddress({
    name: !!input && isENS(input) ? normalize(input) : undefined,
    chainId: mainnet.id,
    enabled: !!input && isENS(input),
  });

  const { data: ensName } = useEnsName({
    address: resolvedAddress ?? (input as Address),
    chainId: mainnet.id,
    enabled:
      !!(resolvedAddress ?? input) && isAddress(resolvedAddress! ?? input),
  });

  const { data: avatarUrl } = useEnsAvatar({
    name: ensName,
    chainId: mainnet.id,
    enabled: !!ensName,
  });

  console.log("inputRef.current?.value", inputRef.current?.value);

  useEffect(() => {
    setInput(value ?? inputRef.current?.value);
  }, [value ?? inputRef.current?.value]);

  useEffect(() => {
    if (!isMounted()) {
      return;
    }
    if (resolvedAddress) {
      onChange?.(resolvedAddress);
      setIsValid(true);
    } else if (input != null && !isENS(input)) {
      // Direct address validation
      if (input !== value) {
        onChange?.(input);
      }
      try {
        setIsValid(isAddress(input));
      } catch (error) {
        setIsValid(false);
      }
    }
  }, [resolvedAddress, input]);

  let modifier = "";
  if (errors || !isValid) {
    modifier = "border-error";
  } else if (disabled) {
    modifier = "border-disabled bg-base-300";
  }

  return (
    <div className={`flex flex-col ${className ?? ""}`}>
      {label && (
        <label htmlFor={registerKey} className="label cursor-pointer">
          <span className="label-text">
            {tooltip ?
              <InfoIcon tooltip={tooltip}>{label}</InfoIcon>
            : label}
          </span>
        </label>
      )}
      <div
        className={`form-control input input-info flex flex-row bg-base-200 font-normal items-center w-[450px] ${modifier}`}
      >
        <input
          ref={inputRef}
          className={
            "input px-0 bg-transparent w-full border-none focus:border-none outline-none focus:outline-none"
          }
          placeholder={placeholder || "Enter address or ENS name"}
          id={registerKey}
          name={registerKey}
          value={input}
          onChange={(ev) => setInput(ev.target.value)}
          disabled={disabled}
          required={required}
          readOnly={readOnly}
          {...register(registerKey, {
            required,
            ...registerOptions,
          })}
        />
        {inputRef.current?.value && (
          // Don't want to use nextJS Image here (and adding remote patterns for the URL)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className={"!rounded-full ml-2"}
            src={
              avatarUrl ? avatarUrl : (
                blo((inputRef.current?.value ?? "0x") as Address)
              )
            }
            width="30"
            height="30"
          />
        )}
      </div>
    </div>
  );
};
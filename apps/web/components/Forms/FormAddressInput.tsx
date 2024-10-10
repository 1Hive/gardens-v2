import {
  ChangeEvent,
  ChangeEventHandler,
  useEffect,
  useRef,
  useState,
} from "react";
import { blo } from "blo";
import { RegisterOptions, UseFormRegister } from "react-hook-form";
import { useIsMounted } from "usehooks-ts";
import { Address, isAddress } from "viem";
import { normalize } from "viem/ens";
import { mainnet, useEnsAddress, useEnsAvatar, useEnsName } from "wagmi";
import { InfoWrapper } from "../InfoWrapper";
import { isENS } from "@/utils/web3";

/**
 * Address input with ENS name resolution
 */
type Props = {
  label?: string;
  placeholder?: string;
  errors?: any;
  register?: UseFormRegister<any>;
  registerKey?: string;
  registerOptions?: RegisterOptions;
  required?: boolean;
  readOnly?: boolean;
  className?: string;
  value?: string;
  disabled?: boolean;
  tooltip?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
};

export const FormAddressInput = ({
  label,
  placeholder = "",
  errors = false,
  register,
  registerKey = "",
  registerOptions,
  required = false,
  readOnly = false,
  className,
  value = undefined,
  disabled = false,
  tooltip,
  onChange,
}: Props) => {
  const [isValid, setIsValid] = useState<boolean | null>(true);
  const isMounted = useIsMounted();
  const inputRef = useRef<HTMLInputElement>(null);

  const registered = register?.(registerKey, {
    required,
    disabled,
    value: value == null ? undefined : value,
    ...registerOptions,
  });

  const input = inputRef.current?.value ?? value;

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

  useEffect(() => {
    if (!isMounted()) {
      return;
    }
    if (resolvedAddress) {
      const ev = {
        target: { value: resolvedAddress },
      } as ChangeEvent<HTMLInputElement>;
      registered?.onChange?.(ev);
      onChange?.(ev);
      setIsValid(true);
    } else if (input != null && !isENS(input)) {
      const ev = {
        target: { value: input },
      } as ChangeEvent<HTMLInputElement>;
      // Direct address validation
      if (input !== value) {
        registered?.onChange?.(ev);
        onChange?.(ev);
      }
      try {
        setIsValid(isAddress(input));
      } catch (error) {
        setIsValid(false);
      }
    }
  }, [resolvedAddress, input]);

  let modifier = "";
  if (input && (errors || !isValid)) {
    modifier = "border-error";
  } else if (disabled) {
    modifier = "border-disabled";
  } else if (readOnly) {
    modifier =
      "!border-gray-300 !focus-within:border-gray-300 focus-within:outline !outline-gray-300 cursor-not-allowed bg-transparent";
  }

  return (
    <div className={`flex flex-col max-w-md text-sm ${className ?? ""}`}>
      {label && (
        <label htmlFor={registerKey} className="label cursor-pointer">
          <span className="label-text">
            {tooltip ?
              <InfoWrapper tooltip={tooltip}>
                {label}
                {required && <span className="ml-1">*</span>}
              </InfoWrapper>
            : <>
                {label}
                {required && <span className="ml-1">*</span>}
              </>
            }
          </span>
        </label>
      )}
      <div
        className={`form-control input input-info flex flex-row font-normal items-center ${modifier}`}
      >
        <input
          ref={inputRef}
          className={`input font-mono text-sm px-0 w-full border-none focus:border-none outline-none focus:outline-none ${readOnly || disabled ? "cursor-not-allowed" : ""}`}
          placeholder={placeholder || "Enter address or ENS name"}
          id={registerKey}
          name={registerKey}
          {...registered}
          disabled={disabled || readOnly}
          readOnly={readOnly || disabled}
          required={required}
        />
        {input && (
          // Don't want to use nextJS Image here (and adding remote patterns for the URL)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className={"!rounded-full ml-2"}
            src={avatarUrl ? avatarUrl : blo((input ?? "0x") as Address)}
            width="30"
            height="30"
          />
        )}
      </div>
    </div>
  );
};

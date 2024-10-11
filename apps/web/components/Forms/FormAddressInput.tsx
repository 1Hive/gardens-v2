import { ChangeEvent, useCallback, useEffect } from "react";
import { blo } from "blo";
import { uniqueId } from "lodash-es";
import { Address, isAddress } from "viem";
import { useEnsAddress, useEnsAvatar, useEnsName } from "wagmi";
import { InfoWrapper } from "../InfoWrapper";
import { useDebounce } from "@/hooks/useDebounce";
import { isENS } from "@/utils/web3";

/**
 * Address input with ENS name resolution
 */
type Props = {
  label?: string;
  errors?: any;
  required?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
  value?: string;
  tooltip?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
};

export const FormAddressInput = ({
  label,
  errors = false,
  required = false,
  placeholder = "0x",
  readOnly,
  disabled,
  className,
  value = undefined,
  tooltip,
  onChange,
}: Props) => {
  const id = uniqueId("address-input-");
  const debouncedValue = useDebounce(value, 500);
  const debouncedOrValue = isAddress(value ?? "") ? value : debouncedValue;
  const isDebouncedValueLive = debouncedOrValue === value;

  const settledValue = isDebouncedValueLive ? debouncedOrValue : undefined;

  const { data: ensAddress } = useEnsAddress({
    name: settledValue,
    enabled: isENS(debouncedOrValue),
    chainId: 1,
    cacheTime: 30_000,
  });

  const { data: ensName } = useEnsName({
    address: settledValue as Address,
    enabled: isAddress(debouncedOrValue ?? ""),
    chainId: 1,
    cacheTime: 30_000,
  });

  const { data: avatarUrl } = useEnsAvatar({
    name: ensName,
    enabled: Boolean(ensName),
    chainId: 1,
    cacheTime: 30_000,
  });

  useEffect(() => {
    if (!ensAddress) return;
    const ev = {
      target: { value: ensAddress },
    } as ChangeEvent<HTMLInputElement>;
    onChange?.(ev);
  }, [ensAddress, onChange, debouncedOrValue]);

  const handleChange = useCallback(
    (newValue: string) => {
      const ev = {
        target: { value: newValue },
      } as ChangeEvent<HTMLInputElement>;
      onChange?.(ev);
    },
    [onChange],
  );

  let modifier = "";
  if (errors) {
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
        <label htmlFor={id} className="label cursor-pointer">
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
          className={`input font-mono text-sm px-0 w-full border-none focus:border-none outline-none focus:outline-none ${(readOnly ?? disabled) ? "cursor-not-allowed" : ""}`}
          placeholder={placeholder || "Enter address or ENS name"}
          id={id}
          name={id}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled ?? readOnly}
          readOnly={readOnly ?? disabled}
          required={required}
          value={value}
        />
        {value && (
          // Don't want to use nextJS Image here (and adding remote patterns for the URL)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className={"!rounded-full ml-2"}
            src={avatarUrl ? avatarUrl : blo(value as Address)}
            width="30"
            height="30"
          />
        )}
      </div>
    </div>
  );
};

import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { blo } from "blo";
import { uniqueId } from "lodash-es";
import { Address, isAddress } from "viem";
import { useEnsAddress, useEnsAvatar, useEnsName } from "wagmi";
import { InfoWrapper } from "../InfoWrapper";
import { useDebounce } from "@/hooks/useDebounce";
import { isENS } from "@/utils/web3";

type ValidationStatus = {
  isValid: boolean;
  message?: string;
};

type Props = {
  label?: string;
  errors?: any;
  required?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  registerKey?: string;
  disabled?: boolean;
  className?: string;
  value?: string;
  tooltip?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onValidationChange?: (status: ValidationStatus) => void;
};

export const FormAddressInput = ({
  label,
  errors = false,
  required = false,
  placeholder = "0x",
  readOnly,
  registerKey,
  disabled,
  className,
  value = undefined,
  tooltip,
  onChange,
  onValidationChange,
}: Props) => {
  const id = uniqueId("address-input-");
  const debouncedValue = useDebounce(value, 500);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>({
    isValid: false,
  });
  const [shouldValidate, setShouldValidate] = useState(false);

  const debouncedOrValue = isAddress(value ?? "") ? value : debouncedValue;
  const isDebouncedValueLive = debouncedOrValue === value;
  const settledValue = isDebouncedValueLive ? debouncedOrValue : undefined;

  const { data: ensAddress, isError: ensError } = useEnsAddress({
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

  const validateAddress = useCallback(() => {
    if (!value) {
      setValidationStatus({
        isValid: !required,
        message: required ? "Address is required" : undefined,
      });
      return;
    }

    if (isAddress(value)) {
      setValidationStatus({ isValid: true });
    } else if (isENS(value)) {
      if (ensError) {
        setValidationStatus({
          isValid: false,
          message: "Invalid ENS name",
        });
      } else if (ensAddress) {
        setValidationStatus({ isValid: true });
      } else {
        setValidationStatus({
          isValid: false,
          message: "Resolving ENS name...",
        });
      }
    } else {
      setValidationStatus({
        isValid: false,
        message: "Invalid Ethereum address or ENS name",
      });
    }
  }, [value, ensAddress, ensError, required]);

  // Only validate when shouldValidate is true (after blur)
  useEffect(() => {
    if (shouldValidate) {
      validateAddress();
    }
  }, [shouldValidate, validateAddress]);

  // Notify parent component of validation changes
  useEffect(() => {
    onValidationChange?.(validationStatus);
  }, [validationStatus, onValidationChange]);

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

  const handleBlur = useCallback(() => {
    setShouldValidate(true);
  }, []);

  let modifier = "";
  if (Object.keys(errors).find((err) => err === registerKey)) {
    modifier = "border-error";
  } else if (disabled) {
    modifier = "border-disabled";
  } else if (readOnly) {
    modifier =
      "!border-gray-300 !focus-within:border-gray-300 focus-within:outline !outline-gray-300 cursor-not-allowed bg-transparent";
  } else if (!validationStatus.isValid && shouldValidate) {
    modifier = "border-error";
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
          className={`input font-mono text-sm px-0 w-full border-none focus:border-none outline-none focus:outline-none ${
            (readOnly ?? disabled) ? "cursor-not-allowed" : ""
          }`}
          placeholder={placeholder || "Enter address or ENS name"}
          id={id}
          name={id}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          disabled={disabled ?? readOnly}
          readOnly={readOnly ?? disabled}
          required={required}
          value={value}
        />
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="!rounded-full ml-2"
            src={avatarUrl ? avatarUrl : blo(value as Address)}
            width="30"
            height="30"
          />
        )}
      </div>
      {validationStatus.message &&
        !validationStatus.isValid &&
        shouldValidate && (
          <p className="text-xs mt-[6px] text-error">
            {validationStatus.message}
          </p>
        )}
    </div>
  );
};

import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { blo } from "blo";
import { uniqueId } from "lodash-es";
import { Address, isAddress } from "viem";
import { useEnsAddress, useEnsAvatar, useEnsName } from "wagmi";
import { InfoWrapper } from "../InfoWrapper";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useDebounce } from "@/hooks/useDebounce";
import { useSafeValidation } from "@/hooks/useSafeValidation";
import { isENS } from "@/utils/web3";

type ValidationStatus = {
  isValid: boolean;
  message?: string;
  isValidating?: boolean;
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
  validateSafe?: boolean;
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
  validateSafe = false,
}: Props) => {
  const id = uniqueId("address-input-");
  const debouncedValue = useDebounce(value, 500);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>({
    isValid: false,
  });
  const [shouldValidate, setShouldValidate] = useState(false);
  const chain = useChainFromPath();

  const debouncedOrValue = isAddress(value ?? "") ? value : debouncedValue;
  const isDebouncedValueLive = debouncedOrValue === value;
  const settledValue = isDebouncedValueLive ? debouncedOrValue : undefined;

  // ENS Resolution
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

  // SAFE Validation using the custom hook
  const { isSafe, isLoading: isValidatingSafe } = useSafeValidation({
    address: value as Address,
    enabled: validateSafe && isAddress(value ?? "") && shouldValidate,
  });

  const validateAddress = useCallback(async () => {
    if (!value) {
      setValidationStatus({
        isValid: !required,
        message: required ? "Address is required" : undefined,
      });
      return;
    }

    if (!isAddress(value) && !isENS(value)) {
      setValidationStatus({
        isValid: false,
        message: "Invalid Ethereum address or ENS name",
      });
      return;
    }

    if (isENS(value)) {
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
      return;
    }

    // SAFE validation if enabled
    if (validateSafe) {
      setValidationStatus((prev) => ({
        ...prev,
        isValidating: true,
      }));

      try {
        if (isValidatingSafe) {
          setValidationStatus({
            isValid: false,
            isValidating: true,
            message: "Validating Safe address...",
          });
          return;
        }

        setValidationStatus({
          isValid: isSafe,
          message:
            isSafe ? undefined : (
              `Not a valid Safe address in ${chain?.name} network`
            ),
          isValidating: false,
        });
      } catch (error) {
        setValidationStatus({
          isValid: false,
          message: "Error validating Safe address",
          isValidating: false,
        });
      }
    } else {
      // Regular address validation
      setValidationStatus({
        isValid: true,
        isValidating: false,
      });
    }
  }, [
    value,
    ensAddress,
    ensError,
    required,
    validateSafe,
    chain?.name,
    isSafe,
    isValidatingSafe,
  ]);

  useEffect(() => {
    if (shouldValidate) {
      validateAddress();
    }
  }, [shouldValidate, validateAddress]);

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
  } else if (
    !validationStatus.isValid &&
    shouldValidate &&
    !validationStatus.isValidating
  ) {
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
            readOnly ?? disabled ? "cursor-not-allowed" : ""
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

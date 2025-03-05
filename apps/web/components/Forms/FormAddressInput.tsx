import { useEffect, useState } from "react";
import { blo } from "blo";
import Image from "next/image";
import { UseFormTrigger } from "react-hook-form";
import { Address, isAddress } from "viem";
import { useEnsAddress, useEnsAvatar, useEnsName } from "wagmi";
import { FormInput } from "./FormInput";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useDebounce } from "@/hooks/useDebounce";
import { useSafeValidation } from "@/hooks/useSafeValidation";
import { ethAddressRegEx } from "@/utils/text";
import { isENS } from "@/utils/web3";

type Props = {
  label?: string;
  errors?: any;
  required?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  registerKey?: string;
  register?: any;
  disabled?: boolean;
  className?: string;
  value?: string;
  tooltip?: string;
  validateSafe?: boolean;
  registerOptions?: any;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  trigger?: UseFormTrigger<any>;
};

export const FormAddressInput = ({
  label,
  errors = {},
  required = false,
  placeholder = "0x",
  readOnly,
  registerKey = "",
  register,
  disabled,
  className,
  value,
  tooltip,
  validateSafe = false,
  onChange,
  registerOptions,
  trigger,
  ...rest
}: Props) => {
  const debouncedValue = useDebounce(value, 500);
  const chain = useChainFromPath();

  const [inputValue, setInputValue] = useState<string>("");

  // ENS Resolution
  const { data: ensAddress, isError: ensError } = useEnsAddress({
    name: debouncedValue,
    enabled: isENS(debouncedValue),
    chainId: 1,
    cacheTime: 30_000,
  });

  const { data: ensName } = useEnsName({
    address: debouncedValue as Address,
    enabled: isAddress(debouncedValue ?? ""),
    chainId: 1,
    cacheTime: 30_000,
  });

  const { data: avatarUrl } = useEnsAvatar({
    name: ensName,
    enabled: Boolean(ensName),
    chainId: 1,
    cacheTime: 30_000,
  });

  // SAFE Validation
  const { isSafe, isLoading: isValidatingSafe } = useSafeValidation({
    address: debouncedValue as Address,
    enabled: validateSafe && isAddress(debouncedValue ?? ""),
  });

  useEffect(() => {
    if (ensAddress) {
      setInputValue(ensAddress);
      onChange?.({
        target: { value: ensAddress },
      } as React.ChangeEvent<HTMLInputElement>);
      if (trigger && registerKey) {
        trigger(registerKey);
      }
    }
  }, [ensAddress, onChange, trigger, registerKey]);

  const extendedRegisterOptions = {
    ...registerOptions,
    pattern: {
      value: ethAddressRegEx,
      message: "Invalid Ethereum address",
    },
    validate: async (validateValue: string) => {
      // ENS validation
      if (isENS(validateValue)) {
        if (ensError) return "Invalid ENS name";
        if (!ensAddress) return "Unable to resolve ENS name";
        return true;
      }

      // Address format validation
      if (!isAddress(validateValue)) {
        return "Invalid Ethereum address format";
      }

      // SAFE validation if required
      if (validateSafe) {
        if (isValidatingSafe) return "Validating Safe address...";
        return isSafe || `Not a valid Safe address in ${chain?.name} network`;
      }

      return true;
    },
  };

  return (
    <FormInput
      {...rest}
      label={label}
      tooltip={tooltip}
      type="text"
      registerKey={registerKey}
      register={register}
      required={required}
      placeholder={placeholder}
      errors={errors}
      disabled={disabled}
      readOnly={readOnly}
      className={`font-mono ${className ?? ""} pr-12`}
      value={inputValue}
      registerOptions={{
        ...extendedRegisterOptions,
        onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
          if (onChange) {
            onChange(e);
          }
          if (trigger && registerKey) {
            await trigger(registerKey);
          }
        },
      }}
      suffix={
        debouncedValue && (
          <Image
            alt=""
            className="rounded-full"
            src={avatarUrl ? avatarUrl : blo(debouncedValue as Address)}
            width="30"
            height="30"
          />
        )
      }
    />
  );
};

export default FormAddressInput;

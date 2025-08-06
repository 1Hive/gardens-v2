import { useEffect, useState } from "react";
import { blo } from "blo";
import Image from "next/image";
import { RegisterOptions } from "react-hook-form";
import { Address, isAddress } from "viem";
import {
  useEnsAddress,
  useEnsAvatar,
  useEnsName,
  useNetwork,
  usePublicClient,
} from "wagmi";
import { FormInput } from "./FormInput";
import { LoadingSpinner } from "../LoadingSpinner";
import { getConfigByChain } from "@/configs/chains";
import { useCheat } from "@/hooks/useCheat";
import { useDebounce } from "@/hooks/useDebounce";
import { safeABI } from "@/src/customAbis";
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
  registerOptions?: RegisterOptions;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  suffix?: React.ReactNode;
  // trigger?: UseFormTrigger<any>;
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
  // trigger,
  suffix,
  ...rest
}: Props) => {
  const debouncedValue = useDebounce(value, 500);
  const { chain } = useNetwork();
  // const connectedChainId = chain?.id;
  const publicClient = usePublicClient();

  const [inputValue, setInputValue] = useState<string>("");
  const [isValidatingSafe, setIsValidatingSafe] = useState<boolean>(false);
  const bypassSafeCheck = useCheat("bypassSafeCheck");

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

  useEffect(() => {
    if (ensAddress) {
      setInputValue(ensAddress);
      (onChange ?? registerOptions?.onChange)?.({
        target: { value: ensAddress },
      } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [ensAddress]);

  const validateSafeAddress = async (address: string) => {
    if (
      bypassSafeCheck ||
      !getConfigByChain(publicClient.chain.id)?.safePrefix
    ) {
      return true;
    }
    try {
      setIsValidatingSafe(true);
      const [owners] = await Promise.all([
        publicClient?.readContract({
          address: address as Address,
          abi: safeABI,
          functionName: "getOwners",
        }),
      ]);
      if (!!owners?.length) {
        return true;
      } else {
        return `Not a valid Safe address in ${chain?.name} network`;
      }
    } catch (err) {
      console.error(err);
      return `Not a valid Safe address in ${chain?.name} network`;
    } finally {
      setIsValidatingSafe(false);
    }
  };

  const extendedRegisterOptions = {
    ...registerOptions,
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
        const isValid = await validateSafeAddress(validateValue);
        return isValid;
      }

      return true;
    },
  };

  return (
    <div className="w-[29rem]">
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
        className={`${className} pr-12`}
        value={inputValue}
        registerOptions={{
          ...extendedRegisterOptions,
        }}
        onChange={(e) => {
          (onChange ?? registerOptions?.onChange)?.(e);
          setInputValue(e.target.value);
        }}
        wide={true}
        suffix={
          suffix ??
          (isValidatingSafe ?
            <LoadingSpinner className="text-neutral-soft-content" />
          : debouncedValue && (
              <Image
                alt=""
                className="rounded-full"
                src={avatarUrl ? avatarUrl : blo(debouncedValue as Address)}
                width="30"
                height="30"
              />
            ))
        }
      />
    </div>
  );
};

export default FormAddressInput;

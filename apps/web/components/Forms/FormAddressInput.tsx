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
import { useDebounce } from "@/hooks/useDebounce";
import { useFlag } from "@/hooks/useFlag";
import { safeABI } from "@/src/customAbis";
import { erc20ABI } from "@/src/generated";
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
  validateERC20?: boolean;
  registerOptions?: RegisterOptions;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  suffix?: React.ReactNode;
  testId?: string;
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
  validateERC20 = false,
  onChange,
  registerOptions,
  // trigger,
  suffix,
  testId,
  ...rest
}: Props) => {
  const debouncedValue = useDebounce(value, 500);
  const { chain } = useNetwork();
  // const connectedChainId = chain?.id;
  const publicClient = usePublicClient();

  const [inputValue, setInputValue] = useState<string>(value ?? "");
  const [isValidatingSafe, setIsValidatingSafe] = useState<boolean>(false);
  const [isValidatingERC20, setIsValidatingERC20] = useState<boolean>(false);
  const bypassSafeCheck = useFlag("bypassSafeCheck");

  useEffect(() => {
    setInputValue(value ?? "");
  }, [value]);

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
      const isSafe = await Promise.all([
        publicClient?.readContract({
          address: address as Address,
          abi: safeABI,
          functionName: "getOwners",
        }),
      ])
        .catch(() => {
          return false;
        })
        .then(() => {
          return true;
        });
      if (isSafe) {
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

  const validateErc20Address = async (address: string) => {
    if (!validateERC20) {
      return true;
    }

    if (!Boolean(publicClient)) {
      return "Unable to validate token address without an RPC client.";
    }

    try {
      setIsValidatingERC20(true);
      const [symbol, decimals] = await Promise.all([
        publicClient.readContract({
          address: address as Address,
          abi: erc20ABI,
          functionName: "symbol",
        }),
        publicClient.readContract({
          address: address as Address,
          abi: erc20ABI,
          functionName: "decimals",
        }),
      ]);

      if (typeof symbol === "string" && symbol.length > 0 && decimals != null) {
        return true;
      }
      return "Not a valid ERC20 token";
    } catch (error) {
      console.error("ERC20 validation failed:", error);
      return "Not a valid ERC20 token";
    } finally {
      setIsValidatingERC20(false);
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

      if (validateERC20) {
        const erc20Validation = await validateErc20Address(validateValue);
        return erc20Validation;
      }

      return true;
    },
  };

  const isValidInputAddress = isAddress(inputValue ?? "");
  const hasEnsAvatar = Boolean(avatarUrl);

  return (
    <div className="w-full max-w-[29rem]">
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
          (isValidatingSafe || isValidatingERC20 ?
            <LoadingSpinner className="text-neutral-soft-content" />
          : hasEnsAvatar ?
            <Image
              alt=""
              className="rounded-full"
              src={avatarUrl!}
              width={30}
              height={30}
            />
          : isValidInputAddress ?
            <Image
              alt=""
              className="rounded-full"
              src={blo(inputValue as Address)}
              width={30}
              height={30}
            />
          : null)
        }
        testId={testId}
      />
    </div>
  );
};

export default FormAddressInput;

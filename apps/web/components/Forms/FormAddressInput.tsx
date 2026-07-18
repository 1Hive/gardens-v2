import { useEffect, useMemo, useState } from "react";
import { blo } from "blo";
import Image from "next/image";
import Link from "next/link";
import { RegisterOptions } from "react-hook-form";
import { Address, createPublicClient, http, isAddress } from "viem";
import { useEnsAddress, useEnsAvatar, useEnsName, useNetwork } from "wagmi";
import { FormInput } from "./FormInput";
import { LoadingSpinner } from "../LoadingSpinner";
import { newLogo } from "@/assets";
import { getChain, getConfigByChain } from "@/configs/chains";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useCVStrategyLink } from "@/hooks/useCVStrategyLink";
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
  tooltipClassName?: string;
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
  tooltipClassName,
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
  const { chain: connectedChain } = useNetwork();
  const chainIdFromPath = useChainIdFromPath();
  const validationChain = useMemo(
    () =>
      (chainIdFromPath != null ? getChain(chainIdFromPath) : undefined) ??
      (connectedChain?.id != null ? getChain(connectedChain.id) : undefined) ??
      connectedChain,
    [chainIdFromPath, connectedChain],
  );
  const validationClient = useMemo(() => {
    if (!validationChain) {
      return undefined;
    }

    const rpcUrl = getConfigByChain(validationChain.id)?.rpcUrl?.trim();

    return createPublicClient({
      chain: validationChain,
      transport: rpcUrl ? http(rpcUrl) : http(),
    });
  }, [validationChain]);

  const [inputValue, setInputValue] = useState<string>(value ?? "");
  const [isValidatingSafe, setIsValidatingSafe] = useState<boolean>(false);
  const [isValidatingERC20, setIsValidatingERC20] = useState<boolean>(false);
  const bypassSafeCheck = useFlag("bypassSafeCheck");
  const poolHref = useCVStrategyLink(inputValue);

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
        target: { name: registerKey, value: ensAddress },
        currentTarget: { name: registerKey, value: ensAddress },
      } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [ensAddress, onChange, registerKey, registerOptions]);

  const validateSafeAddress = async (address: string) => {
    if (bypassSafeCheck) {
      return true;
    }

    if (!validationClient) {
      return "Unable to validate Safe address without an RPC client.";
    }

    if (
      bypassSafeCheck ||
      getConfigByChain(validationClient.chain.id)?.safePrefix == null
    ) {
      return true;
    }
    try {
      setIsValidatingSafe(true);
      const isSafe = await Promise.all([
        validationClient.readContract({
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
        return `Not a valid Safe address in ${validationChain?.name} network`;
      }
    } catch {
      console.warn(
        `Safe validation failed for ${address} on ${validationChain?.name ?? "unknown network"}`,
      );
      return `Not a valid Safe address in ${validationChain?.name} network`;
    } finally {
      setIsValidatingSafe(false);
    }
  };

  const validateErc20Address = async (address: string) => {
    if (!validateERC20) {
      return true;
    }

    const client = validationClient;
    if (!client) {
      return "Unable to validate token address without an RPC client.";
    }

    try {
      setIsValidatingERC20(true);
      const [symbol, decimals] = await Promise.all([
        client.readContract({
          address: address as Address,
          abi: erc20ABI,
          functionName: "symbol",
        }),
        client.readContract({
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
      const resolvedValue =
        (isENS(validateValue) ? ensAddress : validateValue) ?? "";

      // ENS validation
      if (isENS(validateValue)) {
        if (ensError) return "Invalid ENS name";
        if (!ensAddress) return "Unable to resolve ENS name";
      }

      // Address format validation
      if (!isAddress(resolvedValue ?? "")) {
        return "Invalid Ethereum address format";
      }

      // SAFE validation if required
      if (validateSafe) {
        const isValid = await validateSafeAddress(resolvedValue);
        return isValid;
      }

      if (validateERC20) {
        const erc20Validation = await validateErc20Address(resolvedValue);
        return erc20Validation;
      }

      return true;
    },
  };

  const isValidInputAddress = isAddress(inputValue ?? "");
  const hasEnsAvatar = Boolean(avatarUrl);
  const resolvedEnsVisualErrorCleared =
    errors?.[registerKey]?.message === "Unable to resolve ENS name" &&
    (Boolean(ensAddress) || isValidInputAddress);
  const displayErrors =
    resolvedEnsVisualErrorCleared ?
      {
        ...errors,
        [registerKey]: undefined,
      }
    : errors;

  return (
    <div className="w-full max-w-[31rem]">
      <FormInput
        {...rest}
        label={label}
        tooltip={tooltip}
        tooltipClassName={tooltipClassName}
        type="text"
        registerKey={registerKey}
        register={register}
        required={required}
        placeholder={placeholder}
        errors={displayErrors}
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
        outsideSuffix={
          poolHref ?
            <Link
              href={poolHref}
              aria-label="Open pool page"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-primary hover:opacity-80"
              onClick={(event) => event.stopPropagation()}
            >
              <Image
                src={newLogo}
                alt=""
                height={24}
                width={24}
                className="h-6 w-6"
                loading="lazy"
              />
            </Link>
          : undefined
        }
        testId={testId}
      />
    </div>
  );
};

export default FormAddressInput;

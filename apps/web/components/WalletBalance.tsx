import { FC, useEffect, useState } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { formatEther, formatUnits } from "viem";
import { Address, useAccount, useBalance } from "wagmi";
import { DisplayNumber } from "./DisplayNumber";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { useHasContractCode } from "@/hooks/useHasContractCode";
import { usePreferredReadClient } from "@/hooks/usePreferredReadClient";
import { erc20ABI } from "@/src/generated";
import { logOnce } from "@/utils/log";
import { roundToSignificant } from "@/utils/numbers";

type Props = {
  label: string;
  token: "native" | Address;
  askedAmount: bigint;
  tooltip?: string;
  setIsEnoughBalance: (isEnoughBalance: boolean) => void;
};

type BalanceData = {
  formatted: string;
  symbol?: string;
  value: bigint;
};

/**
 * Used to display the balance of a wallet and check if it's enough
 * @param {Props} props
 * - label: string
 * - token: "native" or erc20 address
 * - askedAmount: amount of the token in ether format
 * - setIsEnoughBalance: outer setter for the balance check
 */
export const WalletBalance: FC<Props> = ({
  token,
  askedAmount,
  label,
  tooltip,
  setIsEnoughBalance,
}) => {
  const { address, isDisconnected } = useAccount();
  const chainId = useChainIdFromPath();
  const readClient = usePreferredReadClient(chainId);
  const [fallbackBalance, setFallbackBalance] = useState<BalanceData>();
  const isNativeToken = token === "native";
  const { hasContractCode } = useHasContractCode({
    address: isNativeToken ? undefined : token,
    chainId,
    enabled: !isNativeToken,
  });

  const { data, isLoading, isFetching } = useBalance({
    address,
    formatUnits: "ether",
    token: isNativeToken ? undefined : (token as Address),
    watch: true,
    chainId,
    enabled: isNativeToken || hasContractCode,
  });
  const balanceData = data ?? fallbackBalance;

  useEffect(() => {
    if (isDisconnected || balanceData != null) {
      return;
    }

    logOnce("debug", "[WalletBalance] loading condition", {
      label,
      token,
      chainId,
      address,
      isNativeToken,
      hasContractCode,
      isLoading,
      isFetching,
      balanceReadEnabled: isNativeToken || hasContractCode,
    });
  }, [
    address,
    balanceData,
    chainId,
    hasContractCode,
    isDisconnected,
    isFetching,
    isLoading,
    isNativeToken,
    label,
    token,
  ]);

  useEffect(() => {
    if (
      isDisconnected ||
      data != null ||
      address == null ||
      (!isNativeToken && !hasContractCode)
    ) {
      if (data != null) {
        setFallbackBalance(undefined);
      }
      return;
    }

    let cancelled = false;

    const fetchBalance = async () => {
      try {
        if (isNativeToken) {
          const value = await readClient.getBalance({ address });

          if (!cancelled) {
            setFallbackBalance({
              value,
              formatted: formatEther(value),
              symbol: readClient.chain?.nativeCurrency.symbol,
            });
          }

          return;
        }

        const tokenAddress = token as Address;
        const [value, decimals, symbol] = await Promise.all([
          readClient.readContract({
            abi: erc20ABI,
            address: tokenAddress,
            functionName: "balanceOf",
            args: [address],
          }),
          readClient.readContract({
            abi: erc20ABI,
            address: tokenAddress,
            functionName: "decimals",
          }),
          readClient.readContract({
            abi: erc20ABI,
            address: tokenAddress,
            functionName: "symbol",
          }),
        ]);

        if (!cancelled) {
          setFallbackBalance({
            value: value as bigint,
            formatted: formatUnits(value as bigint, Number(decimals)),
            symbol: symbol as string,
          });
        }
      } catch (caughtError) {
        if (!cancelled) {
          setFallbackBalance(undefined);
          console.error("Failed to load wallet balance", {
            address,
            chainId,
            token,
            error: caughtError,
          });
        }
      }
    };

    void fetchBalance();
    const intervalId = window.setInterval(() => {
      void fetchBalance();
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    address,
    chainId,
    data,
    hasContractCode,
    isDisconnected,
    isNativeToken,
    readClient,
    token,
  ]);

  const balance = balanceData?.value;
  const askedFormated = (+formatEther(askedAmount)).toFixed(4);
  const isEnoughBalance = balance != null && balance >= askedAmount;

  useEffect(() => {
    setIsEnoughBalance(isEnoughBalance);
  }, [balance, askedAmount, setIsEnoughBalance]);

  return (
    <div>
      {balanceData == null ?
        isDisconnected ?
          <div />
        : !isNativeToken && !hasContractCode ?
          <div className="text-sm text-neutral-soft-content">Unavailable</div>
        : <div className="skeleton h-14 w-56 [--fallback-b3:#f0f0f0] dark:[--fallback-b1:#353535]" />

      : <div className="flex flex-col gap-1">
          <div className="flex">
            <p className="font-medium">{label}:</p>
            <div
              className="tooltip ml-2 flex cursor-pointer items-center"
              data-tip={tooltip}
            >
              <DisplayNumber
                number={askedFormated}
                valueClassName="font-semibold"
                disableTooltip={true}
                compact={true}
                tokenSymbol={balanceData.symbol}
              />
              <InformationCircleIcon
                className="ml-2 stroke-2"
                width={18}
                height={18}
              />
            </div>
          </div>
          <div className="flex">
            <p className="font-medium">Your balance:</p>
            <div
              className={`tooltip ml-2 flex cursor-pointer items-center ${
                isEnoughBalance ?
                  "text-primary-content dark:text-primary-content"
                : "text-danger-content dark:text-danger-content"
              } `}
              data-tip={`${isEnoughBalance ? `${formatEther(balanceData.value)}` : "Insufficient balance"}`}
            >
              <DisplayNumber
                number={roundToSignificant(+(balanceData.formatted || 0), 4)}
                valueClassName={`font-semibold ${
                  isEnoughBalance ?
                    "text-primary-content dark:text-primary-content"
                  : "text-danger-content dark:text-danger-content"
                }`}
                disableTooltip={true}
                tokenSymbol={balanceData.symbol}
              />
            </div>
          </div>
        </div>
      }
    </div>
  );
};

import { FC, useEffect, useRef } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { formatEther } from "viem";
import { Address, useAccount, useBalance } from "wagmi";
import { DisplayNumber } from "./DisplayNumber";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { roundToSignificant } from "@/utils/numbers";

type Props = {
  label: string;
  token: "native" | Address;
  askedAmount: bigint;
  tooltip?: string;
  setIsEnoughBalance: (isEnoughBalance: boolean) => void;
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
  const isEnoughBalanceRef = useRef(false);
  const chainId = useChainIdFromPath();

  const { data } = useBalance({
    address,
    formatUnits: "ether",
    token: token === "native" ? undefined : (token as Address),
    watch: true,
    chainId,
  });

  const balance = data && data.value;
  const askedFormated = (+formatEther(askedAmount)).toFixed(4);

  useEffect(() => {
    if (balance != null) {
      isEnoughBalanceRef.current = balance != null && balance >= askedAmount;
      setIsEnoughBalance(isEnoughBalanceRef.current);
    }
  }, [balance, askedAmount, setIsEnoughBalance]);

  const isEnoughBalance = askedAmount != null && isEnoughBalanceRef.current;

  return (
    <div>
      {!data ?
        isDisconnected ?
          <div />
        : <div className="skeleton h-14 w-56 bg-neutral" />
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
                tokenSymbol={data?.symbol}
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
              data-tip={`${isEnoughBalance ? `${formatEther(data?.value ?? 0n)}` : "Insufficient balance"}`}
            >
              <DisplayNumber
                number={roundToSignificant(+(data?.formatted || 0), 4)}
                valueClassName={`font-semibold ${
                  isEnoughBalance ?
                    "text-primary-content dark:text-primary-content"
                  : "text-danger-content dark:text-danger-content"
                }`}
                disableTooltip={true}
                tokenSymbol={data?.symbol}
              />
            </div>
          </div>
        </div>
      }
    </div>
  );
};

import { FC, useEffect, useRef } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { formatEther } from "viem";
import { Address, useAccount, useBalance } from "wagmi";
import { DisplayNumber } from "./DisplayNumber";

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
  const { address } = useAccount();
  const isEnoughBalanceRef = useRef(false);

  const { data } = useBalance({
    address,
    formatUnits: "ether",
    token: token === "native" ? undefined : (token as Address),
    watch: true,
  });

  const balance = data && data.value;
  const askedFormated = (+formatEther(askedAmount)).toPrecision(2);

  useEffect(() => {
    if (balance != null) {
      isEnoughBalanceRef.current = !!balance && balance >= askedAmount;
      setIsEnoughBalance(isEnoughBalanceRef.current);
    }
  }, [balance, askedAmount, setIsEnoughBalance]);

  return (
    <>
      {!data ?
        <div className="skeleton h-14 w-56 bg-neutral-soft" />
      : <div className="flex flex-col gap-1">
          <div className="flex">
            <p className="font-medium">{label}:</p>
            <div
              className="tooltip ml-2 flex cursor-pointer items-center text-primary-content"
              data-tip={tooltip}
            >
              <DisplayNumber
                number={askedFormated}
                className="font-semibold text-primary-content"
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
              className={`tooltip ml-2 flex cursor-pointer items-center ${isEnoughBalanceRef.current ? "text-primary-content" : "text-neutral-soft-content"} `}
              data-tip={`${isEnoughBalanceRef.current ? balance : "Insufficient balance"}`}
            >
              <DisplayNumber
                number={(+(data?.formatted ?? 0)).toPrecision(2).toString()}
                className={`font-semibold ${isEnoughBalanceRef.current ? "text-primary-content" : "text-neutral-soft-content"}`}
                disableTooltip={true}
                compact={true}
                tokenSymbol={data?.symbol}
              />
              <InformationCircleIcon
                className={`ml-2 stroke-2 ${isEnoughBalanceRef.current ? "text-primary-content" : "text-neutral-soft-content"}`}
                width={18}
                height={18}
              />
            </div>
          </div>
        </div>
      }
    </>
  );
};

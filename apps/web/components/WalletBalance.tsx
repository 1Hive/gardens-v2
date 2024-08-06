import { FC, useEffect, useRef } from "react";
import { CurrencyDollarIcon, WalletIcon } from "@heroicons/react/24/outline";
import { Address, useAccount, useBalance } from "wagmi";
import { InfoIcon } from "./InfoIcon";
import { Statistic } from "./Statistic";

type Props = {
  label: string;
  token: "native" | Address;
  askedAmount: number;
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
  const { data, isFetching } = useBalance({
    address,
    formatUnits: "ether",
    token: token === "native" ? undefined : (token as Address),
    watch: true,
  });

  const balance = data && +data.formatted;

  useEffect(() => {
    if (data?.value) {
      isEnoughBalanceRef.current = !!balance && balance >= askedAmount;
      setIsEnoughBalance(isEnoughBalanceRef.current);
    }
  }, [data?.value, askedAmount, setIsEnoughBalance]);

  return (
    <div
      className={`rounded-xl p-3 shadow border border-solid ${isEnoughBalanceRef.current ? "border-success bg-[#f8fffa]" : "border-error bg-[#fff5f5]"} ${isFetching ? "skeleton" : ""}`}
    >
      <div
        className={`font-bold ${isEnoughBalanceRef.current ? "text-success" : "text-error"}`}
      >
        {tooltip ?
          <InfoIcon tooltip={tooltip}>{label}</InfoIcon>
        : label}
      </div>
      <div className="text-base">
        <Statistic
          count={<div className="w-14">{askedAmount.toFixed(4)}</div>}
          icon={
            <InfoIcon
              tooltip="Cost amount"
              customIcon={<CurrencyDollarIcon />}
              classNames="[&:before]:ml-2"
            />
          }
        >
          {data?.symbol}
        </Statistic>
      </div>
      <div>
        <Statistic
          count={<div className="w-14">{balance?.toFixed(4)}</div>}
          icon={
            <InfoIcon
              tooltip="Wallet balance"
              customIcon={<WalletIcon />}
              classNames="[&:before]:ml-2"
            />
          }
        >
          {data?.symbol}
        </Statistic>
      </div>
    </div>
  );
};

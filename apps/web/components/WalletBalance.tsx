import React, { FC, useEffect, useRef, useState } from "react";
import { Address, useAccount, useBalance } from "wagmi";
import { Statistic } from "./Statistic";
import { CurrencyDollarIcon, WalletIcon } from "@heroicons/react/24/outline";

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

  useEffect(() => {
    if (data?.value) {
      isEnoughBalanceRef.current =
        !!data?.value && +data?.formatted >= askedAmount;
      setIsEnoughBalance(isEnoughBalanceRef.current);

      console.log({
        data: data?.value,
        askedAmount,
        isEnoughBalance: isEnoughBalanceRef.current,
      });
    }
  }, [data?.value, askedAmount, setIsEnoughBalance]);

  const formatedWith3Decimals = parseFloat(
    data?.formatted?.toString() ?? "0",
  ).toFixed(3);

  return (
    <div
      className={`rounded-xl p-3 shadow border border-solid ${isEnoughBalanceRef.current ? "border-success bg-[#f8fffa]" : "border-error bg-[#fff5f5]"} ${isFetching ? "skeleton" : ""}`}
    >
      <div
        className={`font-bold ${isEnoughBalanceRef.current ? "text-success" : "text-error"}`}
      >
        {label}
      </div>
      <div className="text-base">
        <Statistic
          count={askedAmount}
          icon={<CurrencyDollarIcon></CurrencyDollarIcon>}
        >
          {data?.symbol}
        </Statistic>
      </div>
      <div>
        <Statistic
          count={formatedWith3Decimals}
          icon={<WalletIcon></WalletIcon>}
        >
          {data?.symbol}
        </Statistic>
      </div>
    </div>
  );
};

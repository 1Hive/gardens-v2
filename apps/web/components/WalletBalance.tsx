import React, { FC, useEffect, useRef, useState } from "react";
import { Address, useAccount, useBalance } from "wagmi";

type Props = {
  label: string;
  token: "native" | Address;
  askedAmount: number;
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
      <div className="font-bold">{label}</div>
      <div className="text-base">
        {askedAmount} {data?.symbol}
      </div>
      <div
        className={`${isEnoughBalanceRef.current ? "text-success" : "text-error"}`}
      >
        Wallet: {formatedWith3Decimals} {data?.symbol}
      </div>
    </div>
  );
};

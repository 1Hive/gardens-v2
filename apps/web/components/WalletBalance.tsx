import React, { FC } from "react";
import { Address, useAccount, useBalance } from "wagmi";

type Props = {
  token: "native" | Address;
  askedAmount: number;
  setIsEnoughBalance: (isEnoughBalance: boolean) => void;
};

export const WalletBalance: FC<Props> = ({ token, askedAmount }) => {
  const { address } = useAccount();
  const { data, isFetching } = useBalance({
    address,
    formatUnits: "ether",
    watch: true,
    token: token === "native" ? undefined : (token as Address),
  });

  const isEnoughBalance = data?.value && data?.value >= askedAmount;
  console.log({ isEnoughBalance, value: data?.value });

  return (
    <div
      className={`stats shadow ${isEnoughBalance ? "bg-success" : "bg-error"} `}
    >
      <div className="stat p-2">
        <div className="stat-title">Arbitration fees</div>
        <div className="stat-value text-sm">0.001 ETH</div>
        <div className={`stat-desc ${isFetching ? "skeleton" : ""}`}>
          Balance: {data?.value} ETH
        </div>
      </div>
    </div>
  );
};

import { FC, useEffect, useRef } from "react";
import {
  CurrencyDollarIcon,
  ExclamationCircleIcon,
  WalletIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { Address, useAccount, useBalance } from "wagmi";
import { DisplayNumber } from "./DisplayNumber";
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
    // <div
    //   className={`rounded-xl p-3 shadow border2 w-full ${isEnoughBalanceRef.current ? "border-success bg-[#f8fffa]" : "border-error bg-[#fff5f5]"} ${isFetching ? "skeleton" : ""}`}
    // >
    <div className="flex flex-col gap-1">
      <div className="flex">
        <p className="font-medium">Dispute stake:</p>
        <div
          className="tooltip ml-2 flex cursor-pointer items-center text-primary-content"
          data-tip={tooltip}
        >
          <DisplayNumber
            number={askedAmount.toString()}
            className="font-semibold text-primary-content"
            disableTooltip={true}
            compact={true}
            tokenSymbol={token}
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
            number={balance?.toFixed(2).toString() ?? "0"}
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
      {/* <div
        className={`font-bold ${isEnoughBalanceRef.current ? "text-success" : "text-error"}`}
      >
        {tooltip ?
          <InfoIcon tooltip={tooltip}>{label}</InfoIcon>
        : label}
      </div> */}
      {/* <div className="text-base">
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
      </div> */}
      {/* <div>
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
      </div> */}
    </div>
  );
};

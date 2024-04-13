import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useAccount, useNetwork } from "wagmi";

export interface ConditionObject {
  condition?: boolean;
  message: string;
}

const supportedChains: { [key: number]: string } = {
  421614: "Arbitrum Sepolia",
  1337: "Localhost",
};

export interface disableButtonsHookProps {
  tooltipMessage: string;
  isConnected: boolean;
  missmatchUrl: boolean;
}

export function useDisableButtons(
  conditions?: ConditionObject[],
): disableButtonsHookProps {
  const { isConnected } = useAccount();
  const path = usePathname();
  const urlChainId = Number(path.split("/")[2]); // chain id from the url
  const { chain } = useNetwork(); // wallet connected chain object
  const missmatchUrlAndWalletChain = chain?.id !== urlChainId;

  const tooltipMessage = useMemo(() => {
    if (!isConnected) {
      return "Connect Wallet";
    }
    if (missmatchUrlAndWalletChain) {
      return `Switch to ${supportedChains[urlChainId] ?? ""} Network`;
    }
    if (conditions && conditions.length > 0) {
      const activeCondition = conditions.find((cond) => cond.condition);
      if (activeCondition) {
        return activeCondition.message;
      }
    }
    return "tooltip message";
  }, [conditions, isConnected, missmatchUrlAndWalletChain, urlChainId]);

  return {
    tooltipMessage,
    isConnected,
    missmatchUrl: missmatchUrlAndWalletChain,
  };
}

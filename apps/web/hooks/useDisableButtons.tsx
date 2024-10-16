import { useMemo } from "react";
import { useAccount, useNetwork } from "wagmi";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";

export interface ConditionObject {
  condition?: boolean;
  message: string;
}

const supportedChains: { [key: number]: string } = {
  421614: "Arbitrum Sepolia",
  1337: "Localhost",
};

export interface DisableButtonsHookProps {
  tooltipMessage: string | undefined;
  isConnected: boolean;
  missmatchUrl: boolean;
}

export function useDisableButtons(
  conditions?: ConditionObject[],
): DisableButtonsHookProps {
  const { isConnected } = useAccount();
  const urlChainId = useChainIdFromPath();
  const { chain } = useNetwork(); // wallet connected chain object
  const missmatchUrlAndWalletChain = chain?.id !== urlChainId;

  const tooltipMessage = useMemo(() => {
    if (!isConnected) {
      return "Connect Wallet";
    }
    if (missmatchUrlAndWalletChain && urlChainId) {
      return `Switch to ${supportedChains[urlChainId] ?? ""} Network`;
    }
    if (conditions && conditions.length > 0) {
      const activeCondition = conditions.find((cond) => cond.condition);
      if (activeCondition) {
        return activeCondition.message;
      }
    }
    return undefined;
  }, [conditions, isConnected, missmatchUrlAndWalletChain]);

  return {
    tooltipMessage,
    isConnected,
    missmatchUrl: missmatchUrlAndWalletChain,
  };
}

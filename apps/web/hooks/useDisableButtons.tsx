import { useMemo } from "react";
import { useAccount, useNetwork } from "wagmi";
import { useChainFromPath } from "./useChainFromPath";

export interface ConditionObject {
  condition?: boolean;
  message: string;
}

export interface DisableButtonsHookProps {
  tooltipMessage: string | undefined;
  isConnected: boolean;
  missmatchUrl: boolean;
  isButtonDisabled: boolean;
}

export function useDisableButtons(
  conditions?: ConditionObject[],
): DisableButtonsHookProps {
  const { isConnected } = useAccount();
  const urlChain = useChainFromPath();
  const { chain } = useNetwork(); // wallet connected chain object
  const missmatchUrlAndWalletChain = chain?.id !== urlChain?.id;

  const tooltipMessage = useMemo(() => {
    if (!isConnected) {
      return "Connect Wallet";
    }
    if (missmatchUrlAndWalletChain && urlChain) {
      return `Switch to ${urlChain.name} Network`;
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
    isButtonDisabled: !!tooltipMessage,
  };
}

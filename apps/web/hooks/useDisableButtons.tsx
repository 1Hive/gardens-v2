import { useMemo } from "react";
import { useAccount, useNetwork } from "wagmi";
import {
  isWalletConnectConnection,
  isWrongNetworkForConnection,
} from "@/utils/network";
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

export { isWalletConnectConnection, isWrongNetworkForConnection };

export function useDisableButtons(
  conditions?: ConditionObject[],
): DisableButtonsHookProps {
  const { isConnected, connector } = useAccount();
  const urlChain = useChainFromPath();
  const { chain } = useNetwork(); // wallet connected chain object
  const missmatchUrlAndWalletChain =
    isWrongNetworkForConnection(chain?.id, urlChain?.id, connector?.id);

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

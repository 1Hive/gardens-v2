import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAccount, useChainId, useNetwork } from "wagmi";

export interface ConditionObject {
  condition?: boolean;
  message: string;
}

const supportedChains: { [key: number]: string } = {
  421614: "Arbitrum Sepolia",
  1337: "Localhost",
};

export function useTooltipMessage(conditions: ConditionObject[]): string {
  const { isConnected } = useAccount();
  const path = usePathname();
  const urlChainId = Number(path.split("/")[2]); //  chain id from the url
  const { chain } = useNetwork(); // wallet connected chain object
  const missmatchUrlAndWalletConnectedNetwork = chain?.id !== urlChainId;

  const [tooltipMessage, setTooltipMessage] = useState<string>("");

  useEffect(() => {
    const generateMessage = (
      isConnected: boolean,
      isMissmatchConnection: boolean,
    ): string => {
      if (!isConnected) {
        return "Connect Wallet";
      }
      if (isMissmatchConnection) {
        return `Switch to ${supportedChains[urlChainId] ?? ""} Network`;
      }
      // Find the first active condition and return its message
      const activeCondition = conditions.find((cond) => cond.condition);
      if (activeCondition) {
        return activeCondition.message;
      }
      return "tooltip message";
    };

    const currentTooltipMessage = generateMessage(
      isConnected,
      missmatchUrlAndWalletConnectedNetwork,
    );
    setTooltipMessage(currentTooltipMessage);

    return () => {
      setTooltipMessage("");
    };
  }, [conditions, isConnected, missmatchUrlAndWalletConnectedNetwork]);

  return tooltipMessage;
}

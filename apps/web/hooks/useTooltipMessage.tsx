import { useState, useEffect } from "react";
import { useAccount } from "wagmi";

export interface ConditionObject {
  condition?: boolean;
  message: string;
}

export function useTooltipMessage(conditions: ConditionObject[]): string {
  const { isConnected } = useAccount();
  const [tooltipMessage, setTooltipMessage] = useState<string>("");

  useEffect(() => {
    const generateMessage = (isConnected: boolean): string => {
      if (!isConnected) {
        return "Connect Wallet";
      }

      // Find the first active condition and return its message
      const activeCondition = conditions.find((cond) => cond.condition);
      if (activeCondition) {
        return activeCondition.message;
      }
      return "tooltip message";
    };

    const currentTooltipMessage = generateMessage(isConnected);
    setTooltipMessage(currentTooltipMessage);

    return () => {
      setTooltipMessage("");
    };
  }, [conditions, isConnected]);

  return tooltipMessage;
}

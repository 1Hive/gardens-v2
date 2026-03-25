import { useCallback } from "react";
import { toast } from "react-toastify";
import { useAccount, useSwitchNetwork } from "wagmi";
import { getChain } from "@/configs/chains";

export function useAppSwitchNetwork() {
  const { connector } = useAccount();
  const switchNetworkResult = useSwitchNetwork();
  const isWalletConnect = connector?.id === "walletConnect";

  const showManualSwitchToast = useCallback((chainId?: number) => {
    if (chainId == null) {
      return;
    }

    const targetChain = getChain(chainId);
    toast.info(
      `Switch network to ${targetChain?.name ?? `chain ${chainId}`} in your wallet.`,
      {
        toastId: `walletconnect-manual-switch-${chainId}`,
      },
    );
  }, []);

  const trySwitchNetworkAsync = useCallback(
    async (chainId?: number) => {
      if (chainId == null || !switchNetworkResult.switchNetworkAsync) {
        showManualSwitchToast(chainId);
        return undefined;
      }

      try {
        return await switchNetworkResult.switchNetworkAsync(chainId);
      } catch {
        showManualSwitchToast(chainId);
        return undefined;
      }
    },
    [showManualSwitchToast, switchNetworkResult],
  );

  const switchNetwork = useCallback(
    (chainId?: number) => {
      if (isWalletConnect) {
        void trySwitchNetworkAsync(chainId);
        return;
      }

      return switchNetworkResult.switchNetwork?.(chainId);
    },
    [isWalletConnect, switchNetworkResult, trySwitchNetworkAsync],
  );

  const switchNetworkAsync = useCallback(
    async (chainId?: number) => {
      if (isWalletConnect) {
        return trySwitchNetworkAsync(chainId);
      }

      return switchNetworkResult.switchNetworkAsync?.(chainId);
    },
    [isWalletConnect, switchNetworkResult, trySwitchNetworkAsync],
  );

  return {
    ...switchNetworkResult,
    switchNetwork,
    switchNetworkAsync,
    isManualWalletSwitchRequired: isWalletConnect,
  };
}

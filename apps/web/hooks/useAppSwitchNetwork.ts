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

  const switchNetwork = useCallback(
    (chainId?: number) => {
      if (isWalletConnect) {
        showManualSwitchToast(chainId);
        return;
      }

      return switchNetworkResult.switchNetwork?.(chainId);
    },
    [isWalletConnect, showManualSwitchToast, switchNetworkResult],
  );

  const switchNetworkAsync = useCallback(
    async (chainId?: number) => {
      if (isWalletConnect) {
        showManualSwitchToast(chainId);
        return undefined;
      }

      return switchNetworkResult.switchNetworkAsync?.(chainId);
    },
    [isWalletConnect, showManualSwitchToast, switchNetworkResult],
  );

  return {
    ...switchNetworkResult,
    switchNetwork,
    switchNetworkAsync,
    isManualWalletSwitchRequired: isWalletConnect,
  };
}

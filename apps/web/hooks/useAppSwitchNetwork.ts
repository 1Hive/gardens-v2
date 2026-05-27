import { useCallback } from "react";
import { toast } from "react-toastify";
import { useAccount, useSwitchNetwork } from "wagmi";
import { getChain } from "@/configs/chains";

export function useAppSwitchNetwork() {
  const { connector } = useAccount();
  const switchNetworkResult = useSwitchNetwork();
  const isWalletConnect =
    connector?.id === "walletConnect" ||
    connector?.id === "walletConnectLegacy";

  const showWalletConnectReconnectToast = useCallback((chainId?: number) => {
    if (chainId == null) {
      return;
    }

    const targetChain = getChain(chainId);
    const targetChainName = targetChain?.name ?? `chain ${chainId}`;

    toast.info(
      `Reconnect WalletConnect to approve ${targetChainName}, then switch to it in your wallet and try again.`,
      {
        toastId: `walletconnect-reconnect-${chainId}`,
      },
    );
  }, []);

  const trySwitchNetworkAsync = useCallback(
    async (chainId?: number) => {
      if (chainId == null || !switchNetworkResult.switchNetworkAsync) {
        showWalletConnectReconnectToast(chainId);
        return undefined;
      }

      try {
        return await switchNetworkResult.switchNetworkAsync(chainId);
      } catch {
        showWalletConnectReconnectToast(chainId);
        return undefined;
      }
    },
    [showWalletConnectReconnectToast, switchNetworkResult],
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

import { useCallback } from "react";
import { toast } from "react-toastify";
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi";
import { getChain } from "@/configs/chains";

const getWalletConnectDebugError = (error: unknown) => {
  const value = error as {
    name?: unknown;
    message?: unknown;
    shortMessage?: unknown;
    cause?: { name?: unknown; message?: unknown; shortMessage?: unknown };
  };

  return {
    name: typeof value?.name === "string" ? value.name : undefined,
    message: typeof value?.message === "string" ? value.message : undefined,
    shortMessage:
      typeof value?.shortMessage === "string" ? value.shortMessage : undefined,
    cause: {
      name:
        typeof value?.cause?.name === "string" ? value.cause.name : undefined,
      message:
        typeof value?.cause?.message === "string" ?
          value.cause.message
        : undefined,
      shortMessage:
        typeof value?.cause?.shortMessage === "string" ?
          value.cause.shortMessage
        : undefined,
    },
  };
};

export function useAppSwitchNetwork() {
  const { connector } = useAccount();
  const { chain } = useNetwork();
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

    toast.info(`Reconnect WalletConnect to approve ${targetChainName}.`, {
      toastId: `walletconnect-reconnect-${chainId}`,
    });
  }, []);

  const trySwitchNetworkAsync = useCallback(
    async (
      chainId?: number,
      options: { showReconnectToast?: boolean } = {},
    ) => {
      const showReconnectToast = options.showReconnectToast ?? true;

      console.info("[walletconnect-debug] switchNetwork requested", {
        connector: {
          id: connector?.id,
          name: connector?.name,
          ready: connector?.ready,
        },
        currentChain:
          chain ?
            {
              id: chain.id,
              name: chain.name,
              unsupported: chain.unsupported,
            }
          : undefined,
        targetChainId: chainId,
        isWalletConnect,
        hasSwitchNetwork: switchNetworkResult.switchNetwork != null,
        hasSwitchNetworkAsync: switchNetworkResult.switchNetworkAsync != null,
      });

      if (chainId == null || !switchNetworkResult.switchNetworkAsync) {
        console.info("[walletconnect-debug] switchNetwork unavailable", {
          targetChainId: chainId,
          hasSwitchNetworkAsync: switchNetworkResult.switchNetworkAsync != null,
        });
        if (showReconnectToast) {
          showWalletConnectReconnectToast(chainId);
        }
        return undefined;
      }

      try {
        const result = await switchNetworkResult.switchNetworkAsync(chainId);
        console.info("[walletconnect-debug] switchNetwork resolved", {
          targetChainId: chainId,
          result:
            result ?
              {
                id: result.id,
                name: result.name,
              }
            : undefined,
        });
        return result;
      } catch (error) {
        console.info("[walletconnect-debug] switchNetwork failed", {
          targetChainId: chainId,
          error: getWalletConnectDebugError(error),
        });
        if (showReconnectToast) {
          showWalletConnectReconnectToast(chainId);
        }
        return undefined;
      }
    },
    [
      chain,
      connector?.id,
      connector?.name,
      connector?.ready,
      isWalletConnect,
      showWalletConnectReconnectToast,
      switchNetworkResult,
    ],
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
    async (chainId?: number, options?: { showReconnectToast?: boolean }) => {
      if (isWalletConnect) {
        return trySwitchNetworkAsync(chainId, options);
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

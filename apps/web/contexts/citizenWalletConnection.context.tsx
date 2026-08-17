"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAccount } from "wagmi";
import { isCitizenWalletConnectConnector } from "@/utils/citizenWallet";

type CitizenWalletConnectionContextValue = {
  isCitizenWalletConnect: boolean;
  startCitizenWalletConnect: () => void;
};

const CitizenWalletConnectionContext =
  createContext<CitizenWalletConnectionContextValue | null>(null);

export function CitizenWalletConnectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { connector, isConnected } = useAccount();
  const [isCitizenWalletConnect, setIsCitizenWalletConnect] = useState(false);
  const wasConnected = useRef(false);

  const startCitizenWalletConnect = useCallback(() => {
    setIsCitizenWalletConnect(true);
  }, []);

  useEffect(() => {
    if (isConnected && !isCitizenWalletConnectConnector(connector?.id)) {
      setIsCitizenWalletConnect(false);
    } else if (wasConnected.current && !isConnected) {
      setIsCitizenWalletConnect(false);
    }
    wasConnected.current = isConnected;
  }, [connector?.id, isConnected]);

  const value = useMemo(
    () => ({ isCitizenWalletConnect, startCitizenWalletConnect }),
    [isCitizenWalletConnect, startCitizenWalletConnect],
  );

  return (
    <CitizenWalletConnectionContext.Provider value={value}>
      {children}
    </CitizenWalletConnectionContext.Provider>
  );
}

export function useCitizenWalletConnection() {
  const context = useContext(CitizenWalletConnectionContext);
  if (!context) {
    throw new Error(
      "useCitizenWalletConnection must be used inside CitizenWalletConnectionProvider.",
    );
  }
  return context;
}

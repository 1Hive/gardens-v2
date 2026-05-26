export const isWalletConnectConnection = (connectorId?: string) =>
  connectorId === "walletConnect";

export const isWrongNetworkForConnection = (
  connectedChainId?: number,
  expectedChainId?: number,
  connectorId?: string,
) =>
  !isWalletConnectConnection(connectorId) &&
  connectedChainId !== expectedChainId;

import { useAccount, useNetwork } from "wagmi";
import { mainnet } from "wagmi/chains";

export function useCanResolveEns() {
  const { isConnected } = useAccount();
  const { chain } = useNetwork();

  return isConnected && chain?.id === mainnet.id;
}

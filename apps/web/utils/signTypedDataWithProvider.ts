import {
  Address,
  getTypesForEIP712Domain,
  Hex,
  isHex,
  TypedDataDomain,
} from "viem";
import { resolveSigningProvider } from "./signMessageWithProvider";

type WalletConnector = {
  getProvider: () => Promise<unknown>;
};

export type Eip712TypedData = {
  domain: TypedDataDomain;
  message: Record<string, unknown>;
  primaryType: string;
  types: Record<string, readonly { name: string; type: string }[]>;
};

export const signTypedDataWithProvider = async ({
  account,
  connector,
  typedData,
}: {
  account: Address;
  connector: WalletConnector;
  typedData: Eip712TypedData;
}): Promise<Hex> => {
  const provider = resolveSigningProvider(await connector.getProvider());
  const payload = JSON.stringify({
    ...typedData,
    domain: typedData.domain ?? {},
    types: {
      EIP712Domain: getTypesForEIP712Domain({
        domain: typedData.domain,
      }),
      ...typedData.types,
    },
  });
  const signature = await provider.request({
    method: "eth_signTypedData_v4",
    params: [account, payload],
  });

  if (typeof signature !== "string" || !isHex(signature)) {
    throw new Error("The council Safe returned an invalid signature.");
  }

  return signature;
};

import { TransactionReceipt } from "viem";

// TODO: Might be improved by extracting the event definitions from ABI and compute the hash with keccak256
export const TOPICS = {
  RegistryFactory: {
    RegistryInitialized: "0x2f2ffcb06f8a1d35e2716f6b43ef2c19bfa76467d8f66964ae12c2583ed03205",
  },
  RegistryCommunity: {
    PoolCreated: "0x69bcb5a6cf6a3c95185cbb451e77787240c866dd2e8332597e3013ff18a1aba1",
  },
} as const;

export const getEventFromReceipt = <TContractName extends keyof typeof TOPICS, TEventName extends keyof typeof TOPICS[TContractName]>
  (receipt: TransactionReceipt, contractName: TContractName, eventName: TEventName) => {
  const topicHash = TOPICS[contractName][eventName];
  const topic = receipt.logs.find(l => topicHash === l.topics[0]);
  if (!topic) {
    throw new Error(`Event not found in receipt with topic hash ${topic}`);
  }

  return topic;
};
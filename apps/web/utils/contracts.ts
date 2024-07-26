import type {
  AbiEvent,
  ExtractAbiEvent,
  ExtractAbiEventNames,
  AbiParameter,
  AbiParameterToPrimitiveType,
} from "abitype";
import { TransactionReceipt, decodeEventLog, getEventSelector } from "viem";
import {
  cvStrategyABI,
  registryCommunityABI,
  registryFactoryABI,
} from "@/src/generated";

export const ContractABIs = {
  CVStrategy: cvStrategyABI,
  RegistryCommunity: registryCommunityABI,
  RegistryFactory: registryFactoryABI,
};

export type ContractName = keyof typeof ContractABIs;

export type ContractAbi<TContractName extends ContractName = ContractName> =
  (typeof ContractABIs)[TContractName];

type EventArgTypes<TAbiEvent extends AbiEvent> = {
  [Input in TAbiEvent["inputs"][number] as Input extends AbiParameter ?
    NonNullable<Input["name"]>
  : unknown]: Input extends AbiParameter ? AbiParameterToPrimitiveType<Input>
  : unknown;
};

export const getEventFromReceipt = <
  TContractName extends keyof typeof ContractABIs,
  TEventName extends ExtractAbiEventNames<ContractAbi<TContractName>>,
>(
  receipt: TransactionReceipt,
  contractName: TContractName,
  eventName: TEventName,
) => {
  const eventAbi = ContractABIs[contractName].find(
    (abi) => abi.type === "event" && abi.name === eventName,
  ) as ExtractAbiEvent<ContractAbi<TContractName>, TEventName>;

  const hash = getEventSelector(eventAbi);

  const event = receipt.logs.find((log) => log.topics[0] === hash);

  if (!event) {
    throw new Error(
      `Event not found in receipt with topic hash: ${hash} and abi: ${JSON.stringify(eventAbi)}`,
    );
  }

  const parsed = decodeEventLog({
    abi: ContractABIs[contractName],
    data: event.data,
    topics: event.topics,
  });

  return {
    ...event,
    eventAbi,
    args: parsed.args as EventArgTypes<typeof eventAbi>,
  };
};

import type {
  AbiEvent,
  ExtractAbiEvent,
  ExtractAbiEventNames,
  AbiParameter,
  AbiParameterToPrimitiveType,
} from "abitype";
import { TransactionReceipt, decodeEventLog, getEventSelector } from "viem";
import { superTokenFactoryAbi } from "@/src/customAbis";
import {
  alloABI,
  cvStrategyABI,
  passportScorerABI,
  registryCommunityABI,
  registryFactoryABI,
  safeArbitratorABI,
} from "@/src/generated";

export const ContractABIs = {
  CVStrategy: cvStrategyABI,
  RegistryCommunity: registryCommunityABI,
  RegistryFactory: registryFactoryABI,
  Allo: alloABI,
  PassportScorer: passportScorerABI,
  SafeArbitrator: safeArbitratorABI,
  SuperTokenFactory: superTokenFactoryAbi,
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
  const eventAbis = ContractABIs[contractName].filter(
    (abi): abi is ExtractAbiEvent<ContractAbi<TContractName>, TEventName> =>
      abi.type === "event" && abi.name === eventName,
  );

  let matchedEventAbi:
    | ExtractAbiEvent<ContractAbi<TContractName>, TEventName>
    | undefined;
  let event = undefined;
  for (const candidate of eventAbis) {
    const hash = getEventSelector(candidate);
    const found = receipt.logs.find((log) => log.topics[0] === hash);
    if (found != null) {
      matchedEventAbi = candidate;
      event = found;
      break;
    }
  }

  if (event == null || matchedEventAbi == null) {
    throw new Error(
      `Event not found in receipt for name ${String(eventName)}. Checked ${eventAbis.length} ABI variants.`,
    );
  }

  const parsed = decodeEventLog({
    abi: ContractABIs[contractName],
    data: event.data,
    topics: event.topics,
  });

  return {
    ...event,
    eventAbi: matchedEventAbi,
    args: parsed.args as EventArgTypes<typeof matchedEventAbi>,
  };
};

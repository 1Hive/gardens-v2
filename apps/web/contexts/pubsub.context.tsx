import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Realtime } from "ably";
import { uniqueId } from "lodash-es";
import { CHANGE_EVENT_CHANNEL_NAME } from "@/globals";
import { useChainIdFromPath } from "@/hooks/useChainIdFromPath";
import { ChainId } from "@/types";

// Define the shape of your context data
interface PubSubContextData {
  connected: boolean;
  /**
   * Subscribes to a channel, optionally filtering messages based on a flexible criteria.
   *
   * @param {Array|Object} filter - The filtering criteria.
   *   - If an array, each element is treated as an OR condition.
   *   - If an object, it represents an AND condition on message fields.
   *   - Nested arrays within the object act as OR conditions for the specific field.
   * @param {ChangeEventPayload} callback - The function to call when a matching message is received.
   *
   * @example
   * // Subscribe to messages with specific events or matching a pattern:
   * channel.subscribe(["event1", "event2", "pattern.*"], callback);
   *
   * @example
   * // Subscribe to messages where all specified fields match:
   * channel.subscribe({ field1: "value1", field2: "value2" }, callback);
   *
   * @example
   * // Subscribe to messages where a field contains any of the specified values:
   * channel.subscribe({ field1: ["value1", "value2", "value3"] }, callback);
   *
   * @example
   * // Combine multiple filtering layers:
   * channel.subscribe(
   *   [
   *     { field1: "value1", field2: ["value2", "value3"] },
   *     { field3: "value4" }
   *   ],
   *   callback
   * );
   */
  subscribe: (
    scope: ChangeEventScope[] | ChangeEventScope,
    onChangeEvent: (payload: ChangeEventPayload) => void,
  ) => string;
  unsubscribe: (subscriptionId: string) => void;
  publish: (payload: ChangeEventPayload) => void;
  messages: ChangeEventPayload[];
}

export type SubscriptionId = string;

export type ChangeEventTopic =
  | "community"
  | "garden"
  | "pool"
  | "proposal"
  | "member"
  | "stream";

type Native = string | number | boolean | null | undefined;

export type ChangeEventScope = {
  topic: ChangeEventTopic;
  type?: ChangeEventPayload["type"] | ChangeEventPayload["type"][];
  containerId?:
    | ChangeEventPayload["containerId"]
    | ChangeEventPayload["containerId"][];
  function?: ChangeEventPayload["function"] | ChangeEventPayload["function"][];
  chainId?: ChangeEventPayload["chainId"] | ChangeEventPayload["chainId"][];
  id?: ChangeEventPayload["id"] | ChangeEventPayload["id"][];
} & { [key: string]: Native | Native[] };

export type ChangeEventPayload = {
  topic: ChangeEventTopic;
  type?: "add" | "update" | "delete";
  function?: string;
  chainId?: ChainId;
  containerId?: string | number;
  id?: string | number;
} & { [key: string]: Native };

// Create the context with an initial default value (optional)
const PubSubContext = createContext<PubSubContextData | undefined>(undefined);

// Helper hook for consuming the context
export function usePubSubContext() {
  const context = useContext(PubSubContext);
  if (!context) {
    throw new Error(
      "⚡ WS: usePubSubContext must be used within a WebSocketProvider",
    );
  }
  return context;
}

export function PubSubProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChangeEventPayload[]>([]);
  const [connected, setConnected] = useState(false);
  const chainId = useChainIdFromPath();

  const ablyClient = useMemo(
    () =>
      new Realtime({
        authUrl: "/api/ably-auth",
        queryTime: true,
        authMethod: "POST",
      }),
    [],
  );

  const subscriptionsMap = useRef(
    new Map<
      SubscriptionId,
      {
        scopes: ChangeEventScope[];
        onChangeEvent: (payload: ChangeEventPayload) => void;
      }
    >(),
  );

  useEffect(() => {
    ablyClient.channels.get(CHANGE_EVENT_CHANNEL_NAME).subscribe((message) => {
      console.debug("⚡ WS: sub message", {
        message,
        reDispatch: () => {
          dispatch(message.data as ChangeEventPayload);
        },
      });
      const data = message.data as ChangeEventPayload;
      setMessages((prevMessages) => [...prevMessages, data]);
      dispatch(data);
    });

    return () => {
      ablyClient.channels.get(CHANGE_EVENT_CHANNEL_NAME).unsubscribe();
    };
  }, []);

  const subMap = subscriptionsMap.current;

  useEffect(() => {
    ablyClient.connection.on("connected", () => {
      console.debug("⚡ WS: connected");
      setConnected(true);
    });

    ablyClient.connection.on("disconnected", (ev) => {
      console.debug("⚡ WS: disconnected", ev);
      setConnected(false);
      const normalCloseReason = 10000;
      if (ev.reason?.code !== normalCloseReason) {
        console.debug("⚡ WS: lost connection, reconnecting...", {
          reason: ev.reason,
        });
      }
    });
  }, []);

  const dispatch = (pubPayload: ChangeEventPayload) => {
    subMap.forEach(({ scopes, onChangeEvent }) => {
      if (
        scopes.find((scopeObj) => {
          return Object.keys(scopeObj).every((key) => {
            if (!Array.isArray(scopeObj[key])) {
              scopeObj[key] = [scopeObj[key] as Native];
            }

            return (scopeObj[key] as Native[]).find((scopeItem) => {
              return (
                pubPayload[key] === undefined ||
                scopeItem?.toString().toLowerCase() ===
                  pubPayload[key]?.toString().toLowerCase()
              );
            });
          });
        })
      ) {
        onChangeEvent(pubPayload);
      }
    });
  };

  const subscribe = useCallback(
    (
      scope: ChangeEventScope[] | ChangeEventScope,
      onChangeEvent: (payload: ChangeEventPayload) => void,
    ) => {
      const subscriptionId = uniqueId();
      console.debug(`⚡ WS: subscribe ${subscriptionId}`, scope);
      subMap.set(subscriptionId, {
        scopes: (Array.isArray(scope) ? scope : [scope]) as ChangeEventScope[],
        onChangeEvent,
      });
      return subscriptionId;
    },
    [],
  );

  const unsubscribe = (subscriptionId: SubscriptionId) => {
    console.debug(
      `⚡ WS: unsubscribe ${subscriptionId}`,
      subMap.get(subscriptionId)?.scopes,
    );
    subMap.delete(subscriptionId);
  };

  const publish = (payload: ChangeEventScope) => {
    payload = {
      ...payload,
      chainId: +(payload.chainId ?? chainId ?? "NaN"),
    };
    console.debug("⚡ WS: publish", payload);
    ablyClient.channels
      .get(CHANGE_EVENT_CHANNEL_NAME)
      .publish(payload.topic, payload);
  };

  return (
    <PubSubContext.Provider
      value={{ connected, subscribe, unsubscribe, publish, messages }}
    >
      {children}
    </PubSubContext.Provider>
  );
}

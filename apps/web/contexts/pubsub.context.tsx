import { uniqueId } from "lodash-es";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Realtime } from "ably";
import { ChainId } from "@/types";

// Define the shape of your context data
interface PubSubContextData {
  connected: boolean;
  subscribe: (
    scope: ChangeEventScope[] | ChangeEventScope,
    onChangeEvent: (payload: ChangeEventScope) => void,
  ) => string;
  unsubscribe: (subscriptionId: string) => void;
  publish: (payload: ChangeEventScope) => void;
  messages: ChangeEventScope[];
}

export type SubscriptionId = string;

export type ChangeEventTopic = "community" | "garden" | "pool" | "proposal";
export type ChangeEventScope = {
  topic: ChangeEventTopic;
  chainId?: ChainId;
  id?: string;
  type?: string;
} & { [key: string]: string | number | boolean };

// Create the context with an initial default value (optional)
const PubSubContext = createContext<PubSubContextData | undefined>(undefined);

const CHANGE_EVENT_CHANNEL_NAME = "change-events";

// Helper hook for consuming the context
export function usePubSubContext() {
  const context = useContext(PubSubContext);
  if (!context) {
    throw new Error("usePubSubContext must be used within a WebSocketProvider");
  }
  return context;
}

export function PubSubProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChangeEventScope[]>([]);
  const [connected, setConnected] = useState(false);
  const ablyClientRef = useRef(
    new Realtime({ key: process.env.NEXT_PUBLIC_ABLY_KEY }),
  );
  const ablyClient = ablyClientRef.current;

  const subscriptionsMap = useRef(
    new Map<
      SubscriptionId,
      {
        scopes: ChangeEventScope[];
        onChangeEvent: (payload: ChangeEventScope) => void;
      }
    >(),
  );

  useEffect(() => {
    ablyClient.channels.get(CHANGE_EVENT_CHANNEL_NAME).subscribe((message) => {
      console.debug("⚡ WS: sub message", message);
      const data = message.data as ChangeEventScope;
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

  const dispatch = (pubPayload: ChangeEventScope) => {
    subMap.forEach(({ scopes, onChangeEvent }) => {
      if (
        scopes.find((scope) =>
          Object.keys(scope).every(
            (key) =>
              scope[key].toString().toUpperCase() ===
              pubPayload[key].toString().toUpperCase(),
          ),
        )
      ) {
        onChangeEvent(pubPayload);
      }
    });
  };

  const subscribe = useCallback(
    (
      scope: ChangeEventScope[] | ChangeEventScope,
      onChangeEvent: (payload: ChangeEventScope) => void,
    ) => {
      const subscriptionId = uniqueId();
      subMap.set(subscriptionId, { scopes: (scope.length ? scope : [scope]) as ChangeEventScope[], onChangeEvent });
      return subscriptionId;
    },
    [],
  );

  const unsubscribe = (subscriptionId: SubscriptionId) => {
    subMap.delete(subscriptionId);
  };

  const publish = (payload: ChangeEventScope) => {
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

import {
  ChangeEventTopic,
  ChangeEventPayload,
  SubMessage,
  PubMessage,
} from "@/pages/api/websocket.api";
import { uniqueId } from "lodash-es";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useDebouncedCallback } from "use-debounce";

// Define the shape of your context data
interface WebSocketContextData {
  connected: boolean;
  subscribe: (
    topics: ChangeEventTopic[],
    onChangeEvent: (payload: ChangeEventPayload) => void,
  ) => string;
  unsubscribe: (subscriptionId: string) => void;
  publish: (payload: ChangeEventPayload) => void;
  messages: ChangeEventPayload[];
}

export type SubscriptionId = string;

// Create the context with an initial default value (optional)
const WebSocketContext = createContext<WebSocketContextData | undefined>(
  undefined,
);

// Helper hook for consuming the context
export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error(
      "useWebSocketContext must be used within a WebSocketProvider",
    );
  }
  return context;
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChangeEventPayload[]>([]);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const subscriptionsMap = useRef(
    new Map<
      SubscriptionId,
      [ChangeEventTopic[], (payload: ChangeEventPayload) => void]
    >(),
  );
  const [socketSubscribedTopics, setSocketSubscribedTopics] = useState<
    ChangeEventTopic[]
  >([]);

  const subMap = subscriptionsMap.current;

  useEffect(() => {
    const initWebSocket = async () => {
      const resp = await fetch("/api/websocket");
      const { wsPath } = await resp.json();
      // Initialize WebSocket connection
      socketRef.current = new WebSocket(wsPath); // Update with your WebSocket URL

      socketRef.current.onopen = () => {
        console.log("🗞 WS: connected");
        setConnected(true);
      };

      socketRef.current.onclose = (ev) => {
        console.log("🗞 WS: disconnected");
        setConnected(false);
        const wsCloseNormalReason = "1000";
        if (ev.reason === wsCloseNormalReason) {
          console.log("🗞 WS: lost connection, reconnecting...", {
            reason: ev.reason,
          });
          setTimeout(() => {
            initWebSocket();
          }, 1000);
        }
      };

      socketRef.current.onerror = (error) => {
        console.error("🗞 WS: error", { error });
      };

      socketRef.current.onmessage = (message) => {
        const data = JSON.parse(message.data) as
          | ChangeEventPayload
          | { log: string };
        if ("log" in data) {
          console.log("🗞 WS: received message: " + message.data);
        } else {
          console.log("🗞 WS: change event", { payload: data });
          setMessages((prev) => [...prev, data]);
          dispatch(data);
        }
      };
    };

    if (!socketRef.current) {
      initWebSocket();
    }

    return () => {
      socketRef.current?.close();
    };
  }, []);

  const computeSocketSubscription = useDebouncedCallback(() => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }

    let topics: ChangeEventTopic[] = [];
    subMap.forEach(([topicSubs]) => {
      topicSubs.forEach((topic) => {
        topics.push(topic);
      });
    });

    topics = Array.from(new Set(topics)); // Dedupe topics

    if (JSON.stringify(topics) === JSON.stringify(socketSubscribedTopics)) {
      return; // No change
    }

    setSocketSubscribedTopics(topics);

    socketRef.current?.send(
      JSON.stringify({ type: "sub", topics } as SubMessage),
    );
  }, 200);

  const dispatch = (payload: ChangeEventPayload) => {
    subMap.forEach(([topics, onChangeEvent]) => {
      if (topics.includes(payload.topic)) {
        onChangeEvent(payload);
      }
    });
  };

  const subscribe = useCallback(
    (
      topics: ChangeEventTopic[],
      onChangeEvent: (payload: ChangeEventPayload) => void,
    ) => {
      const subscriptionId = uniqueId();
      subMap.set(subscriptionId, [topics, onChangeEvent]);
      computeSocketSubscription();
      return subscriptionId;
    },
    [],
  );

  const unsubscribe = (subscriptionId: SubscriptionId) => {
    subMap.delete(subscriptionId);
    computeSocketSubscription();
  };

  const publish = (payload: ChangeEventPayload) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({ type: "pub", payload } as PubMessage),
      );
    }
  };

  return (
    <WebSocketContext.Provider
      value={{ connected, subscribe, unsubscribe, publish, messages }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

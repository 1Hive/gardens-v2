import {
  ChangeEventTopic,
  ChangeEventPayload,
  SubMessage,
  PubMessage,
} from "@/pages/api/pubsub";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDebounce, useDebouncedCallback } from "use-debounce";

export default function useTopicChangeSubscription(
  topics?: ChangeEventTopic[],
) {
  const [connected, setConnected] = useState(false);
  const [newChangeEvent, setNewChangeEvent] =
    useState<ChangeEventPayload | null>();
  const socketRef = useRef<WebSocket | null>(null);

  const initDebounced = useDebouncedCallback(
    async (_topics: ChangeEventTopic[]) => {
      const resp = await fetch("/api/pubsub"); // Ensure the WebSocket server is started
      if (resp.ok) {
        const body = await resp.json();
        const _ws = new WebSocket(body.wsPath);

        _ws.onopen = () => {
          setConnected(true);
          console.log("Connected to WebSocket server");
          // Subscribe to topics
          _ws.send(
            JSON.stringify({
              type: "sub",
              topics: topics ?? [],
            } as SubMessage),
          );
        };

        _ws.onmessage = (event) => {
          if (typeof event.data === "string") {
            console.log("WS: received message:", event.data);
            return;
          }
          const message: ChangeEventPayload = JSON.parse(event.data);
          console.log("Received message:", message);
          setNewChangeEvent(message);
        };

        _ws.onclose = () => {
          console.log("Disconnected from WebSocket server");
        };

        socketRef.current = _ws;
      }
    },
    200,
  );

  useEffect(() => {
    // if (!topics?.length) return;
    initDebounced(topics ?? []);

    return () => {
      socketRef.current?.close();
    };
  }, [topics]);

  function publish(payload: ChangeEventPayload) {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify({ type: "pub", payload } as PubMessage));
  }

  return { connected, publish, newChangeEvent };
}

import { ChangeTopic } from "@/utils/pubsub";
import { useEffect, useState } from "react";

export type ChangeContext = {
  type: "add" | "delete" | "update";
  id?: string;
  context: any;
  topic: ChangeTopic;
};

export default function useTopicChangeSubscription(topics?: ChangeTopic[]) {
  const [newEvent, setNewMessage] = useState<ChangeContext | null>();

  useEffect(() => {
    if (!topics?.length) return;

    const queryString = new URLSearchParams();

    topics.forEach((id) => {
      queryString.append("topics", id);
    });

    const eventSource = new EventSource(
      `/api/subscribe?${queryString.toString()}`,
    );

    eventSource.onmessage = (event) => {
      setNewMessage(event.data);
    };

    eventSource.onerror = (error) => {
      console.error("EventSource error:", error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [topics]);

  const handlePublish = async (context: ChangeContext) => {
    await fetch("/api/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ context }),
    });
  };

  return { newEvent, emit: handlePublish };
}

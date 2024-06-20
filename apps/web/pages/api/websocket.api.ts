import { NextApiRequest, NextApiResponse } from "next";
import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { ChainId } from "@/types";

type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: HttpServer & {
      wss?: WebSocketServer;
    };
  };
};
export const WEB_SOCKET_PORT = 3001;

export type ChangeEventTopic = "community" | "garden" | "token" | "user";
export type ChangeEventPayload = {
  topic: ChangeEventTopic;
  type?: "add" | "delete" | "update";
  id?: string;
  chainId?: ChainId;
  data?: any;
};

export type PubMessage = {
  type: "pub";
  payload: ChangeEventPayload;
};

export type SubMessage = {
  type: "sub";
  topics: ChangeEventTopic[];
};

const subscribers: Map<WebSocket, ChangeEventTopic[]> = new Map();
let wss: WebSocketServer | null = null;

const handler = async (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  const subscribe = (topics: ChangeEventTopic[], ws: WebSocket) => {
    ws.send(JSON.stringify({ log: `subscribed to ${topics.join(", ")}` }));
    subscribers.set(ws, topics);
  };

  const publish = (payload: ChangeEventPayload, publisherWs: WebSocket) => {
    let counter = 0;
    for (const [ws, topics] of subscribers.entries()) {
      if (topics.includes(payload.topic)) {
        counter++;
        // Delay the message in order to let the time for subgraph to index the data
        setTimeout(() => {
          ws.send(JSON.stringify(payload));
        }, 200);
      }
    }

    publisherWs.send(
      JSON.stringify({ log: `published to ${counter} subscribers` }),
    );
  };

  if (process.env.NODE_ENV === "development" && req.query.kill === "true") {
    // Restart the WebSocket server
    if (wss) {
      console.log("Stopping WebSocket server...");
      wss.close();
    }

    res.send(`killed`);
  } else {
    // Start the WebSocket server
    if (!wss) {
      console.log("Starting WebSocket server...");
      wss = new WebSocketServer({
        port: WEB_SOCKET_PORT,
      });

      // res.socket.server.on("upgrade", (req, socket, head) => {
      //   if (!req.url!.includes("/_next/webpack-hmr")) {
      //     wss!.handleUpgrade(req, socket, head, (ws) => {
      //       wss!.emit("connection", ws, req);
      //     });
      //   }
      // });

      wss.on("connection", (ws: WebSocket) => {
        ws.on("message", (message: string) => {
          const parsed = JSON.parse(message) as PubMessage | SubMessage;
          if (parsed.type === "sub") {
            // Subscribe to topics
            subscribe(parsed.topics, ws);
          } else if (parsed.type === "pub") {
            // Publish to topics
            publish(parsed.payload, ws);
          }
        });
      });

      res.socket.server.wss = wss;
    }
    res.send({ wsPath: `ws://localhost:${WEB_SOCKET_PORT}/` });
  }

  res.end();
};

export default handler;

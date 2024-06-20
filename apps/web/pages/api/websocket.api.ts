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

export type ChangeEventTopic = "community" | "garden" | "pool" | "proposal";
export type ChangeEventScope = {
  topic: ChangeEventTopic;
  chainId: ChainId;
  id?: string;
  type?: string;
} & { [key: string]: string | number | boolean };

export type PubMessage = {
  type: "pub";
  scope: ChangeEventScope;
};

export type SubMessage = {
  type: "sub";
  scopes: ChangeEventScope[];
};

const subscribers: Map<WebSocket, SubMessage["scopes"]> = new Map();
let wss: WebSocketServer | null = null;

const WAITING_TIME_BEFORE_DIPATCH = 2000;

const handler = async (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  const subscribe = (scopes: SubMessage["scopes"], ws: WebSocket) => {
    // Ensure array and not object with index as key
    scopes = Object.values(scopes)
      .filter((x) => typeof x === "object")
      .map((key) => key as ChangeEventScope);
    ws.send(
      JSON.stringify({
        log: `subscribed to [${scopes.map((x) => x.topic).join(", ")}]`,
      }),
    );
    subscribers.set(ws, scopes);
  };

  const publish = (pubScope: ChangeEventScope, publisherWs: WebSocket) => {
    let counter = 0;
    for (const [ws, subScopes] of subscribers.entries()) {
      // And filtering based on each scope fields (topics, chainId, id, type, etc.)
      if (
        Object.values(subScopes).find((scope) =>
          Object.keys(scope).every(
            (key) =>
              scope[key].toString().toUpperCase() ===
              pubScope[key].toString().toUpperCase(),
          ),
        )
      ) {
        counter++;
        // Delay the message in order to let the time for subgraph to index the data
        setTimeout(() => {
          ws.send(JSON.stringify(pubScope));
        }, WAITING_TIME_BEFORE_DIPATCH);
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
            subscribe(parsed.scopes, ws);
          } else if (parsed.type === "pub") {
            // Publish to topics
            publish(parsed.scope, ws);
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

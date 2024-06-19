// import { Server as HttpServer } from "http";
// import { WebSocketServer, WebSocket } from "ws";
// import { ChainId } from "@/types";
// import { NextRequest, NextResponse } from "next/server";

// type ChangeEventTopic = "community" | "garden" | "token" | "user";
// type ChangeEventPayload = {
//   type: "add" | "delete" | "update";
//   id?: string;
//   chainId?: ChainId;
//   context: any;
//   topic: ChangeEventTopic;
// };

// type PubMessage = {
//   type: "pub";
//   context: ChangeEventPayload;
// };

// type SubMessage = {
//   type: "sub";
//   topics: ChangeEventTopic[];
// };

// const subscribers: { [key: string]: Set<WebSocket> } = {};

// export const WEB_SOCKET_PORT = 45969;

// export default async function websocket() {
//   const { NextRequest, NextResponse } = require("@vercel/node");

//   const subscribe = (topics: ChangeEventTopic[], ws: WebSocket) => {
//     topics.forEach((topic) => {
//       if (!subscribers[topic]) {
//         subscribers[topic] = new Set();
//       }
//       subscribers[topic].add(ws);
//     });
//   };

//   const publish = (context: ChangeEventPayload) => {
//     if (!subscribers[context.topic]) return;

//     subscribers[context.topic].forEach((ws) => {
//       if (ws.readyState !== ws.OPEN) {
//         // remove it from subscribers
//         try {
//           subscribers[context.topic].delete(ws);
//         } catch (error) {
//           console.warn("Error removing subscriber", error);
//         }
//       }

//       // Delay the message in order to let the time for subgraph to index the data
//       setTimeout(() => {
//         ws.send(JSON.stringify(context));
//       }, 2000);
//     });
//   };

//   const { socket: server } = await NextRequest.onServerInit();

//   if (!server.wss) {
//     console.log("Starting WebSocket server...");
//     const wss = new WebSocketServer({ server, port: WEB_SOCKET_PORT });

//     wss.on("connection", (ws: WebSocket) => {
//       console.log("Client connected");

//       ws.on("message", (message: string) => {
//         const parsed = JSON.parse(message) as PubMessage | SubMessage;
//         if (parsed.type === "sub") {
//           // Subscribe to topics
//           subscribe(parsed.topics, ws);
//         } else if (parsed.type === "pub") {
//           // Publish to topics
//           publish(parsed.context);
//         }
//       });

//       ws.on("close", () => {
//         console.log("Client disconnected");
//       });
//     });

//     server.wss = wss;
//   }
//   console.log(server.wss);
//   await NextResponse.send(
//     { wsPath: `ws://localhost:${WEB_SOCKET_PORT}/` },
//     { status: 200 },
//   );
// }

import "./bootstrap/dns";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: env.clientOrigin,
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket.on("join_conversation", (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
  });
});

httpServer.listen(env.port, () => {
  console.log(`RoofStead API listening on http://localhost:${env.port}`);
});

export { io };

import type { Server as SocketIOServer } from "socket.io";
import { verifyUserAccessToken } from "../auth/tokens";
import { findUserById } from "../airtable/repositories";
import { setSocketIO } from "./io";

export function setupMessagesSocket(io: SocketIOServer) {
  setSocketIO(io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== "string" || !token) {
        next(new Error("Authentication required"));
        return;
      }
      const payload = verifyUserAccessToken(token);
      const user = await findUserById(payload.sub);
      if (!user || user.is_deleted || !user.is_active) {
        next(new Error("Invalid session"));
        return;
      }
      socket.data.userId = user.id;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);

    socket.on("join_conversation", (conversationId: unknown) => {
      if (typeof conversationId === "string" && conversationId.trim()) {
        socket.join(`conversation:${conversationId}`);
      }
    });
  });
}

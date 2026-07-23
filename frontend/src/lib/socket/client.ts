import { io, Socket } from "socket.io-client";
import { API_URL } from "@/lib/api/client";

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (!socket) {
    socket = io(API_URL, {
      auth: { token },
      autoConnect: false,
    });
  }
  return socket;
}

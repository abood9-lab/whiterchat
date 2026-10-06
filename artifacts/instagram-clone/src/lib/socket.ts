import { io, Socket } from "socket.io-client";
import { getApiBaseUrl } from "./api-url";

let socket: Socket | null = null;

export const getSocket = () => socket;

export const initSocket = (token: string) => {
  if (!socket) {
    const base = getApiBaseUrl();
    const serverUrl = base || (typeof window !== "undefined" ? window.location.origin : "");
    socket = io(serverUrl, {
      path: "/api/socket.io",
      auth: { token },
      transports: ["polling", "websocket"],
      reconnectionAttempts: 5,
      timeout: 10000,
    });


    socket.on("connect_error", (err) => {
      // Benign connection error in preview environments
      console.debug("[Socket] Connection note:", err?.message);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

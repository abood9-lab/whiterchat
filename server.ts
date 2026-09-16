import express from "express";
import { createServer } from "http";
import path from "path";
import { Server as SocketIOServer } from "socket.io";
import { createServer as createViteServer } from "vite";
import app from "./artifacts/api-server/src/app";
import { logger } from "./artifacts/api-server/src/lib/logger";
import { verifyToken } from "./artifacts/api-server/src/lib/auth";
import { connectDB } from "./lib/db/src/index";

const PORT = 3000;

async function startServer() {
  const httpServer = createServer(app);

  const socketAllowedOrigins: (string | RegExp)[] = [
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
    /\.run\.app$/,
    /\.aistudio\.google\.com$/,
    /\.googleusercontent\.com$/,
  ];
  if (process.env.REPLIT_DOMAINS) {
    process.env.REPLIT_DOMAINS.split(",").forEach((d) =>
      socketAllowedOrigins.push(`https://${d.trim()}`)
    );
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    socketAllowedOrigins.push(`https://${process.env.REPLIT_DEV_DOMAIN.trim()}`);
  }
  if (process.env.FRONTEND_ORIGINS) {
    process.env.FRONTEND_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter(Boolean)
      .forEach((o) => socketAllowedOrigins.push(o));
  }
  socketAllowedOrigins.push(/^https:\/\/([a-z0-9-]+\.)*pages\.dev$/);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        const ok = socketAllowedOrigins.some((o) =>
          typeof o === "string" ? o === origin : o.test(origin)
        );
        cb(ok ? null : new Error("Socket CORS: origin not allowed"), ok);
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/api/socket.io",
  });

  app.set("io", io);

  const onlineUsers = new Map<string, { socketId: string; connectedAt: number }>();

  io.on("connection", (socket) => {
    const token = socket.handshake.auth?.token as string | undefined;
    let userId: string | undefined;

    if (token && typeof token === "string" && token.trim() && token !== "null" && token !== "undefined") {
      try {
        const payload = verifyToken(token);
        userId = payload.userId;
        socket.join(`user:${userId}`);
        onlineUsers.set(userId, { socketId: socket.id, connectedAt: Date.now() });
        io.emit("user_online", { userId });
        logger.info({ userId }, "Socket authenticated");
      } catch {
        logger.debug({ socketId: socket.id }, "Socket auth token expired or invalid");
      }
    }

    function resolveConvId(data: string | { conversationId: string }): string {
      return typeof data === "string" ? data : data.conversationId;
    }

    socket.on("join_conversation", (data: string | { conversationId: string }) => {
      if (!userId) { socket.emit("error", { message: "Unauthorized" }); return; }
      socket.join(`conversation:${resolveConvId(data)}`);
    });

    socket.on("leave_conversation", (data: string | { conversationId: string }) => {
      if (!userId) return;
      socket.leave(`conversation:${resolveConvId(data)}`);
    });

    socket.on("typing", (data: { conversationId: string; isVoice?: boolean }) => {
      socket.to(`conversation:${data.conversationId}`).emit("typing", {
        userId,
        conversationId: data.conversationId,
        isVoice: data.isVoice ?? false,
      });
    });

    socket.on("stop_typing", (data: { conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit("stop_typing", {
        userId,
        conversationId: data.conversationId,
      });
    });

    socket.on("mark_read", (data: { conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit("message_read", {
        userId,
        conversationId: data.conversationId,
      });
    });

    socket.on("get_presence", (data: { userIds: string[] }, callback?: (res: Record<string, boolean>) => void) => {
      const result: Record<string, boolean> = {};
      for (const uid of data.userIds) {
        result[uid] = onlineUsers.has(uid);
      }
      if (typeof callback === "function") callback(result);
      else socket.emit("presence", result);
    });

    socket.on("join_post", (data: string | { postId: string }) => {
      if (!userId) { socket.emit("error", { message: "Unauthorized" }); return; }
      const postId = typeof data === "string" ? data : data.postId;
      socket.join(`post:${postId}`);
    });

    socket.on("leave_post", (data: string | { postId: string }) => {
      if (!userId) return;
      const postId = typeof data === "string" ? data : data.postId;
      socket.leave(`post:${postId}`);
    });

    // ── WebRTC Calling Signaling ──────────────────────────────────────────
    socket.on("call_initiate", (data: {
      conversationId: string;
      targetUserId: string;
      callType: "voice" | "video";
      offer: any;
      caller?: {
        id: string;
        username: string;
        fullName?: string;
        avatarUrl?: string;
      };
    }) => {
      if (!userId) return;
      const callPayload = {
        conversationId: data.conversationId,
        callerId: userId,
        caller: data.caller,
        callType: data.callType,
        offer: data.offer,
      };
      io.to(`user:${data.targetUserId}`).emit("incoming_call", callPayload);
      io.to(`user:${data.targetUserId}`).emit("call_incoming", callPayload);
    });

    socket.on("call_accept", (data: {
      conversationId: string;
      targetUserId: string;
      answer: any;
    }) => {
      if (!userId) return;
      io.to(`user:${data.targetUserId}`).emit("call_accepted", {
        conversationId: data.conversationId,
        responderId: userId,
        answer: data.answer,
      });
    });

    socket.on("call_decline", (data: {
      conversationId: string;
      targetUserId: string;
      reason?: string;
    }) => {
      if (!userId) return;
      io.to(`user:${data.targetUserId}`).emit("call_declined", {
        conversationId: data.conversationId,
        responderId: userId,
        reason: data.reason || "declined",
      });
    });

    socket.on("call_ice_candidate", (data: {
      conversationId: string;
      targetUserId: string;
      candidate: any;
    }) => {
      if (!userId) return;
      io.to(`user:${data.targetUserId}`).emit("call_ice_candidate", {
        conversationId: data.conversationId,
        senderId: userId,
        candidate: data.candidate,
      });
    });

    socket.on("call_end", (data: {
      conversationId: string;
      targetUserId: string;
      duration?: number;
    }) => {
      if (!userId) return;
      io.to(`user:${data.targetUserId}`).emit("call_ended", {
        conversationId: data.conversationId,
        endedBy: userId,
        duration: data.duration ?? 0,
      });
    });

    socket.on("call_toggle_media", (data: {
      conversationId: string;
      targetUserId: string;
      mediaType: "audio" | "video";
      enabled: boolean;
    }) => {
      if (!userId) return;
      io.to(`user:${data.targetUserId}`).emit("call_peer_media_toggled", {
        conversationId: data.conversationId,
        senderId: userId,
        mediaType: data.mediaType,
        enabled: data.enabled,
      });
    });

    socket.on("disconnect", () => {
      if (userId) {
        onlineUsers.delete(userId);
        io.emit("user_offline", { userId, lastSeen: new Date().toISOString() });
      }
      logger.info({ socketId: socket.id, userId }, "Socket disconnected");
    });
  });

  // Connect to DB asynchronously (non-blocking so server always boots)
  connectDB().catch((err) => {
    logger.warn({ err }, "Database connect check failed");
  });

  // Vite middleware in dev / static in prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});

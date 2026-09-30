import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app";
import { logger } from "./lib/logger";
import { verifyToken } from "./lib/auth";
import { connectDB } from "@workspace/db";
import { isOriginAllowed } from "./lib/cors";

/**
 * NOTE: The canonical production server entrypoint for WhiterChat is /server.ts
 * which bundles Vite SPA frontend + Express API + Socket.IO + Audio Spaces.
 * This standalone server is retained for modular API-only testing or containerization.
 */

const port = Number(process.env["PORT"] || 3000);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${process.env["PORT"]}"`);

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, cb) => {
      const ok = isOriginAllowed(origin);
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

  if (token) {
    try {
      const payload = verifyToken(token);
      userId = payload.userId;
      socket.join(`user:${userId}`);
      onlineUsers.set(userId, { socketId: socket.id, connectedAt: Date.now() });
      io.emit("user_online", { userId });
      logger.info({ userId }, "Socket authenticated");
    } catch {
      logger.warn({ socketId: socket.id }, "Socket auth failed");
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

  // ── WebRTC Signaling Events ────────────────────────────────────────────────
  socket.on("call_initiate", (data: { conversationId: string; targetUserId: string; callType: "voice" | "video"; offer: any; callerInfo?: any }) => {
    if (!userId) return;
    io.to(`user:${data.targetUserId}`).emit("call_incoming", {
      conversationId: data.conversationId,
      callerId: userId,
      callerInfo: data.callerInfo || null,
      callType: data.callType,
      offer: data.offer,
    });
  });

  socket.on("call_accept", (data: { conversationId: string; targetUserId: string; answer: any }) => {
    if (!userId) return;
    io.to(`user:${data.targetUserId}`).emit("call_accepted", {
      conversationId: data.conversationId,
      responderId: userId,
      answer: data.answer,
    });
  });

  socket.on("call_decline", (data: { conversationId: string; targetUserId: string; reason?: string }) => {
    if (!userId) return;
    io.to(`user:${data.targetUserId}`).emit("call_declined", {
      conversationId: data.conversationId,
      responderId: userId,
      reason: data.reason || "declined",
    });
  });

  socket.on("call_ice_candidate", (data: { conversationId: string; targetUserId: string; candidate: any }) => {
    if (!userId) return;
    io.to(`user:${data.targetUserId}`).emit("call_ice_candidate", {
      conversationId: data.conversationId,
      senderId: userId,
      candidate: data.candidate,
    });
  });

  socket.on("call_end", (data: { conversationId: string; targetUserId: string; duration?: number }) => {
    if (!userId) return;
    io.to(`user:${data.targetUserId}`).emit("call_ended", {
      conversationId: data.conversationId,
      senderId: userId,
      duration: data.duration || 0,
    });
  });

  socket.on("call_toggle_media", (data: { conversationId: string; targetUserId: string; audioEnabled?: boolean; videoEnabled?: boolean }) => {
    if (!userId) return;
    io.to(`user:${data.targetUserId}`).emit("call_media_toggled", {
      conversationId: data.conversationId,
      senderId: userId,
      audioEnabled: data.audioEnabled,
      videoEnabled: data.videoEnabled,
    });
  });

  // ── Live Audio Rooms (Spaces) Socket Events ────────────────────────────────
  socket.on("audio_room_create", (data: { room: any; user: any }) => {
    if (!userId) return;
    const roomId = data.room.id;
    (socket as any).audioRoomId = roomId;
    socket.join(`audio_room:${roomId}`);
    logger.info({ userId, roomId }, "Audio Room created and joined by host");
  });

  socket.on("audio_room_join", async (data: { roomId: string; user: any }) => {
    if (!userId) return;
    const roomId = data.roomId;
    (socket as any).audioRoomId = roomId;
    socket.join(`audio_room:${roomId}`);

    try {
      const { AudioRoom } = await import("@workspace/db");
      const mongoose = (await import("mongoose")).default;
      const room = await AudioRoom.findOne({ roomId });
      if (room) {
        const exists = room.participants.some((p: any) => p.userId.toString() === userId && !p.leftAt);
        if (!exists) {
          const pIdx = room.participants.findIndex((p: any) => p.userId.toString() === userId);
          if (pIdx >= 0) {
            room.participants[pIdx].leftAt = undefined;
            room.participants[pIdx].role = data.user.role || "listener";
            room.participants[pIdx].isMuted = false;
            room.participants[pIdx].joinedAt = new Date();
          } else {
            room.participants.push({
              userId: new mongoose.Types.ObjectId(userId),
              username: data.user.username,
              fullName: data.user.fullName,
              avatarUrl: data.user.avatarUrl,
              activeDecorationId: data.user.activeDecorationId,
              role: data.user.role || "listener",
              isMuted: false,
              isHandRaised: false,
              joinedAt: new Date(),
            });
          }

          // Recalculate listenerCount
          const activeSpeakers = [
            room.hostId.toString(),
            ...room.coHostIds.map((id: any) => id.toString()),
            ...room.speakerIds.map((id: any) => id.toString()),
          ];
          const activeParticipants = room.participants.filter((p: any) => !p.leftAt);
          const listeners = activeParticipants.filter((p: any) => !activeSpeakers.includes(p.userId.toString()));
          room.listenerCount = listeners.length;
          await room.save();
        }
      }
    } catch (err) {
      logger.error({ err }, "Error updating DB on audio_room_join");
    }

    socket.to(`audio_room:${roomId}`).emit("audio_room_user_joined", {
      roomId,
      user: data.user,
    });
    logger.info({ userId, roomId }, "Audio Room joined by participant");
  });

  socket.on("audio_room_leave", async (data: { roomId: string; userId: string }) => {
    const roomId = data.roomId;
    (socket as any).audioRoomId = null;
    socket.leave(`audio_room:${roomId}`);

    try {
      const { AudioRoom } = await import("@workspace/db");
      const room = await AudioRoom.findOne({ roomId });
      if (room) {
        const pIdx = room.participants.findIndex((p: any) => p.userId.toString() === userId && !p.leftAt);
        if (pIdx >= 0) {
          room.participants[pIdx].leftAt = new Date();
        }
        room.speakerIds = room.speakerIds.filter((id: any) => id.toString() !== userId);
        room.coHostIds = room.coHostIds.filter((id: any) => id.toString() !== userId);

        const activeSpeakers = [
          room.hostId.toString(),
          ...room.coHostIds.map((id: any) => id.toString()),
          ...room.speakerIds.map((id: any) => id.toString()),
        ];
        const activeParticipants = room.participants.filter((p: any) => !p.leftAt);
        const listeners = activeParticipants.filter((p: any) => !activeSpeakers.includes(p.userId.toString()));
        room.listenerCount = listeners.length;
        await room.save();
      }
    } catch (err) {
      logger.error({ err }, "Error leaving DB on audio_room_leave");
    }

    socket.to(`audio_room:${roomId}`).emit("audio_room_user_left", {
      roomId,
      userId,
    });
    logger.info({ userId, roomId }, "Audio Room left gracefully");
  });

  socket.on("audio_room_signal", (data: { roomId: string; targetUserId: string; signal: any }) => {
    if (!userId) return;
    io.to(`user:${data.targetUserId}`).emit("audio_room_signal_received", {
      roomId: data.roomId,
      senderId: userId,
      senderUser: socket.handshake.auth?.user || null,
      signal: data.signal,
    });
  });

  socket.on("audio_room_raise_hand", async (data: { roomId: string; request: any }) => {
    if (!userId) return;
    const roomId = data.roomId;
    try {
      const { AudioRoom } = await import("@workspace/db");
      await AudioRoom.updateOne(
        { roomId, "participants.userId": userId },
        { "participants.$.isHandRaised": true }
      );
    } catch (err) {
      logger.error({ err }, "Error raising hand in DB");
    }
    io.to(`audio_room:${roomId}`).emit("audio_room_hand_raised", {
      roomId,
      request: data.request,
    });
  });

  socket.on("audio_room_cancel_raise_hand", async (data: { roomId: string; userId: string }) => {
    const roomId = data.roomId;
    const targetId = data.userId || userId;
    try {
      const { AudioRoom } = await import("@workspace/db");
      await AudioRoom.updateOne(
        { roomId, "participants.userId": targetId },
        { "participants.$.isHandRaised": false }
      );
    } catch (err) {
      logger.error({ err }, "Error cancelling hand raise in DB");
    }
    io.to(`audio_room:${roomId}`).emit("audio_room_hand_cancelled", {
      roomId,
      userId: targetId,
    });
  });

  socket.on("audio_room_accept_speaker", async (data: { roomId: string; requestId: string; targetUserId: string }) => {
    const roomId = data.roomId;
    const targetId = data.targetUserId;
    try {
      const { AudioRoom } = await import("@workspace/db");
      const mongoose = (await import("mongoose")).default;
      const room = await AudioRoom.findOne({ roomId });
      if (room) {
        if (!room.speakerIds.some((id: any) => id.toString() === targetId)) {
          room.speakerIds.push(new mongoose.Types.ObjectId(targetId));
        }
        const pIdx = room.participants.findIndex((p: any) => p.userId.toString() === targetId);
        if (pIdx >= 0) {
          room.participants[pIdx].role = "speaker";
          room.participants[pIdx].isHandRaised = false;
        }

        const activeSpeakers = [
          room.hostId.toString(),
          ...room.coHostIds.map((id: any) => id.toString()),
          ...room.speakerIds.map((id: any) => id.toString()),
        ];
        const activeParticipants = room.participants.filter((p: any) => !p.leftAt);
        const listeners = activeParticipants.filter((p: any) => !activeSpeakers.includes(p.userId.toString()));
        room.listenerCount = listeners.length;
        await room.save();
      }
    } catch (err) {
      logger.error({ err }, "Error accepting speaker in DB");
    }
    io.to(`audio_room:${roomId}`).emit("audio_room_speaker_promoted", {
      roomId,
      targetUserId: targetId,
      requestId: data.requestId,
    });
  });

  socket.on("audio_room_reject_speaker", (data: { roomId: string; requestId: string }) => {
    const roomId = data.roomId;
    io.to(`audio_room:${roomId}`).emit("audio_room_hand_cancelled", {
      roomId,
      requestId: data.requestId,
    });
  });

  socket.on("audio_room_demote_speaker", async (data: { roomId: string; targetUserId: string }) => {
    const roomId = data.roomId;
    const targetId = data.targetUserId;
    try {
      const { AudioRoom } = await import("@workspace/db");
      const room = await AudioRoom.findOne({ roomId });
      if (room) {
        room.speakerIds = room.speakerIds.filter((id: any) => id.toString() !== targetId);
        room.coHostIds = room.coHostIds.filter((id: any) => id.toString() !== targetId);
        const pIdx = room.participants.findIndex((p: any) => p.userId.toString() === targetId);
        if (pIdx >= 0) {
          room.participants[pIdx].role = "listener";
          room.participants[pIdx].isHandRaised = false;
        }

        const activeSpeakers = [
          room.hostId.toString(),
          ...room.coHostIds.map((id: any) => id.toString()),
          ...room.speakerIds.map((id: any) => id.toString()),
        ];
        const activeParticipants = room.participants.filter((p: any) => !p.leftAt);
        const listeners = activeParticipants.filter((p: any) => !activeSpeakers.includes(p.userId.toString()));
        room.listenerCount = listeners.length;
        await room.save();
      }
    } catch (err) {
      logger.error({ err }, "Error demoting speaker in DB");
    }
    io.to(`audio_room:${roomId}`).emit("audio_room_speaker_demoted", {
      roomId,
      targetUserId: targetId,
    });
  });

  socket.on("audio_room_mute_speaker", (data: { roomId: string; targetUserId: string }) => {
    const roomId = data.roomId;
    io.to(`audio_room:${roomId}`).emit("audio_room_speaker_muted", {
      roomId,
      targetUserId: data.targetUserId,
    });
  });

  socket.on("audio_room_assign_cohost", async (data: { roomId: string; targetUserId: string }) => {
    const roomId = data.roomId;
    const targetId = data.targetUserId;
    try {
      const { AudioRoom } = await import("@workspace/db");
      const mongoose = (await import("mongoose")).default;
      const room = await AudioRoom.findOne({ roomId });
      if (room) {
        if (!room.coHostIds.some((id: any) => id.toString() === targetId)) {
          room.coHostIds.push(new mongoose.Types.ObjectId(targetId));
        }
        room.speakerIds = room.speakerIds.filter((id: any) => id.toString() !== targetId);
        const pIdx = room.participants.findIndex((p: any) => p.userId.toString() === targetId);
        if (pIdx >= 0) {
          room.participants[pIdx].role = "co-host";
        }
        await room.save();
      }
    } catch (err) {
      logger.error({ err }, "Error assigning cohost in DB");
    }
    io.to(`audio_room:${roomId}`).emit("audio_room_speaker_promoted", {
      roomId,
      targetUserId: targetId,
      role: "co-host",
    });
  });

  socket.on("audio_room_remove_cohost", async (data: { roomId: string; targetUserId: string }) => {
    const roomId = data.roomId;
    const targetId = data.targetUserId;
    try {
      const { AudioRoom } = await import("@workspace/db");
      const mongoose = (await import("mongoose")).default;
      const room = await AudioRoom.findOne({ roomId });
      if (room) {
        room.coHostIds = room.coHostIds.filter((id: any) => id.toString() !== targetId);
        if (!room.speakerIds.some((id: any) => id.toString() === targetId)) {
          room.speakerIds.push(new mongoose.Types.ObjectId(targetId));
        }
        const pIdx = room.participants.findIndex((p: any) => p.userId.toString() === targetId);
        if (pIdx >= 0) {
          room.participants[pIdx].role = "speaker";
        }
        await room.save();
      }
    } catch (err) {
      logger.error({ err }, "Error removing cohost in DB");
    }
    io.to(`audio_room:${roomId}`).emit("audio_room_speaker_demoted", {
      roomId,
      targetUserId: targetId,
      role: "speaker",
    });
  });

  socket.on("audio_room_kick_user", async (data: { roomId: string; targetUserId: string }) => {
    const roomId = data.roomId;
    const targetId = data.targetUserId;
    try {
      const { AudioRoom } = await import("@workspace/db");
      const room = await AudioRoom.findOne({ roomId });
      if (room) {
        const pIdx = room.participants.findIndex((p: any) => p.userId.toString() === targetId && !p.leftAt);
        if (pIdx >= 0) {
          room.participants[pIdx].leftAt = new Date();
        }
        room.speakerIds = room.speakerIds.filter((id: any) => id.toString() !== targetId);
        room.coHostIds = room.coHostIds.filter((id: any) => id.toString() !== targetId);

        const activeSpeakers = [
          room.hostId.toString(),
          ...room.coHostIds.map((id: any) => id.toString()),
          ...room.speakerIds.map((id: any) => id.toString()),
        ];
        const activeParticipants = room.participants.filter((p: any) => !p.leftAt);
        const listeners = activeParticipants.filter((p: any) => !activeSpeakers.includes(p.userId.toString()));
        room.listenerCount = listeners.length;
        await room.save();
      }
    } catch (err) {
      logger.error({ err }, "Error kicking user in DB");
    }
    io.to(`audio_room:${roomId}`).emit("audio_room_user_kicked", {
      roomId,
      targetUserId: targetId,
    });
  });

  socket.on("audio_room_toggle_mic", async (data: { roomId: string; enabled: boolean }) => {
    if (!userId) return;
    const roomId = data.roomId;
    try {
      const { AudioRoom } = await import("@workspace/db");
      await AudioRoom.updateOne(
        { roomId, "participants.userId": userId },
        { "participants.$.isMuted": !data.enabled }
      );
    } catch (err) {
      logger.error({ err }, "Error toggling mic in DB");
    }
    socket.to(`audio_room:${roomId}`).emit("audio_room_peer_mic_toggled", {
      roomId,
      userId,
      enabled: data.enabled,
    });
  });

  socket.on("audio_room_speaking", (data: { roomId: string; isSpeaking: boolean }) => {
    if (!userId) return;
    const roomId = data.roomId;
    socket.to(`audio_room:${roomId}`).emit("audio_room_peer_speaking", {
      roomId,
      userId,
      isSpeaking: data.isSpeaking,
    });
  });

  socket.on("audio_room_reaction", (data: { roomId: string; reaction: any }) => {
    const roomId = data.roomId;
    socket.to(`audio_room:${roomId}`).emit("audio_room_reaction_received", {
      roomId,
      reaction: data.reaction,
    });
  });

  socket.on("audio_room_end", async (data: { roomId: string; userId: string }) => {
    const roomId = data.roomId;
    try {
      const { AudioRoom } = await import("@workspace/db");
      const room = await AudioRoom.findOne({ roomId });
      if (room) {
        room.status = "ended";
        room.endedAt = new Date();
        room.listenerCount = 0;
        room.participants.forEach((p: any) => {
          if (!p.leftAt) p.leftAt = new Date();
        });
        await room.save();
      }
    } catch (err) {
      logger.error({ err }, "Error ending room in DB");
    }
    io.to(`audio_room:${roomId}`).emit("audio_room_ended", {
      roomId,
    });
    logger.info({ roomId }, "Audio Room ended");
  });

  // ── Collaborative Whiteboard Socket Events ──────────────────────────────────
  function getWhiteboardCollaborators(wId: string) {
    const roomSockets = io.sockets.adapter.rooms.get(`whiteboard:${wId}`);
    const collaborators: any[] = [];
    if (roomSockets) {
      const seenUserIds = new Set();
      for (const socketId of roomSockets) {
        const s = io.sockets.sockets.get(socketId);
        if (s && (s as any).whiteboardUser) {
          const user = (s as any).whiteboardUser;
          if (!seenUserIds.has(user.id)) {
            seenUserIds.add(user.id);
            collaborators.push(user);
          }
        }
      }
    }
    return collaborators;
  }

  socket.on("whiteboard_join", (data: { whiteboardId: string; user: any }) => {
    if (!userId) return;
    const { whiteboardId, user } = data;
    (socket as any).whiteboardId = whiteboardId;
    (socket as any).whiteboardUser = { ...user, id: userId }; // Ensure id is verified
    socket.join(`whiteboard:${whiteboardId}`);

    logger.info({ userId, whiteboardId }, "Joined whiteboard room");

    const collaborators = getWhiteboardCollaborators(whiteboardId);
    io.to(`whiteboard:${whiteboardId}`).emit("whiteboard_collaborators_updated", {
      whiteboardId,
      collaborators,
    });
  });

  socket.on("whiteboard_leave", (data: { whiteboardId: string }) => {
    if (!userId) return;
    const { whiteboardId } = data;
    socket.leave(`whiteboard:${whiteboardId}`);
    (socket as any).whiteboardId = undefined;
    (socket as any).whiteboardUser = undefined;

    logger.info({ userId, whiteboardId }, "Left whiteboard room");

    const collaborators = getWhiteboardCollaborators(whiteboardId);
    io.to(`whiteboard:${whiteboardId}`).emit("whiteboard_collaborators_updated", {
      whiteboardId,
      collaborators,
    });
  });

  socket.on("whiteboard_draw_operation", (data: { whiteboardId: string; operation: any }) => {
    if (!userId) return;
    const { whiteboardId, operation } = data;
    socket.to(`whiteboard:${whiteboardId}`).emit("whiteboard_peer_draw_operation", {
      whiteboardId,
      operation,
      userId,
    });
  });

  socket.on("whiteboard_cursor_move", (data: { whiteboardId: string; x: number; y: number }) => {
    if (!userId) return;
    const { whiteboardId, x, y } = data;
    const user = (socket as any).whiteboardUser;
    if (user) {
      socket.to(`whiteboard:${whiteboardId}`).emit("whiteboard_peer_cursor_moved", {
        whiteboardId,
        userId,
        username: user.username,
        avatarUrl: user.avatarUrl,
        x,
        y,
      });
    }
  });

  socket.on("whiteboard_laser_move", (data: { whiteboardId: string; x: number; y: number }) => {
    if (!userId) return;
    const { whiteboardId, x, y } = data;
    socket.to(`whiteboard:${whiteboardId}`).emit("whiteboard_peer_laser_moved", {
      whiteboardId,
      userId,
      x,
      y,
    });
  });

  socket.on("whiteboard_save_state", async (data: { whiteboardId: string; elements: any[]; undoStack: any[]; redoStack: any[] }) => {
    if (!userId) return;
    const { whiteboardId, elements, undoStack, redoStack } = data;
    try {
      const { Whiteboard } = await import("@workspace/db");
      await Whiteboard.findByIdAndUpdate(whiteboardId, {
        $set: { elements, undoStack, redoStack },
        $inc: { version: 1 }
      });
    } catch (err) {
      logger.error({ err }, "Error auto-saving whiteboard state to MongoDB");
    }
  });

  socket.on("whiteboard_clear_board", async (data: { whiteboardId: string }) => {
    if (!userId) return;
    const { whiteboardId } = data;
    try {
      const { Whiteboard } = await import("@workspace/db");
      await Whiteboard.findByIdAndUpdate(whiteboardId, {
        $set: { elements: [], undoStack: [], redoStack: [] },
        $inc: { version: 1 }
      });
      socket.to(`whiteboard:${whiteboardId}`).emit("whiteboard_peer_cleared", { whiteboardId });
    } catch (err) {
      logger.error({ err }, "Error clearing whiteboard in DB");
    }
  });

  socket.on("disconnect", async () => {
    if (userId) {
      onlineUsers.delete(userId);
      io.emit("user_offline", { userId, lastSeen: new Date().toISOString() });

      // Clean up abrupt Whiteboard disconnects
      const wToLeave = (socket as any).whiteboardId;
      if (wToLeave) {
        const collaborators = getWhiteboardCollaborators(wToLeave);
        io.to(`whiteboard:${wToLeave}`).emit("whiteboard_collaborators_updated", {
          whiteboardId: wToLeave,
          collaborators,
        });
      }

      // Clean up abrupt Audio Room disconnects
      const roomToLeave = (socket as any).audioRoomId;
      if (roomToLeave) {
        try {
          const { AudioRoom } = await import("@workspace/db");
          const room = await AudioRoom.findOne({ roomId: roomToLeave });
          if (room) {
            const pIdx = room.participants.findIndex((p: any) => p.userId.toString() === userId && !p.leftAt);
            if (pIdx >= 0) {
              room.participants[pIdx].leftAt = new Date();
            }
            room.speakerIds = room.speakerIds.filter((id: any) => id.toString() !== userId);
            room.coHostIds = room.coHostIds.filter((id: any) => id.toString() !== userId);

            const activeSpeakers = [
              room.hostId.toString(),
              ...room.coHostIds.map((id: any) => id.toString()),
              ...room.speakerIds.map((id: any) => id.toString()),
            ];
            const activeParticipants = room.participants.filter((p: any) => !p.leftAt);
            const listeners = activeParticipants.filter((p: any) => !activeSpeakers.includes(p.userId.toString()));
            room.listenerCount = listeners.length;
            await room.save();

            socket.to(`audio_room:${roomToLeave}`).emit("audio_room_user_left", {
              roomId: roomToLeave,
              userId,
            });
          }
        } catch (err) {
          logger.error({ err }, "Error cleaning up Audio Room on disconnect");
        }
      }
    }
    logger.info({ socketId: socket.id, userId }, "Socket disconnected");
  });
});

// Connect to MongoDB then start listening
connectDB()
  .then(async () => {
    logger.info("MongoDB connected");
    try {
      const { ensureDecorationsSeeded } = await import("./routes/decorations");
      await ensureDecorationsSeeded();
    } catch (e) {
      logger.warn({ err: e }, "Could not seed decorations on startup");
    }
    try {
      const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
      if (initialAdminEmail) {
        const { User } = await import("@workspace/db");
        const adminAcc = await User.findOne({ email: initialAdminEmail });
        if (adminAcc) {
          let changed = false;
          if (adminAcc.role !== "superadmin") {
            adminAcc.role = "superadmin";
            changed = true;
          }
          if (!adminAcc.isVerified) {
            adminAcc.isVerified = true;
            changed = true;
          }
          if (adminAcc.isSuspended) {
            adminAcc.isSuspended = false;
            changed = true;
          }
          if (changed) {
            await adminAcc.save();
            logger.info({ email: initialAdminEmail }, "Configured superadmin for initial admin email");
          }
        }
      }
    } catch (e) {
      logger.warn({ err: e }, "Could not check admin account on startup");
    }

    httpServer.listen(port, () => {
      logger.info({ port }, "Server listening");
    });
  })
  .catch((err) => {
    logger.error({ err }, "Failed to connect to MongoDB");
    process.exit(1);
  });

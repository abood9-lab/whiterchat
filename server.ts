import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { Server as SocketIOServer } from "socket.io";
import { createServer as createViteServer } from "vite";
import app from "./artifacts/api-server/src/app";
import { logger } from "./artifacts/api-server/src/lib/logger";
import { verifyToken, getJwtSecret } from "./artifacts/api-server/src/lib/auth";
import mongoose from "mongoose";
import { connectDB, AudioRoom, Whiteboard, Conversation } from "./lib/db/src/index";
import { ensureDecorationsSeeded } from "./artifacts/api-server/src/routes/decorations";
import { ensureEffectsSeeded } from "./artifacts/api-server/src/routes/effects";
import { isOriginAllowed } from "./artifacts/api-server/src/lib/cors";
import {
  validateConversationMembership,
  validateCallSignaling,
  validateAudioRoomParticipant,
  validateAudioRoomModerator,
} from "./artifacts/api-server/src/lib/socketAuth";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  // Validate JWT Secret configuration on server startup
  getJwtSecret();

  const httpServer = createServer(app);

  const io = new SocketIOServer(httpServer, {
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

  // Multi-device presence map: userId -> Set of socket IDs
  const onlineUsers = new Map<string, Set<string>>();
  const whiteboardCollaborators = new Map<string, Map<string, any>>();

  async function validateWhiteboardAccess(whiteboardId: string, uId: string) {
    try {
      const whiteboard = await Whiteboard.findById(whiteboardId);
      if (!whiteboard) return null;

      const conv = await Conversation.findById(whiteboard.conversationId);
      if (!conv) return null;

      if (conv.isGroup) {
        if (conv.bannedUserIds?.some((id: any) => id.toString() === uId)) {
          return null;
        }
        const isMember = (conv.memberIds ?? []).some((id: any) => id.toString() === uId);
        if (!isMember) return null;
      } else {
        const isMember = conv.user1Id?.toString() === uId || conv.user2Id?.toString() === uId;
        if (!isMember) return null;
      }

      return { whiteboard, conv };
    } catch {
      return null;
    }
  }

  io.on("connection", (socket) => {
    const token = socket.handshake.auth?.token as string | undefined;
    let userId: string | undefined;

    if (token && typeof token === "string" && token.trim() && token !== "null" && token !== "undefined") {
      try {
        const payload = verifyToken(token);
        userId = payload.userId;
        socket.join(`user:${userId}`);

        let userSockets = onlineUsers.get(userId);
        const wasOffline = !userSockets || userSockets.size === 0;
        if (!userSockets) {
          userSockets = new Set();
          onlineUsers.set(userId, userSockets);
        }
        userSockets.add(socket.id);

        if (wasOffline) {
          io.emit("user_online", { userId });
        }
        logger.info({ userId, socketId: socket.id }, "Socket authenticated");
      } catch {
        logger.debug({ socketId: socket.id }, "Socket auth token expired or invalid");
      }
    }

    function resolveConvId(data: string | { conversationId: string }): string {
      return typeof data === "string" ? data : data.conversationId;
    }

    socket.on("join_conversation", async (data: string | { conversationId: string }) => {
      if (!userId) {
        socket.emit("error", { message: "Unauthorized" });
        return;
      }
      const convId = resolveConvId(data);
      if (!convId) return;

      const conv = await validateConversationMembership(convId, userId);
      if (!conv) {
        socket.emit("error", { message: "Access denied to conversation" });
        return;
      }
      socket.join(`conversation:${convId}`);
    });

    socket.on("leave_conversation", (data: string | { conversationId: string }) => {
      if (!userId) return;
      socket.leave(`conversation:${resolveConvId(data)}`);
    });

    socket.on("typing", async (data: { conversationId: string; isVoice?: boolean }) => {
      if (!userId || !data?.conversationId) return;
      const conv = await validateConversationMembership(data.conversationId, userId);
      if (!conv) return;

      socket.to(`conversation:${data.conversationId}`).emit("typing", {
        userId,
        conversationId: data.conversationId,
        isVoice: data.isVoice ?? false,
      });
    });

    socket.on("stop_typing", async (data: { conversationId: string }) => {
      if (!userId || !data?.conversationId) return;
      const conv = await validateConversationMembership(data.conversationId, userId);
      if (!conv) return;

      socket.to(`conversation:${data.conversationId}`).emit("stop_typing", {
        userId,
        conversationId: data.conversationId,
      });
    });

    socket.on("mark_read", async (data: { conversationId: string }) => {
      if (!userId || !data?.conversationId) return;
      const conv = await validateConversationMembership(data.conversationId, userId);
      if (!conv) return;

      socket.to(`conversation:${data.conversationId}`).emit("message_read", {
        userId,
        conversationId: data.conversationId,
      });
    });

    socket.on("get_presence", (data: { userIds: string[] }, callback?: (res: Record<string, boolean>) => void) => {
      const result: Record<string, boolean> = {};
      if (Array.isArray(data?.userIds)) {
        for (const uid of data.userIds) {
          const userSockets = onlineUsers.get(uid);
          result[uid] = Boolean(userSockets && userSockets.size > 0);
        }
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
    socket.on("call_initiate", async (data: {
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
      if (!userId || !data?.conversationId || !data?.targetUserId) return;
      const authCheck = await validateCallSignaling(data.conversationId, userId, data.targetUserId);
      if (!authCheck.ok) {
        socket.emit("call_error", { message: authCheck.error || "Call initiation unauthorized" });
        return;
      }

      const callPayload = {
        conversationId: data.conversationId,
        callerId: userId,
        caller: data.caller ? { ...data.caller, id: userId } : { id: userId, username: "User" },
        callType: data.callType,
        offer: data.offer,
      };
      io.to(`user:${data.targetUserId}`).emit("incoming_call", callPayload);
      io.to(`user:${data.targetUserId}`).emit("call_incoming", callPayload);
    });

    socket.on("call_accept", async (data: {
      conversationId: string;
      targetUserId: string;
      answer: any;
    }) => {
      if (!userId || !data?.conversationId || !data?.targetUserId) return;
      const authCheck = await validateCallSignaling(data.conversationId, userId, data.targetUserId);
      if (!authCheck.ok) return;

      io.to(`user:${data.targetUserId}`).emit("call_accepted", {
        conversationId: data.conversationId,
        responderId: userId,
        answer: data.answer,
      });
    });

    socket.on("call_decline", async (data: {
      conversationId: string;
      targetUserId: string;
      reason?: string;
    }) => {
      if (!userId || !data?.conversationId || !data?.targetUserId) return;
      const authCheck = await validateCallSignaling(data.conversationId, userId, data.targetUserId);
      if (!authCheck.ok) return;

      io.to(`user:${data.targetUserId}`).emit("call_declined", {
        conversationId: data.conversationId,
        responderId: userId,
        reason: data.reason || "declined",
      });
    });

    socket.on("call_ice_candidate", async (data: {
      conversationId: string;
      targetUserId: string;
      candidate: any;
    }) => {
      if (!userId || !data?.conversationId || !data?.targetUserId) return;
      const authCheck = await validateCallSignaling(data.conversationId, userId, data.targetUserId);
      if (!authCheck.ok) return;

      io.to(`user:${data.targetUserId}`).emit("call_ice_candidate", {
        conversationId: data.conversationId,
        senderId: userId,
        candidate: data.candidate,
      });
    });

    socket.on("call_end", async (data: {
      conversationId: string;
      targetUserId: string;
      duration?: number;
    }) => {
      if (!userId || !data?.conversationId || !data?.targetUserId) return;
      const authCheck = await validateCallSignaling(data.conversationId, userId, data.targetUserId);
      if (!authCheck.ok) return;

      io.to(`user:${data.targetUserId}`).emit("call_ended", {
        conversationId: data.conversationId,
        endedBy: userId,
        duration: data.duration ?? 0,
      });
    });

    socket.on("call_toggle_media", async (data: {
      conversationId: string;
      targetUserId: string;
      mediaType: "audio" | "video";
      enabled: boolean;
    }) => {
      if (!userId || !data?.conversationId || !data?.targetUserId) return;
      const authCheck = await validateCallSignaling(data.conversationId, userId, data.targetUserId);
      if (!authCheck.ok) return;

      io.to(`user:${data.targetUserId}`).emit("call_peer_media_toggled", {
        conversationId: data.conversationId,
        senderId: userId,
        mediaType: data.mediaType,
        enabled: data.enabled,
      });
    });

    // ── Group Call Room Signaling (Mesh WebRTC) ───────────────────────────
    socket.on("group_call_join_room", async (data: { roomId: string; conversationId: string; user?: any }) => {
      if (!userId || !data?.roomId || !data?.conversationId) return;
      const conv = await validateConversationMembership(data.conversationId, userId);
      if (!conv) {
        socket.emit("error", { message: "Access denied to group call" });
        return;
      }

      const { roomId } = data;
      socket.join(`group_call:${roomId}`);
      socket.to(`group_call:${roomId}`).emit("group_call_user_joined", {
        roomId,
        userId,
        user: data.user ? { ...data.user, id: userId } : { id: userId, username: "User" },
      });
    });

    socket.on("group_call_signal", async (data: {
      roomId: string;
      conversationId?: string;
      targetUserId: string;
      signal: any;
    }) => {
      if (!userId || !data?.roomId || !data?.targetUserId) return;
      if (data.conversationId) {
        const conv = await validateConversationMembership(data.conversationId, userId);
        if (!conv) return;
      }

      io.to(`user:${data.targetUserId}`).emit("group_call_signal_received", {
        roomId: data.roomId,
        senderId: userId,
        signal: data.signal,
      });
    });

    socket.on("group_call_toggle_media", (data: {
      roomId: string;
      mediaType: "audio" | "video";
      enabled: boolean;
    }) => {
      if (!userId || !data?.roomId) return;
      socket.to(`group_call:${data.roomId}`).emit("group_call_peer_media_toggled", {
        roomId: data.roomId,
        userId,
        mediaType: data.mediaType,
        enabled: data.enabled,
      });
    });

    socket.on("group_call_speaking", (data: {
      roomId: string;
      isSpeaking: boolean;
    }) => {
      if (!userId || !data?.roomId) return;
      socket.to(`group_call:${data.roomId}`).emit("group_call_peer_speaking", {
        roomId: data.roomId,
        userId,
        isSpeaking: data.isSpeaking,
      });
    });

    socket.on("group_call_leave_room", (data: { roomId: string; conversationId?: string }) => {
      if (!userId || !data?.roomId) return;
      socket.leave(`group_call:${data.roomId}`);
      socket.to(`group_call:${data.roomId}`).emit("group_call_user_left", {
        roomId: data.roomId,
        userId,
      });
    });

    // ── Live Audio Room (Spaces) Signaling ───────────────────────────
    socket.on("audio_room_join", async (data: {
      roomId: string;
      user: {
        id: string;
        username: string;
        fullName?: string;
        avatarUrl?: string;
        activeDecorationId?: string;
        role?: "host" | "co-host" | "speaker" | "listener";
      };
    }) => {
      if (!userId || !data?.roomId) return;
      const { roomId, user: userData } = data;

      try {
        const participantCheck = await validateAudioRoomParticipant(roomId, userId);
        if (!participantCheck.ok || !participantCheck.room) {
          socket.emit("error", { message: "Access denied to audio room" });
          return;
        }

        const room = participantCheck.room;
        const authoritativeRole = participantCheck.role || "listener";
        socket.join(`audio_room:${roomId}`);

        // Check if already in participants
        const pIdx = room.participants.findIndex((p: any) => p.userId.toString() === userId && !p.leftAt);
        if (pIdx >= 0) {
          room.participants[pIdx].leftAt = undefined;
          room.participants[pIdx].role = authoritativeRole;
        } else {
          room.participants.push({
            userId: new mongoose.Types.ObjectId(userId) as any,
            username: userData.username,
            fullName: userData.fullName,
            avatarUrl: userData.avatarUrl,
            activeDecorationId: userData.activeDecorationId,
            role: authoritativeRole,
            isMuted: false,
            isHandRaised: false,
            joinedAt: new Date(),
          });
        }

        // Calculate active listener count
        const activeParticipants = room.participants.filter((p: any) => !p.leftAt);
        const activeSpeakers = [
          room.hostId.toString(),
          ...((room.coHostIds || []).map((id: any) => id.toString())),
          ...((room.speakerIds || []).map((id: any) => id.toString())),
        ];
        const activeListeners = activeParticipants.filter((p: any) => !activeSpeakers.includes(p.userId.toString()));
        room.listenerCount = activeListeners.length;

        await room.save();

        socket.to(`audio_room:${roomId}`).emit("audio_room_user_joined", {
          roomId,
          user: { ...userData, id: userId, role: authoritativeRole },
        });
      } catch (err) {
        logger.error({ err, roomId, userId }, "Error handling audio_room_join");
      }
    });

    socket.on("audio_room_leave", async (data: { roomId: string; userId?: string }) => {
      if (!userId || !data?.roomId) return;
      const { roomId } = data;
      socket.leave(`audio_room:${roomId}`);

      try {
        const room = await AudioRoom.findOne({ roomId });
        if (room) {
          const pIdx = room.participants.findIndex((p: any) => p.userId.toString() === userId && !p.leftAt);
          if (pIdx >= 0) {
            room.participants[pIdx].leftAt = new Date();
          }

          room.speakerIds = (room.speakerIds || []).filter((id: any) => id.toString() !== userId);
          room.coHostIds = (room.coHostIds || []).filter((id: any) => id.toString() !== userId);

          const activeParticipants = room.participants.filter((p: any) => !p.leftAt);
          const activeSpeakers = [
            room.hostId.toString(),
            ...((room.coHostIds || []).map((id: any) => id.toString())),
            ...((room.speakerIds || []).map((id: any) => id.toString())),
          ];
          const activeListeners = activeParticipants.filter((p: any) => !activeSpeakers.includes(p.userId.toString()));
          room.listenerCount = activeListeners.length;

          await room.save();
        }

        socket.to(`audio_room:${roomId}`).emit("audio_room_user_left", {
          roomId,
          userId,
        });
      } catch (err) {
        logger.error({ err, roomId, userId }, "Error handling audio_room_leave");
      }
    });

    socket.on("audio_room_end", async (data: { roomId: string; userId?: string }) => {
      if (!userId || !data?.roomId) return;
      const { roomId } = data;

      try {
        const modCheck = await validateAudioRoomModerator(roomId, userId);
        if (!modCheck.ok || !modCheck.isHost || !modCheck.room) {
          socket.emit("error", { message: "Only the room host can end this space" });
          return;
        }

        const room = modCheck.room;
        room.status = "ended";
        room.endedAt = new Date();
        room.listenerCount = 0;
        room.participants.forEach((p: any) => {
          if (!p.leftAt) p.leftAt = new Date();
        });
        await room.save();

        io.to(`audio_room:${roomId}`).emit("audio_room_ended", { roomId });
      } catch (err) {
        logger.error({ err, roomId, userId }, "Error handling audio_room_end");
      }
    });

    socket.on("audio_room_signal", async (data: { roomId: string; targetUserId: string; signal: any }) => {
      if (!userId || !data?.roomId || !data?.targetUserId) return;
      const pCheck = await validateAudioRoomParticipant(data.roomId, userId);
      if (!pCheck.ok) return;

      io.to(`user:${data.targetUserId}`).emit("audio_room_signal_received", {
        roomId: data.roomId,
        senderId: userId,
        signal: data.signal,
        senderUser: {
          id: userId,
          role: pCheck.role || "listener",
        },
      });
    });

    socket.on("audio_room_toggle_mic", async (data: { roomId: string; enabled: boolean }) => {
      if (!userId || !data?.roomId) return;
      const pCheck = await validateAudioRoomParticipant(data.roomId, userId);
      if (!pCheck.ok) return;

      socket.to(`audio_room:${data.roomId}`).emit("audio_room_peer_mic_toggled", {
        roomId: data.roomId,
        userId,
        enabled: data.enabled,
      });
    });

    socket.on("audio_room_speaking", async (data: { roomId: string; isSpeaking: boolean }) => {
      if (!userId || !data?.roomId) return;
      const pCheck = await validateAudioRoomParticipant(data.roomId, userId);
      if (!pCheck.ok) return;

      socket.to(`audio_room:${data.roomId}`).emit("audio_room_peer_speaking", {
        roomId: data.roomId,
        userId,
        isSpeaking: data.isSpeaking,
      });
    });

    socket.on("audio_room_raise_hand", async (data: { roomId: string; request: any }) => {
      if (!userId || !data?.roomId) return;
      const pCheck = await validateAudioRoomParticipant(data.roomId, userId);
      if (!pCheck.ok) return;

      socket.to(`audio_room:${data.roomId}`).emit("audio_room_hand_raised", {
        roomId: data.roomId,
        request: { ...data.request, userId },
      });
    });

    socket.on("audio_room_cancel_raise_hand", async (data: { roomId: string; userId?: string }) => {
      if (!userId || !data?.roomId) return;
      const pCheck = await validateAudioRoomParticipant(data.roomId, userId);
      if (!pCheck.ok) return;

      socket.to(`audio_room:${data.roomId}`).emit("audio_room_hand_cancelled", {
        roomId: data.roomId,
        userId: data.userId || userId,
      });
    });

    socket.on("audio_room_accept_speaker", async (data: { roomId: string; requestId: string; targetUserId: string }) => {
      if (!userId || !data?.roomId || !data?.targetUserId) return;
      const { roomId, requestId, targetUserId } = data;

      try {
        const modCheck = await validateAudioRoomModerator(roomId, userId);
        if (!modCheck.ok || !modCheck.room) {
          socket.emit("error", { message: "Only host or co-hosts can promote speakers" });
          return;
        }

        const room = modCheck.room;
        const pIdx = room.participants.findIndex((p: any) => p.userId.toString() === targetUserId && !p.leftAt);
        if (pIdx >= 0) {
          room.participants[pIdx].role = "speaker";
        }
        if (!(room.speakerIds || []).some((id: any) => id.toString() === targetUserId)) {
          room.speakerIds = room.speakerIds || [];
          room.speakerIds.push(new mongoose.Types.ObjectId(targetUserId) as any);
        }
        await room.save();

        io.to(`audio_room:${roomId}`).emit("audio_room_speaker_promoted", {
          roomId,
          requestId,
          targetUserId,
        });
      } catch (err) {
        logger.error({ err, roomId, targetUserId }, "Error handling audio_room_accept_speaker");
      }
    });

    socket.on("audio_room_reject_speaker", async (data: { roomId: string; requestId: string }) => {
      if (!userId || !data?.roomId || !data?.requestId) return;
      const modCheck = await validateAudioRoomModerator(data.roomId, userId);
      if (!modCheck.ok) return;

      io.to(`audio_room:${data.roomId}`).emit("audio_room_hand_cancelled", {
        roomId: data.roomId,
        userId: data.requestId.split("-").pop() || "",
      });
    });

    socket.on("audio_room_demote_speaker", async (data: { roomId: string; targetUserId: string }) => {
      if (!userId || !data?.roomId || !data?.targetUserId) return;
      const { roomId, targetUserId } = data;

      try {
        const modCheck = await validateAudioRoomModerator(roomId, userId);
        if (!modCheck.ok || !modCheck.room) return;

        const room = modCheck.room;
        const pIdx = room.participants.findIndex((p: any) => p.userId.toString() === targetUserId && !p.leftAt);
        if (pIdx >= 0) {
          room.participants[pIdx].role = "listener";
        }
        room.speakerIds = (room.speakerIds || []).filter((id: any) => id.toString() !== targetUserId);
        room.coHostIds = (room.coHostIds || []).filter((id: any) => id.toString() !== targetUserId);
        await room.save();

        io.to(`audio_room:${roomId}`).emit("audio_room_speaker_demoted", {
          roomId,
          targetUserId,
        });
      } catch (err) {
        logger.error({ err, roomId, targetUserId }, "Error handling audio_room_demote_speaker");
      }
    });

    socket.on("audio_room_mute_speaker", async (data: { roomId: string; targetUserId: string }) => {
      if (!userId || !data?.roomId || !data?.targetUserId) return;
      const modCheck = await validateAudioRoomModerator(data.roomId, userId);
      if (!modCheck.ok) return;

      io.to(`audio_room:${data.roomId}`).emit("audio_room_speaker_muted", {
        roomId: data.roomId,
        targetUserId: data.targetUserId,
      });
    });

    socket.on("audio_room_assign_cohost", async (data: { roomId: string; targetUserId: string }) => {
      if (!userId || !data?.roomId || !data?.targetUserId) return;
      const { roomId, targetUserId } = data;

      try {
        const modCheck = await validateAudioRoomModerator(roomId, userId);
        if (!modCheck.ok || !modCheck.isHost || !modCheck.room) {
          socket.emit("error", { message: "Only the host can assign co-hosts" });
          return;
        }

        const room = modCheck.room;
        const pIdx = room.participants.findIndex((p: any) => p.userId.toString() === targetUserId && !p.leftAt);
        if (pIdx >= 0) {
          room.participants[pIdx].role = "co-host";
        }
        room.coHostIds = room.coHostIds || [];
        if (!room.coHostIds.some((id: any) => id.toString() === targetUserId)) {
          room.coHostIds.push(new mongoose.Types.ObjectId(targetUserId) as any);
        }
        room.speakerIds = room.speakerIds || [];
        if (!room.speakerIds.some((id: any) => id.toString() === targetUserId)) {
          room.speakerIds.push(new mongoose.Types.ObjectId(targetUserId) as any);
        }
        await room.save();

        io.to(`audio_room:${roomId}`).emit("audio_room_speaker_promoted", {
          roomId,
          targetUserId,
          role: "co-host",
        });
      } catch (err) {
        logger.error({ err, roomId, targetUserId }, "Error handling audio_room_assign_cohost");
      }
    });

    socket.on("audio_room_remove_cohost", async (data: { roomId: string; targetUserId: string }) => {
      if (!userId || !data?.roomId || !data?.targetUserId) return;
      const { roomId, targetUserId } = data;

      try {
        const modCheck = await validateAudioRoomModerator(roomId, userId);
        if (!modCheck.ok || !modCheck.isHost || !modCheck.room) return;

        const room = modCheck.room;
        const pIdx = room.participants.findIndex((p: any) => p.userId.toString() === targetUserId && !p.leftAt);
        if (pIdx >= 0) {
          room.participants[pIdx].role = "speaker";
        }
        room.coHostIds = (room.coHostIds || []).filter((id: any) => id.toString() !== targetUserId);
        await room.save();

        io.to(`audio_room:${roomId}`).emit("audio_room_speaker_promoted", {
          roomId,
          targetUserId,
          role: "speaker",
        });
      } catch (err) {
        logger.error({ err, roomId, targetUserId }, "Error handling audio_room_remove_cohost");
      }
    });

    socket.on("audio_room_kick_user", async (data: { roomId: string; targetUserId: string }) => {
      if (!userId || !data?.roomId || !data?.targetUserId) return;
      const { roomId, targetUserId } = data;

      try {
        const modCheck = await validateAudioRoomModerator(roomId, userId);
        if (!modCheck.ok || !modCheck.room) return;

        const room = modCheck.room;
        const pIdx = room.participants.findIndex((p: any) => p.userId.toString() === targetUserId && !p.leftAt);
        if (pIdx >= 0) {
          room.participants[pIdx].leftAt = new Date();
        }
        room.speakerIds = (room.speakerIds || []).filter((id: any) => id.toString() !== targetUserId);
        room.coHostIds = (room.coHostIds || []).filter((id: any) => id.toString() !== targetUserId);
        await room.save();

        io.to(`audio_room:${roomId}`).emit("audio_room_user_kicked", {
          roomId,
          targetUserId,
        });
      } catch (err) {
        logger.error({ err, roomId, targetUserId }, "Error handling audio_room_kick_user");
      }
    });

    socket.on("audio_room_reaction", async (data: { roomId: string; reaction: any }) => {
      if (!userId || !data?.roomId) return;
      const pCheck = await validateAudioRoomParticipant(data.roomId, userId);
      if (!pCheck.ok) return;

      socket.to(`audio_room:${data.roomId}`).emit("audio_room_reaction_received", {
        roomId: data.roomId,
        reaction: data.reaction,
      });
    });

    // ── Live Collaborative Whiteboard Signaling ───────────────────────────
    socket.on("whiteboard_join", async (data: {
      whiteboardId: string;
      user: {
        username: string;
        fullName?: string;
        avatarUrl?: string;
      };
    }) => {
      if (!userId) return;
      const { whiteboardId, user: userData } = data;

      try {
        const validated = await validateWhiteboardAccess(whiteboardId, userId);
        if (!validated) {
          socket.emit("error", { message: "Unauthorized access to whiteboard" });
          return;
        }

        socket.join(`whiteboard:${whiteboardId}`);

        if (!whiteboardCollaborators.has(whiteboardId)) {
          whiteboardCollaborators.set(whiteboardId, new Map());
        }
        const roomCollaborators = whiteboardCollaborators.get(whiteboardId)!;
        roomCollaborators.set(userId, {
          userId,
          username: userData.username,
          fullName: userData.fullName,
          avatarUrl: userData.avatarUrl,
          socketId: socket.id,
        });

        const list = Array.from(roomCollaborators.values());
        io.to(`whiteboard:${whiteboardId}`).emit("whiteboard_collaborators_updated", {
          whiteboardId,
          collaborators: list,
        });

        logger.info({ whiteboardId, userId }, "User joined whiteboard session");
      } catch (err) {
        logger.error({ err, whiteboardId, userId }, "Error joining whiteboard");
      }
    });

    const handleWhiteboardLeave = (whiteboardId: string) => {
      if (!userId) return;
      socket.leave(`whiteboard:${whiteboardId}`);

      const roomCollaborators = whiteboardCollaborators.get(whiteboardId);
      if (roomCollaborators) {
        roomCollaborators.delete(userId);
        if (roomCollaborators.size === 0) {
          whiteboardCollaborators.delete(whiteboardId);
        } else {
          io.to(`whiteboard:${whiteboardId}`).emit("whiteboard_collaborators_updated", {
            whiteboardId,
            collaborators: Array.from(roomCollaborators.values()),
          });
        }
      }
    };

    socket.on("whiteboard_leave", (data: { whiteboardId: string }) => {
      handleWhiteboardLeave(data.whiteboardId);
    });

    socket.on("whiteboard_draw_operation", async (data: {
      whiteboardId: string;
      operation: {
        type: "draw" | "create" | "update" | "delete" | "clear" | "sync_state";
        payload: any;
      };
    }) => {
      if (!userId) return;
      const { whiteboardId, operation } = data;

      try {
        const validated = await validateWhiteboardAccess(whiteboardId, userId);
        if (!validated) return;

        socket.to(`whiteboard:${whiteboardId}`).emit("whiteboard_peer_draw_operation", {
          whiteboardId,
          operation,
          userId,
        });

        const { whiteboard } = validated;
        const { type, payload } = operation;

        if (type === "draw" || type === "create") {
          const exists = whiteboard.elements.some((el: any) => el.id === payload.id);
          if (!exists) {
            whiteboard.elements.push(payload);
          }
        } else if (type === "update") {
          whiteboard.elements = whiteboard.elements.map((el: any) =>
            el.id === payload.id ? { ...el, ...payload } : el
          );
        } else if (type === "delete") {
          whiteboard.elements = whiteboard.elements.filter((el: any) => el.id !== payload.id);
        } else if (type === "clear") {
          whiteboard.elements = [];
          whiteboard.undoStack = [];
          whiteboard.redoStack = [];
        } else if (type === "sync_state") {
          whiteboard.elements = payload.elements || [];
          whiteboard.undoStack = payload.undoStack || [];
          whiteboard.redoStack = payload.redoStack || [];
        }

        whiteboard.version += 1;
        await whiteboard.save();
      } catch (err) {
        logger.error({ err, whiteboardId, userId }, "Error handling whiteboard_draw_operation");
      }
    });

    socket.on("whiteboard_save_state", async (data: {
      whiteboardId: string;
      elements: any[];
      undoStack?: any[];
      redoStack?: any[];
    }) => {
      if (!userId) return;
      const { whiteboardId, elements, undoStack: uStack, redoStack: rStack } = data;

      try {
        const validated = await validateWhiteboardAccess(whiteboardId, userId);
        if (!validated) return;

        const { whiteboard } = validated;
        whiteboard.elements = elements;
        if (uStack) whiteboard.undoStack = uStack;
        if (rStack) whiteboard.redoStack = rStack;
        whiteboard.version += 1;
        await whiteboard.save();
      } catch (err) {
        logger.error({ err, whiteboardId, userId }, "Error handling whiteboard_save_state");
      }
    });

    socket.on("whiteboard_cursor_move", async (data: {
      whiteboardId: string;
      x: number;
      y: number;
    }) => {
      if (!userId) return;
      const { whiteboardId, x, y } = data;

      try {
        const colabs = whiteboardCollaborators.get(whiteboardId);
        const me = colabs?.get(userId);
        if (!me) return;

        socket.to(`whiteboard:${whiteboardId}`).emit("whiteboard_peer_cursor_moved", {
          whiteboardId,
          userId,
          username: me.username,
          avatarUrl: me.avatarUrl,
          x,
          y,
        });
      } catch (err) {
        logger.error({ err, whiteboardId, userId }, "Error handling whiteboard_cursor_move");
      }
    });

    socket.on("whiteboard_laser_move", async (data: {
      whiteboardId: string;
      x: number;
      y: number;
    }) => {
      if (!userId) return;
      const { whiteboardId, x, y } = data;

      try {
        socket.to(`whiteboard:${whiteboardId}`).emit("whiteboard_peer_laser_moved", {
          whiteboardId,
          userId,
          x,
          y,
        });
      } catch (err) {
        logger.error({ err, whiteboardId, userId }, "Error handling whiteboard_laser_move");
      }
    });

    socket.on("disconnect", () => {
      if (userId) {
        onlineUsers.delete(userId);
        io.emit("user_offline", { userId, lastSeen: new Date().toISOString() });

        // Cleanup user from all active whiteboard sessions
        for (const [wbId, colabs] of whiteboardCollaborators.entries()) {
          if (colabs.has(userId)) {
            colabs.delete(userId);
            if (colabs.size === 0) {
              whiteboardCollaborators.delete(wbId);
            } else {
              io.to(`whiteboard:${wbId}`).emit("whiteboard_collaborators_updated", {
                whiteboardId: wbId,
                collaborators: Array.from(colabs.values()),
              });
            }
          }
        }
      }
      logger.info({ socketId: socket.id, userId }, "Socket disconnected");
    });
  });

  // Connect to DB asynchronously (non-blocking so server always boots)
  connectDB()
    .then(() => {
      ensureDecorationsSeeded().catch(() => {});
      ensureEffectsSeeded().catch(() => {});
    })
    .catch((err) => {
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
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(indexPath);
      });
    } else {
      // Standalone backend mode (e.g., Render hosting backend only, Cloudflare hosting frontend)
      app.get("/", (_req, res) => {
        res.json({
          status: "online",
          service: "WhiterChat API & WebSocket Backend",
          version: "1.0.0",
          docs: "/api/health",
          timestamp: new Date().toISOString(),
        });
      });
    }
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});

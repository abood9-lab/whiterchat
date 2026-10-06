import { Router, type IRouter } from "express";
import { Conversation, GroupCallSession, Message, User } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";
import mongoose from "mongoose";
import type { Server as SocketServer } from "socket.io";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function getIo(req: AuthRequest): SocketServer | undefined {
  return (req as any).app.get("io");
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s} sec`;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}

// ── 1. Create or retrieve active group call for a conversation ──────────────
router.post("/group-calls", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { conversationId, callType = "voice" } = req.body;
    if (!conversationId) {
      res.status(400).json({ error: "conversationId is required" });
      return;
    }

    const meId = req.userId!;
    const conv = await Conversation.findById(conversationId);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    if (!conv.isGroup) {
      res.status(400).json({ error: "Group calls are only supported in group conversations" });
      return;
    }

    // Verify membership & permissions
    const isMember = (conv.memberIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === meId);
    const isBanned = (conv.bannedUserIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === meId);
    if (!isMember || isBanned) {
      res.status(403).json({ error: "You are not a member of this group" });
      return;
    }

    if (conv.isDisabled) {
      res.status(403).json({ error: "This group conversation has been disabled" });
      return;
    }

    const me = await User.findById(meId);
    if (!me) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Check if there is already an active group call session
    let session = await GroupCallSession.findOne({
      conversationId: conv._id,
      status: "active",
    });

    if (session) {
      // Check capacity
      if (session.activeParticipantCount >= session.maxParticipants) {
        // If user is already an active participant, allow them back in
        const existingActive = session.participants.some(
          p => p.userId.toString() === meId && !p.leftAt
        );
        if (!existingActive) {
          res.status(409).json({ error: "Group call is currently full (max 8 participants)", session });
          return;
        }
      }

      // Add user to existing session if not present
      const pIdx = session.participants.findIndex(p => p.userId.toString() === meId);
      if (pIdx >= 0) {
        session.participants[pIdx].leftAt = undefined;
        session.participants[pIdx].joinedAt = new Date();
      } else {
        session.participants.push({
          userId: me._id,
          username: me.username,
          fullName: me.fullName ?? undefined,
          avatarUrl: me.avatarUrl ?? undefined,
          joinedAt: new Date(),
          isMuted: false,
          isCameraOff: callType === "voice",
        });
      }

      session.activeParticipantCount = session.participants.filter(p => !p.leftAt).length;
      await session.save();

      res.json({ session, isExisting: true });
      return;
    }

    // Create a new room session
    const roomId = `gc_${conv._id.toString()}_${Date.now()}`;
    session = await GroupCallSession.create({
      conversationId: conv._id,
      roomId,
      createdBy: me._id,
      callType: callType === "video" ? "video" : "voice",
      status: "active",
      activeParticipantCount: 1,
      maxParticipants: 8,
      startedAt: new Date(),
      participants: [
        {
          userId: me._id,
          username: me.username,
          fullName: me.fullName ?? undefined,
          avatarUrl: me.avatarUrl ?? undefined,
          joinedAt: new Date(),
          isMuted: false,
          isCameraOff: callType === "voice",
        },
      ],
    });

    // Notify all members of the group via Socket.IO
    const io = getIo(req);
    if (io) {
      const payload = {
        roomId: session.roomId,
        conversationId: conv._id.toString(),
        groupName: conv.groupName,
        groupAvatarUrl: conv.groupAvatarUrl,
        callType: session.callType,
        createdBy: {
          id: me._id.toString(),
          username: me.username,
          fullName: me.fullName,
          avatarUrl: me.avatarUrl,
        },
        activeParticipantCount: 1,
        startedAt: session.startedAt.toISOString(),
      };
      io.to(`conversation:${conv._id.toString()}`).emit("group_call_started", payload);
    }

    // Post a system message in the chat
    try {
      await Message.create({
        conversationId: conv._id,
        senderId: me._id,
        text: `Started a ${session.callType} call`,
        messageType: "system_call",
        callLog: {
          callType: session.callType,
          duration: 0,
          status: "completed",
        },
        readBy: [me._id],
      });
    } catch {
      // Non-critical
    }

    res.status(201).json({ session, isExisting: false });
  } catch (err: any) {
    logger.error({ err }, "Error creating group call session");
    res.status(500).json({ error: "Failed to initiate group call" });
  }
});

// ── 2. Get active group call for a conversation ─────────────────────────────
router.get("/group-calls/active/:conversationId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const meId = req.userId!;

    const conv = await Conversation.findById(conversationId);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const isMember = (conv.memberIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === meId);
    if (!isMember) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const session = await GroupCallSession.findOne({
      conversationId: conv._id,
      status: "active",
    });

    if (!session) {
      res.json({ activeCall: null });
      return;
    }

    // Sanitize active count
    const activeParticipants = session.participants.filter(p => !p.leftAt);
    session.activeParticipantCount = activeParticipants.length;

    res.json({
      activeCall: {
        roomId: session.roomId,
        conversationId: session.conversationId.toString(),
        callType: session.callType,
        createdBy: session.createdBy.toString(),
        startedAt: session.startedAt.toISOString(),
        activeParticipantCount: session.activeParticipantCount,
        participants: activeParticipants.map(p => ({
          userId: p.userId.toString(),
          username: p.username,
          fullName: p.fullName,
          avatarUrl: p.avatarUrl,
          isMuted: p.isMuted,
          isCameraOff: p.isCameraOff,
          joinedAt: p.joinedAt?.toISOString(),
        })),
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Error fetching active group call");
    res.status(500).json({ error: "Failed to fetch active group call" });
  }
});

// ── 3. Join an existing group call session ──────────────────────────────────
router.post("/group-calls/:roomId/join", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { roomId } = req.params;
    const meId = req.userId!;

    const session = await GroupCallSession.findOne({ roomId });
    if (!session) {
      res.status(404).json({ error: "Call room not found" });
      return;
    }

    if (session.status !== "active") {
      res.status(410).json({ error: "This group call has ended" });
      return;
    }

    const conv = await Conversation.findById(session.conversationId);
    if (!conv) {
      res.status(404).json({ error: "Associated group not found" });
      return;
    }

    const isMember = (conv.memberIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === meId);
    const isBanned = (conv.bannedUserIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === meId);
    if (!isMember || isBanned) {
      res.status(403).json({ error: "You are not a member of this group" });
      return;
    }

    const me = await User.findById(meId);
    if (!me) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Verify room capacity limit (8 max)
    const activeParticipants = session.participants.filter(p => !p.leftAt);
    const isAlreadyIn = activeParticipants.some(p => p.userId.toString() === meId);

    if (!isAlreadyIn && activeParticipants.length >= session.maxParticipants) {
      res.status(409).json({ error: "Group call is full (maximum 8 participants reached)" });
      return;
    }

    // Add / reactivate user in participant list
    const pIdx = session.participants.findIndex(p => p.userId.toString() === meId);
    if (pIdx >= 0) {
      session.participants[pIdx].leftAt = undefined;
      session.participants[pIdx].joinedAt = new Date();
      session.participants[pIdx].username = me.username;
      session.participants[pIdx].fullName = me.fullName ?? undefined;
      session.participants[pIdx].avatarUrl = me.avatarUrl ?? undefined;
    } else {
      session.participants.push({
        userId: me._id,
        username: me.username,
        fullName: me.fullName ?? undefined,
        avatarUrl: me.avatarUrl ?? undefined,
        joinedAt: new Date(),
        isMuted: false,
        isCameraOff: session.callType === "voice",
      });
    }

    session.activeParticipantCount = session.participants.filter(p => !p.leftAt).length;
    await session.save();

    res.json({
      session,
      participants: session.participants.filter(p => !p.leftAt).map(p => ({
        userId: p.userId.toString(),
        username: p.username,
        fullName: p.fullName,
        avatarUrl: p.avatarUrl,
        isMuted: p.isMuted,
        isCameraOff: p.isCameraOff,
      })),
    });
  } catch (err: any) {
    logger.error({ err }, "Error joining group call");
    res.status(500).json({ error: "Failed to join group call" });
  }
});

// ── 4. Leave a group call ───────────────────────────────────────────────────
router.post("/group-calls/:roomId/leave", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { roomId } = req.params;
    const meId = req.userId!;

    const session = await GroupCallSession.findOne({ roomId });
    if (!session) {
      res.json({ success: true, message: "Room not found or already closed" });
      return;
    }

    const pIdx = session.participants.findIndex(p => p.userId.toString() === meId && !p.leftAt);
    if (pIdx >= 0) {
      session.participants[pIdx].leftAt = new Date();
    }

    const activeRemaining = session.participants.filter(p => !p.leftAt);
    session.activeParticipantCount = activeRemaining.length;

    const io = getIo(req);

    // If no active participants remaining, end the session
    if (activeRemaining.length === 0 && session.status === "active") {
      session.status = "ended";
      session.endedAt = new Date();
      session.duration = Math.max(0, Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 1000));
      await session.save();

      if (io) {
        io.to(`conversation:${session.conversationId.toString()}`).emit("group_call_ended", {
          roomId: session.roomId,
          conversationId: session.conversationId.toString(),
          duration: session.duration,
        });
      }

      // Post system message
      try {
        await Message.create({
          conversationId: session.conversationId,
          senderId: session.createdBy,
          text: `${session.callType === "video" ? "Video" : "Voice"} call ended · ${formatDuration(session.duration)}`,
          messageType: "system_call",
          callLog: {
            callType: session.callType,
            duration: session.duration,
            status: "completed",
          },
        });
      } catch {
        // Non-critical
      }
    } else {
      await session.save();
      if (io) {
        io.to(`group_call:${roomId}`).emit("group_call_user_left", {
          roomId,
          userId: meId,
          activeParticipantCount: session.activeParticipantCount,
        });
        io.to(`conversation:${session.conversationId.toString()}`).emit("group_call_participant_count", {
          roomId,
          conversationId: session.conversationId.toString(),
          activeParticipantCount: session.activeParticipantCount,
        });
      }
    }

    res.json({ success: true, activeRemainingCount: session.activeParticipantCount });
  } catch (err: any) {
    logger.error({ err }, "Error leaving group call");
    res.status(500).json({ error: "Failed to leave group call" });
  }
});

// ── 5. End group call (Host / Group Admin only) ──────────────────────────────
router.post("/group-calls/:roomId/end", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { roomId } = req.params;
    const meId = req.userId!;

    const session = await GroupCallSession.findOne({ roomId });
    if (!session) {
      res.status(404).json({ error: "Call room not found" });
      return;
    }

    const conv = await Conversation.findById(session.conversationId);
    if (!conv) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    const isCreator = session.createdBy.toString() === meId;
    const isAdmin = (conv.adminIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === meId);

    if (!isCreator && !isAdmin) {
      res.status(403).json({ error: "Only the call initiator or a group admin can end the call for everyone" });
      return;
    }

    if (session.status === "active") {
      session.status = "ended";
      session.endedAt = new Date();
      session.duration = Math.max(0, Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 1000));
      session.activeParticipantCount = 0;
      session.participants.forEach(p => {
        if (!p.leftAt) p.leftAt = new Date();
      });
      await session.save();

      const io = getIo(req);
      if (io) {
        io.to(`group_call:${roomId}`).emit("group_call_ended", {
          roomId: session.roomId,
          conversationId: session.conversationId.toString(),
          endedBy: meId,
          duration: session.duration,
        });
        io.to(`conversation:${session.conversationId.toString()}`).emit("group_call_ended", {
          roomId: session.roomId,
          conversationId: session.conversationId.toString(),
          endedBy: meId,
          duration: session.duration,
        });
      }

      // System message
      try {
        await Message.create({
          conversationId: session.conversationId,
          senderId: session.createdBy,
          text: `${session.callType === "video" ? "Video" : "Voice"} call ended · ${formatDuration(session.duration)}`,
          messageType: "system_call",
          callLog: {
            callType: session.callType,
            duration: session.duration,
            status: "completed",
          },
        });
      } catch {
        // Non-critical
      }
    }

    res.json({ success: true, message: "Call ended successfully", duration: session.duration });
  } catch (err: any) {
    logger.error({ err }, "Error ending group call");
    res.status(500).json({ error: "Failed to end group call" });
  }
});

export default router;

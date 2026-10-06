import { Router, type IRouter } from "express";
import { Whiteboard, Conversation, Message, User } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { planService } from "../services/planService";
import mongoose from "mongoose";
import type { Server as SocketServer } from "socket.io";

const router: IRouter = Router();

function getIo(req: AuthRequest): SocketServer | undefined {
  return (req as any).app.get("io");
}

async function isBusinessPlusAccount(userId: string): Promise<boolean> {
  const user = await User.findById(userId).catch(() => null);
  if (!user) return false;
  const effectivePlan = await planService.getUserEffectivePlan(user);
  const plan = String(effectivePlan || user.subscriptionPlan || "").toLowerCase();
  const accType = String(user.accountType || "").toLowerCase();
  const vBadge = String(user.verificationBadge || "").toLowerCase();
  const vPlan = String(user.verificationPlanName || "").toLowerCase();
  const role = String(user.role || "").toLowerCase();
  return (
    plan === "business" ||
    plan === "business_plus" ||
    plan === "business+" ||
    accType === "business" ||
    vBadge === "verified_business" ||
    vPlan.includes("business") ||
    role === "admin" ||
    role === "superadmin"
  );
}

async function isConversationParticipant(conv: any, userId: string): Promise<boolean> {
  if (!conv || !userId) return false;
  const uid = userId.toString();
  if (conv.isGroup) {
    if (conv.bannedUserIds?.some((id: any) => (id?._id || id)?.toString() === uid)) {
      return false;
    }
    return (conv.memberIds ?? []).some((id: any) => (id?._id || id)?.toString() === uid);
  }
  const u1 = (conv.user1Id?._id || conv.user1Id)?.toString();
  const u2 = (conv.user2Id?._id || conv.user2Id)?.toString();
  return u1 === uid || u2 === uid;
}

function serializeWhiteboard(wb: any) {
  return {
    id: wb._id.toString(),
    _id: wb._id.toString(),
    conversationId: wb.conversationId.toString(),
    createdBy: wb.createdBy?.toString() ?? null,
    title: wb.title || "Shared Whiteboard",
    elements: wb.elements || [],
    undoStack: wb.undoStack || [],
    redoStack: wb.redoStack || [],
    version: wb.version ?? 1,
    status: wb.status || "active",
    createdAt: wb.createdAt?.toISOString?.() ?? wb.createdAt,
    updatedAt: wb.updatedAt?.toISOString?.() ?? wb.updatedAt,
  };
}

// ── Create a Shared Whiteboard ─────────────────────────────────────────────
router.post("/conversations/:conversationId/whiteboards", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const conversationId = req.params.conversationId;
  const { title = "Shared Whiteboard" } = req.body as { title?: string };

  try {
    const hasBusinessPlus = await isBusinessPlusAccount(req.userId!);
    if (!hasBusinessPlus) {
      res.status(403).json({
        error: "Shared Whiteboard is exclusive to Business+ accounts. Upgrade your account in Settings to create collaborative whiteboards.",
        code: "BUSINESS_PLUS_REQUIRED",
      });
      return;
    }

    const conv = await Conversation.findById(conversationId).catch(() => null);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    if (!(await isConversationParticipant(conv, req.userId!))) {
      res.status(403).json({ error: "You are not authorized to access this conversation" });
      return;
    }

    // Check onlyAdminsCanSend setting for group
    if (conv.isGroup && conv.onlyAdminsCanSend) {
      const isAdmin = conv.adminIds?.some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
      if (!isAdmin) {
        res.status(403).json({ error: "Only admins are allowed to send messages or start sessions in this group" });
        return;
      }
    }

    // Create the Whiteboard session
    const whiteboard = await Whiteboard.create({
      conversationId: conv._id,
      createdBy: new mongoose.Types.ObjectId(req.userId!),
      title: title.trim() || "Shared Whiteboard",
      elements: [],
      version: 1,
      status: "active",
    });

    // Create the Message card pointing to the whiteboard
    const message = await Message.create({
      conversationId: conv._id,
      senderId: new mongoose.Types.ObjectId(req.userId!),
      text: "Created a shared whiteboard",
      messageType: "whiteboard",
      whiteboardId: whiteboard._id,
    });

    // Update conversation last activity
    await Conversation.findByIdAndUpdate(conv._id, { lastActivityAt: new Date() });

    const serializedMessage = {
      id: message._id.toString(),
      conversationId: message.conversationId.toString(),
      senderId: message.senderId.toString(),
      text: message.text,
      mediaUrl: null,
      mediaType: null,
      fileName: null,
      messageType: "whiteboard",
      whiteboardId: whiteboard._id.toString(),
      isRead: false,
      isEdited: false,
      isDeleted: false,
      isForwarded: false,
      reactions: {},
      isPinned: false,
      starredBy: [],
      clientId: null,
      replyToId: null,
      replyTo: null,
      isSnap: false,
      viewOnce: false,
      viewsLeft: null,
      viewedBy: [],
      pollId: null,
      gameId: null,
      poll: null,
      game: null,
      readBy: [],
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
    };

    // Broadcast serialized whiteboard card message to conversation and recipient sockets
    const io = getIo(req);
    if (io) {
      io.to(`conversation:${conversationId}`).emit("new_message", serializedMessage);
      if (conv.isGroup) {
        const recipientIds = (conv.memberIds ?? []).filter(
          (id: mongoose.Types.ObjectId) => id.toString() !== req.userId
        );
        for (const rid of recipientIds) {
          io.to(`user:${rid.toString()}`).emit("new_message", serializedMessage);
        }
      } else {
        const recipientId =
          conv.user1Id?.toString() === req.userId
            ? conv.user2Id?.toString()
            : conv.user1Id?.toString();
        if (recipientId) {
          io.to(`user:${recipientId}`).emit("new_message", serializedMessage);
        }
      }
    }

    res.status(201).json({ whiteboard, message: serializedMessage });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to create whiteboard" });
  }
});

// ── Fetch a Specific Whiteboard ────────────────────────────────────────────
router.get("/whiteboards/:whiteboardId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { whiteboardId } = req.params;

  try {
    const whiteboard = await Whiteboard.findById(whiteboardId).catch(() => null);
    if (!whiteboard) {
      res.status(404).json({ error: "Whiteboard session not found" });
      return;
    }

    if (whiteboard.status === "deleted") {
      res.status(410).json({ error: "Whiteboard session has been deleted" });
      return;
    }

    const conv = await Conversation.findById(whiteboard.conversationId).catch(() => null);
    if (!conv) {
      res.status(404).json({ error: "Associated conversation not found" });
      return;
    }

    if (!(await isConversationParticipant(conv, req.userId!))) {
      res.status(403).json({ error: "You are not authorized to view this whiteboard" });
      return;
    }

    res.json(serializeWhiteboard(whiteboard));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to load whiteboard" });
  }
});

// ── Fetch Latest Whiteboard for Conversation ───────────────────────────────
router.get("/conversations/:conversationId/whiteboard/latest", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { conversationId } = req.params;

  try {
    const conv = await Conversation.findById(conversationId).catch(() => null);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    if (!(await isConversationParticipant(conv, req.userId!))) {
      res.status(403).json({ error: "You are not authorized to access this conversation" });
      return;
    }

    const whiteboard = await Whiteboard.findOne({
      conversationId: conv._id,
      status: { $ne: "deleted" },
    }).sort({ createdAt: -1 });

    if (!whiteboard) {
      res.status(404).json({ error: "No active whiteboard found in this conversation" });
      return;
    }

    res.json(serializeWhiteboard(whiteboard));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to load latest whiteboard" });
  }
});

// ── Rename/Update a Whiteboard ─────────────────────────────────────────────
router.patch("/whiteboards/:whiteboardId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { whiteboardId } = req.params;
  const { title } = req.body as { title?: string };

  if (!title || !title.trim()) {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  try {
    const whiteboard = await Whiteboard.findById(whiteboardId).catch(() => null);
    if (!whiteboard) {
      res.status(404).json({ error: "Whiteboard session not found" });
      return;
    }

    const conv = await Conversation.findById(whiteboard.conversationId).catch(() => null);
    if (!conv || !(await isConversationParticipant(conv, req.userId!))) {
      res.status(403).json({ error: "You are not authorized to modify this whiteboard" });
      return;
    }

    whiteboard.title = title.trim();
    whiteboard.version += 1;
    await whiteboard.save();

    // Broadcast update via Socket.IO
    const io = getIo(req);
    if (io) {
      io.to(`whiteboard:${whiteboardId}`).emit("whiteboard_metadata_updated", {
        whiteboardId,
        title: whiteboard.title,
        version: whiteboard.version,
      });
    }

    res.json(whiteboard);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to rename whiteboard" });
  }
});

// ── Delete/Close a Whiteboard ──────────────────────────────────────────────
router.delete("/whiteboards/:whiteboardId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { whiteboardId } = req.params;

  try {
    const whiteboard = await Whiteboard.findById(whiteboardId).catch(() => null);
    if (!whiteboard) {
      res.status(404).json({ error: "Whiteboard session not found" });
      return;
    }

    const conv = await Conversation.findById(whiteboard.conversationId).catch(() => null);
    if (!conv) {
      res.status(404).json({ error: "Associated conversation not found" });
      return;
    }

    const isOwner = whiteboard.createdBy.toString() === req.userId;
    const isGroupAdmin = conv.isGroup && conv.adminIds?.some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);

    if (!isOwner && !isGroupAdmin) {
      res.status(403).json({ error: "Only the whiteboard creator or group admins can delete it" });
      return;
    }

    whiteboard.status = "deleted";
    await whiteboard.save();

    // Broadcast deletion to all collaborators
    const io = getIo(req);
    if (io) {
      io.to(`whiteboard:${whiteboardId}`).emit("whiteboard_deleted", { whiteboardId });
    }

    res.json({ success: true, message: "Whiteboard deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete whiteboard" });
  }
});

export default router;

import { Router, type IRouter } from "express";
import { Whiteboard, Conversation, Message } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";
import mongoose from "mongoose";
import type { Server as SocketServer } from "socket.io";

const router: IRouter = Router();

function getIo(req: AuthRequest): SocketServer | undefined {
  return (req as any).app.get("io");
}

async function isConversationParticipant(conv: any, userId: string): Promise<boolean> {
  if (!conv) return false;
  if (conv.isGroup) {
    // Check if user is banned
    if (conv.bannedUserIds?.some((id: mongoose.Types.ObjectId) => id.toString() === userId)) {
      return false;
    }
    return (conv.memberIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === userId);
  }
  return conv.user1Id?.toString() === userId || conv.user2Id?.toString() === userId;
}

// ── Create a Shared Whiteboard ─────────────────────────────────────────────
router.post("/conversations/:conversationId/whiteboards", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const conversationId = req.params.conversationId;
  const { title = "Shared Whiteboard" } = req.body as { title?: string };

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

    // Populate sender info for Socket broadcasting
    const io = getIo(req);
    if (io) {
      const populatedMessage = await Message.findById(message._id).catch(() => message);
      io.to(`conversation:${conversationId}`).emit("new_message", populatedMessage);
    }

    res.status(201).json({ whiteboard, message });
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

    res.json(whiteboard);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to load whiteboard" });
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

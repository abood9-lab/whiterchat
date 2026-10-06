import { Router, type IRouter } from "express";
import { User, Conversation, Message, Notification, Poll, GameSession, Note, Post, Whiteboard } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { buildUserSummary } from "./users";
import { buildGroupConversation } from "./groups";
import { uploadBase64 } from "../lib/cloudinary";
import { notifyUserPush } from "../lib/push";
import { serializePoll } from "./polls";
import { serializeGame } from "./games";
import mongoose from "mongoose";
import type { Server as SocketServer } from "socket.io";
import { encryptPayload, decryptPayload, hashSolution } from "../lib/messageCrypto";

const router: IRouter = Router();

function getIo(req: AuthRequest): SocketServer | undefined {
  return (req as any).app.get("io");
}

function serializeMessage(m: any, replyTo?: any, poll?: any, game?: any, currentUserId?: string) {
  const reactions: Record<string, string[]> = {};
  if (m.reactions instanceof Map) {
    m.reactions.forEach((ids: mongoose.Types.ObjectId[], emoji: string) => {
      reactions[emoji] = ids.map((id: mongoose.Types.ObjectId) => id.toString());
    });
  }
  const isWhiteboard =
    m.messageType === "whiteboard" ||
    !!m.whiteboardId ||
    m.text === "Created a shared whiteboard" ||
    (typeof m.text === "string" && m.text.startsWith("Created a shared whiteboard"));

  const isSender = currentUserId ? m.senderId.toString() === currentUserId : false;

  // ── Puzzle resolution ──
  let clientPuzzle: any = null;
  let resolvedText = m.isDeleted ? null : (m.text ?? null);

  if (m.messageType === "puzzle" && m.puzzle) {
    const isSolved = isSender || ((m.puzzle.solvedBy ?? []).some((id: any) => id.toString() === currentUserId));
    const userFailures = (m.puzzle.failedUserAttempts || []).find((a: any) => a.userId.toString() === currentUserId)?.attempts || 0;
    const maxAttempts = m.puzzle.maxAttempts ?? 3;
    const attemptsRemaining = maxAttempts > 0 ? Math.max(0, maxAttempts - userFailures) : 999;

    if (isSolved) {
      if (m.puzzle.encryptedPayload) {
        resolvedText = decryptPayload(m.puzzle.encryptedPayload) || m.text || "";
      }
    } else {
      resolvedText = null; // Do NOT leak plaintext to unsolved recipient
    }

    clientPuzzle = {
      type: m.puzzle.type,
      question: m.puzzle.question,
      hint: m.puzzle.hint || null,
      maxAttempts,
      attemptsUsed: userFailures,
      attemptsRemaining,
      expiresAt: m.puzzle.expiresAt ? new Date(m.puzzle.expiresAt).toISOString() : null,
      revealPolicy: m.puzzle.revealPolicy || "permanent",
      isSolved,
      solvedAt: m.puzzle.solvedAt ? new Date(m.puzzle.solvedAt).toISOString() : null,
      memoryCards: m.puzzle.type === "memory_challenge" ? (isSolved || isSender ? m.puzzle.memoryCards : undefined) : undefined,
    };
  }

  // ── Permission-gated resolution ──
  let clientPermissionGated: any = null;
  if (m.messageType === "permission_gated" && m.permissionGated) {
    const myGrant = (m.permissionGated.grants || []).find((g: any) => g.userId.toString() === currentUserId);
    const isAccessGranted = isSender || (
      myGrant &&
      myGrant.status === "approved" &&
      !myGrant.consumed &&
      (!myGrant.expiresAt || new Date() <= new Date(myGrant.expiresAt))
    );

    if (isAccessGranted) {
      if (m.permissionGated.encryptedPayload) {
        resolvedText = decryptPayload(m.permissionGated.encryptedPayload) || m.text || "";
      }
    } else {
      resolvedText = null; // Do NOT leak plaintext
    }

    clientPermissionGated = {
      previewNote: m.permissionGated.previewNote || null,
      allowReopening: m.permissionGated.allowReopening ?? true,
      expiresAt: m.permissionGated.expiresAt ? new Date(m.permissionGated.expiresAt).toISOString() : null,
      status: myGrant?.status || (isSender ? "sender" : "none"),
      grantType: myGrant?.grantType || null,
      isAccessGranted: Boolean(isAccessGranted),
      grantsSummary: isSender ? (m.permissionGated.grants || []).map((g: any) => ({
        userId: g.userId.toString(),
        status: g.status,
        grantType: g.grantType,
        requestedAt: g.requestedAt ? new Date(g.requestedAt).toISOString() : undefined,
        expiresAt: g.expiresAt ? new Date(g.expiresAt).toISOString() : null,
        consumed: g.consumed,
      })) : undefined,
    };
  }

  // ── Selective visibility metadata ──
  let clientSelectiveVisibility: any = null;
  if (m.selectiveVisibility && m.selectiveVisibility.mode && m.selectiveVisibility.mode !== "all") {
    clientSelectiveVisibility = {
      mode: m.selectiveVisibility.mode,
      isSilent: m.selectiveVisibility.isSilent ?? true,
      allowedUserIds: isSender ? (m.selectiveVisibility.allowedUserIds || []).map((id: any) => id.toString()) : undefined,
      deniedUserIds: isSender ? (m.selectiveVisibility.deniedUserIds || []).map((id: any) => id.toString()) : undefined,
    };
  }

  // ── Co-Write metadata ──
  let clientCoWrite: any = null;
  if (m.messageType === "co_write" && m.coWrite) {
    clientCoWrite = {
      draftId: m.coWrite.draftId ? m.coWrite.draftId.toString() : null,
      authorIds: (m.coWrite.authorIds || []).map((id: any) => id.toString()),
      authorUsernames: m.coWrite.authorUsernames || [],
    };
  }

  return {
    id: m._id.toString(),
    conversationId: m.conversationId.toString(),
    senderId: m.senderId.toString(),
    text: resolvedText,
    mediaUrl: m.isDeleted ? null : (m.isSnap ? null : (m.mediaUrl ?? null)), // hide snap media until opened
    mediaType: m.isDeleted ? null : (m.mediaType ?? null),
    fileName: m.isDeleted ? null : (m.fileName ?? null),
    messageType: isWhiteboard ? "whiteboard" : (m.messageType || (m.pollId ? "poll" : m.gameId ? "game" : m.mediaUrl ? (m.mediaType?.startsWith("audio") ? "voice" : "image") : "text")),
    puzzle: clientPuzzle,
    permissionGated: clientPermissionGated,
    selectiveVisibility: clientSelectiveVisibility,
    coWrite: clientCoWrite,
    whiteboardId: m.whiteboardId?.toString() ?? (m.whiteboard?._id?.toString() || m.whiteboard?.id?.toString() || null),
    postId: m.postId?.toString() ?? null,
    reelId: m.reelId?.toString() ?? null,
    sharedPost: m.isDeleted ? null : (m.sharedPost ?? null),
    sharedReel: m.isDeleted ? null : (m.sharedReel ?? null),
    spotifyTrack: m.isDeleted ? null : (m.spotifyTrack ?? null),
    callLog: m.isDeleted ? null : (m.callLog ?? null),
    gifInfo: m.isDeleted ? null : (m.gifInfo ?? null),
    stickerInfo: m.isDeleted ? null : (m.stickerInfo ?? null),
    locationInfo: m.isDeleted ? null : (m.locationInfo ?? null),
    isRead: m.isRead,
    isEdited: m.isEdited,
    isDeleted: m.isDeleted,
    isForwarded: m.isForwarded ?? false,
    reactions,
    isPinned: m.isPinned,
    starredBy: (m.starredBy ?? []).map((id: mongoose.Types.ObjectId) => id.toString()),
    clientId: m.clientId ?? null,
    replyToId: m.replyToId?.toString() ?? null,
    isSnap: m.isSnap ?? false,
    viewOnce: m.viewOnce ?? false,
    viewsLeft: m.viewsLeft ?? null,
    viewedBy: (m.viewedBy ?? []).map((id: mongoose.Types.ObjectId) => id.toString()),
    replyTo: replyTo ? {
      id: replyTo._id.toString(),
      senderId: replyTo.senderId.toString(),
      text: replyTo.isDeleted ? null : (replyTo.text ?? null),
      mediaType: replyTo.isDeleted ? null : (replyTo.mediaType ?? null),
      messageType: replyTo.messageType ?? "text",
      spotifyTrack: replyTo.spotifyTrack ?? null,
      sharedPost: replyTo.sharedPost ?? null,
      sharedReel: replyTo.sharedReel ?? null,
    } : null,
    replyToNote: (m.replyToNote && m.replyToNote.noteId) ? {
      noteId: m.replyToNote.noteId ? m.replyToNote.noteId.toString() : null,
      text: m.replyToNote.text ?? null,
      emoji: m.replyToNote.emoji ?? null,
      gifUrl: m.replyToNote.gifUrl ?? null,
      sticker: m.replyToNote.sticker ?? null,
      voiceUrl: m.replyToNote.voiceUrl ?? null,
      voiceDuration: m.replyToNote.voiceDuration ?? null,
      imageUrl: m.replyToNote.imageUrl ?? null,
      spotifyTrack: m.replyToNote.spotifyTrack ?? null,
      location: m.replyToNote.location ? {
        name: m.replyToNote.location.name,
        lat: m.replyToNote.location.lat,
        lng: m.replyToNote.location.lng,
      } : null,
      theme: m.replyToNote.theme || "default",
      authorUsername: m.replyToNote.authorUsername ?? null,
      isExpired: m.replyToNote.isExpired ?? false,
    } : null,
    replyToStory: m.replyToStory ? {
      storyId: m.replyToStory.storyId ? m.replyToStory.storyId.toString() : null,
      mediaUrl: m.replyToStory.mediaUrl ?? null,
      caption: m.replyToStory.caption ?? null,
      authorUsername: m.replyToStory.authorUsername ?? null,
    } : null,
    pollId: m.pollId?.toString() ?? null,
    gameId: m.gameId?.toString() ?? null,
    poll: poll ? serializePoll(poll, currentUserId) : null,
    game: game ? serializeGame(game, currentUserId) : null,
    readBy: (m.readBy ?? []).map((id: mongoose.Types.ObjectId) => id.toString()),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

async function buildConversation(conv: any, meId: string) {
  if (conv.isGroup) return buildGroupConversation(conv, meId);
  const otherId = conv.user1Id.toString() === meId ? conv.user2Id : conv.user1Id;
  const [meUser, otherUser] = await Promise.all([User.findById(meId), User.findById(otherId)]);
  const lastMsg: any = await Message.findOne({ conversationId: conv._id, isDeleted: false }).sort({ createdAt: -1 });
  const unreadCount = await Message.countDocuments({ conversationId: conv._id, senderId: { $ne: meId }, isRead: false, isDeleted: false });
  const isArchived = (conv.isArchivedBy ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === meId);
  const isMuted = (conv.isMutedBy ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === meId);
  // A conversation is a "request" if the other user doesn't follow the current user
  const otherFollowsMe = (otherUser?.following ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === meId);
  const isRequest = !otherFollowsMe;
  // Block status
  const isBlocked = (meUser?.blockedUsers ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === otherId.toString());
  const isBlockedBy = (otherUser?.blockedUsers ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === meId);
  // Timeout status (who is restricted from sending in this conversation)
  const now = new Date();
  const myTimeout = (conv.timeoutEntries ?? []).find((e: any) => e.userId.toString() === meId && new Date(e.until) > now);
  const otherTimeout = (conv.timeoutEntries ?? []).find((e: any) => e.userId.toString() === otherId.toString() && new Date(e.until) > now);
  return {
    id: conv._id.toString(),
    otherUser: await buildUserSummary(otherUser, meId),
    lastMessage: lastMsg ? (lastMsg.isDeleted ? "Message deleted" : (lastMsg.text ?? (lastMsg.mediaUrl ? ("[" + (lastMsg.mediaType ?? "media") + "]") : null))) : null,
    lastMessageAt: lastMsg?.createdAt?.toISOString() ?? conv.lastActivityAt?.toISOString() ?? null,
    unreadCount,
    isArchived,
    isMuted,
    isPinned: (conv.isPinnedBy ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === meId),
    theme: conv.theme || "default",
    isRequest,
    disappearAfter: conv.disappearAfter ?? null,
    isBlocked,
    isBlockedBy,
    myTimeoutUntil: myTimeout ? new Date(myTimeout.until).toISOString() : null,
    otherTimeoutUntil: otherTimeout ? new Date(otherTimeout.until).toISOString() : null,
  };
}

// ── Conversation membership guard ──────────────────────────────────────────
async function assertParticipant(conversationId: string, userId: string): Promise<boolean> {
  const conv = await Conversation.findById(conversationId).catch(() => null);
  if (!conv) return false;
  if (conv.isGroup) {
    return (conv.memberIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === userId);
  }
  return conv.user1Id?.toString() === userId || conv.user2Id?.toString() === userId;
}

// ── Disappear-aware message time filter ────────────────────────────────────
function disappearFilter(disappearAfter: string | null): Date | null {
  if (!disappearAfter) return null;
  const map: Record<string, number> = { "1h": 60 * 60 * 1000, "24h": 24 * 60 * 60 * 1000, "7d": 7 * 24 * 60 * 60 * 1000 };
  const ms = map[disappearAfter];
  return ms ? new Date(Date.now() - ms) : null;
}

router.get("/conversations", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const showArchived = req.query.archived === "true";
  const { VaultConversation } = await import("@workspace/db");
  const vaulted = await VaultConversation.find({ userId: req.userId }).select("conversationId");
  const vaultedIds = vaulted.map((v: any) => v.conversationId.toString());
  const convs = await Conversation.find({
    $or: [
      { user1Id: req.userId, isGroup: { $ne: true } },
      { user2Id: req.userId, isGroup: { $ne: true } },
      { isGroup: true, memberIds: req.userId },
    ],
    _id: { $nin: vaultedIds },
  }).sort({ lastActivityAt: -1 });
  const all = await Promise.all(convs.map(c => buildConversation(c, req.userId!)));
  const filtered = showArchived ? all.filter(c => c.isArchived) : all.filter(c => !c.isArchived);
  res.json(filtered);
});

router.post("/conversations", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { username, otherUsername } = req.body as { username?: string; otherUsername?: string };
  const targetUsername = username || otherUsername;
  if (!targetUsername) { res.status(400).json({ error: "username required" }); return; }
  const otherUser = await User.findOne({ username: { $regex: new RegExp(`^${targetUsername}$`, "i") } });
  if (!otherUser) { res.status(404).json({ error: "User not found" }); return; }
  if (otherUser._id.toString() === req.userId) { res.status(400).json({ error: "Cannot message yourself" }); return; }
  // Don't reveal that the user is blocked — just silently fail with 404
  const iAmBlockedByThem = (otherUser.blockedUsers ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
  if (iAmBlockedByThem) { res.status(404).json({ error: "User not found" }); return; }

  // Check whoCanMessage
  const whoCanMessage = otherUser.privacySettings?.whoCanMessage || "everyone";
  if (whoCanMessage === "none" || whoCanMessage === "no_one") {
    res.status(403).json({ error: "This user does not accept direct messages." });
    return;
  }
  if (whoCanMessage === "following") {
    const followsMe = (otherUser.following ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
    if (!followsMe) {
      res.status(403).json({ error: "Only accounts followed by this user can message them." });
      return;
    }
  }

  const existing = await Conversation.findOne({

    $or: [
      { user1Id: req.userId, user2Id: otherUser._id },
      { user1Id: otherUser._id, user2Id: req.userId },
    ],
  });
  if (existing) { res.json(await buildConversation(existing, req.userId!)); return; }
  const conv = await Conversation.create({ user1Id: req.userId, user2Id: otherUser._id });
  res.json(await buildConversation(conv, req.userId!));
});

// ── Mark conversation as read ────────────────────────────────────────────────
router.post("/conversations/:conversationId/read", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const conversationId = req.params.conversationId as string;
  const conv = await Conversation.findById(conversationId).catch(() => null);
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  const isMember = conv.isGroup
    ? (conv.memberIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId)
    : (conv.user1Id?.toString() === req.userId || conv.user2Id?.toString() === req.userId);
  if (!isMember) { res.status(403).json({ error: "Not a participant" }); return; }

  if (conv.isGroup) {
    const meOid = new mongoose.Types.ObjectId(req.userId!);
    await Message.updateMany(
      { conversationId, senderId: { $ne: meOid }, isDeleted: false },
      { $addToSet: { readBy: meOid } }
    );
  } else {
    await Message.updateMany(
      { conversationId, senderId: { $ne: req.userId }, isRead: false },
      { isRead: true, updatedAt: new Date() }
    );
  }
  res.json({ ok: true, isRead: true });
});

// ── Mark conversation as unread ──────────────────────────────────────────────
router.post("/conversations/:conversationId/unread", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const conversationId = req.params.conversationId as string;
  const conv = await Conversation.findById(conversationId).catch(() => null);
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  const isMember = conv.isGroup
    ? (conv.memberIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId)
    : (conv.user1Id?.toString() === req.userId || conv.user2Id?.toString() === req.userId);
  if (!isMember) { res.status(403).json({ error: "Not a participant" }); return; }

  const lastMsg = await Message.findOne({ conversationId, isDeleted: false }).sort({ createdAt: -1 });
  if (lastMsg) {
    if (conv.isGroup) {
      const meOid = new mongoose.Types.ObjectId(req.userId!);
      await Message.findByIdAndUpdate(lastMsg._id, { $pull: { readBy: meOid } });
    } else {
      await Message.findByIdAndUpdate(lastMsg._id, { isRead: false });
    }
  }
  res.json({ ok: true, isRead: false });
});

// ── Clear all messages in conversation ───────────────────────────────────────
router.post("/conversations/:conversationId/clear", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const conversationId = req.params.conversationId as string;
  const conv = await Conversation.findById(conversationId).catch(() => null);
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  const isMember = conv.isGroup
    ? (conv.memberIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId)
    : (conv.user1Id?.toString() === req.userId || conv.user2Id?.toString() === req.userId);
  if (!isMember) { res.status(403).json({ error: "Not a participant" }); return; }

  await Message.deleteMany({ conversationId: conv._id });
  await Conversation.findByIdAndUpdate(conv._id, { lastActivityAt: new Date() });

  const io = getIo(req);
  if (io) {
    io.to(`conversation:${conversationId}`).emit("conversation_cleared", { conversationId });
  }
  res.json({ ok: true, message: "Chat messages cleared successfully" });
});

// ── Delete entire conversation ───────────────────────────────────────────────
router.delete("/conversations/:conversationId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const conversationId = req.params.conversationId as string;
  const conv = await Conversation.findById(conversationId).catch(() => null);
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  const isMember = conv.isGroup
    ? (conv.memberIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId)
    : (conv.user1Id?.toString() === req.userId || conv.user2Id?.toString() === req.userId);
  if (!isMember) { res.status(403).json({ error: "Not a participant" }); return; }

  // Delete all messages and the conversation doc
  await Message.deleteMany({ conversationId: conv._id });
  await Conversation.findByIdAndDelete(conv._id);

  const io = getIo(req);
  if (io) {
    io.to(`conversation:${conversationId}`).emit("conversation_deleted", { conversationId });
    if (!conv.isGroup) {
      const otherId = conv.user1Id?.toString() === req.userId ? conv.user2Id?.toString() : conv.user1Id?.toString();
      if (otherId) io.to(`user:${otherId}`).emit("conversation_deleted", { conversationId });
    }
  }
  res.json({ ok: true, message: "Conversation deleted successfully" });
});

// ── Mark all conversations as read ──────────────────────────────────────────
router.post("/conversations/read-all", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const meOid = new mongoose.Types.ObjectId(req.userId!);
  // 1:1 messages
  const directConvs = await Conversation.find({
    $or: [{ user1Id: req.userId }, { user2Id: req.userId }],
    isGroup: { $ne: true },
  }).select("_id");
  const directConvIds = directConvs.map(c => c._id);
  if (directConvIds.length > 0) {
    await Message.updateMany(
      { conversationId: { $in: directConvIds }, senderId: { $ne: req.userId }, isRead: false },
      { isRead: true, updatedAt: new Date() }
    );
  }
  // Group messages
  const groupConvs = await Conversation.find({ isGroup: true, memberIds: req.userId }).select("_id");
  const groupConvIds = groupConvs.map(c => c._id);
  if (groupConvIds.length > 0) {
    await Message.updateMany(
      { conversationId: { $in: groupConvIds }, senderId: { $ne: meOid }, isDeleted: false },
      { $addToSet: { readBy: meOid } }
    );
  }
  res.json({ ok: true, message: "All conversations marked as read" });
});

// ── Pin / Unpin conversation ────────────────────────────────────────────────
router.patch("/conversations/:conversationId/pin", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const conv = await Conversation.findById(req.params.conversationId).catch(() => null);
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  const isParticipant = conv.isGroup
    ? (conv.memberIds ?? []).some((id: any) => id.toString() === req.userId)
    : (conv.user1Id?.toString() === req.userId || conv.user2Id?.toString() === req.userId);
  if (!isParticipant) { res.status(403).json({ error: "Not a participant" }); return; }

  const meId = new mongoose.Types.ObjectId(req.userId!);
  const isPinned = (conv.isPinnedBy ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
  if (isPinned) {
    await Conversation.findByIdAndUpdate(conv._id, { $pull: { isPinnedBy: meId } });
  } else {
    await Conversation.findByIdAndUpdate(conv._id, { $addToSet: { isPinnedBy: meId } });
  }
  res.json({ ok: true, isPinned: !isPinned });
});

// ── Change conversation theme ────────────────────────────────────────────────
router.patch("/conversations/:conversationId/theme", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { theme } = req.body as { theme?: string };
  const conv = await Conversation.findById(req.params.conversationId).catch(() => null);
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  const isParticipant = conv.isGroup
    ? (conv.memberIds ?? []).some((id: any) => id.toString() === req.userId)
    : (conv.user1Id?.toString() === req.userId || conv.user2Id?.toString() === req.userId);
  if (!isParticipant) { res.status(403).json({ error: "Not a participant" }); return; }

  const validThemes = ["default", "violet", "sunset", "emerald", "midnight", "cyberpunk", "rosegold", "ocean"];
  const chosenTheme = validThemes.includes(theme ?? "") ? theme : "default";

  await Conversation.findByIdAndUpdate(conv._id, { theme: chosenTheme });
  const io = getIo(req);
  if (io) {
    io.to(`conversation:${conv._id}`).emit("conversation_theme_changed", {
      conversationId: conv._id.toString(),
      theme: chosenTheme,
    });
  }
  res.json({ ok: true, theme: chosenTheme });
});

router.patch("/conversations/:conversationId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { action } = req.body as { action: string };
  const conv = await Conversation.findById(req.params.conversationId).catch(() => null);
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  // IDOR guard: only participants may mutate their own conversation state
  const isParticipant = conv.isGroup
    ? (conv.memberIds ?? []).some((id: any) => id.toString() === req.userId)
    : (conv.user1Id?.toString() === req.userId || conv.user2Id?.toString() === req.userId);
  if (!isParticipant) {
    res.status(403).json({ error: "Not a participant" }); return;
  }
  const meId = new mongoose.Types.ObjectId(req.userId!);
  if (action === "archive") {
    await Conversation.findByIdAndUpdate(conv._id, { $addToSet: { isArchivedBy: meId } });
  } else if (action === "unarchive") {
    await Conversation.findByIdAndUpdate(conv._id, { $pull: { isArchivedBy: { $in: [meId, req.userId] } } });
  } else if (action === "mute") {
    await Conversation.findByIdAndUpdate(conv._id, { $addToSet: { isMutedBy: meId } });
    if (!conv.isGroup) {
      const otherId = conv.user1Id?.toString() === req.userId ? conv.user2Id : conv.user1Id;
      if (otherId) {
        const otherObjId = new mongoose.Types.ObjectId(otherId);
        await User.findByIdAndUpdate(req.userId, { $addToSet: { mutedUsers: otherObjId } });
      }
    }
  } else if (action === "unmute") {
    await Conversation.findByIdAndUpdate(conv._id, { $pull: { isMutedBy: { $in: [meId, req.userId] } } });
    if (!conv.isGroup) {
      const otherId = conv.user1Id?.toString() === req.userId ? conv.user2Id : conv.user1Id;
      if (otherId) {
        const otherObjId = new mongoose.Types.ObjectId(otherId);
        await User.findByIdAndUpdate(req.userId, {
          $pull: { mutedUsers: { $in: [otherObjId, otherId.toString()] } }
        });
      }
    }
  }
  res.json({ ok: true, action });
});

// ── Block / Unblock ──────────────────────────────────────────────────────────
router.post("/conversations/:conversationId/block", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const conv = await Conversation.findById(req.params.conversationId).catch(() => null);
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  if (conv.isGroup) {
    res.status(400).json({ error: "Cannot block a group conversation. You can leave the group or block individual users." });
    return;
  }
  if (conv.user1Id?.toString() !== req.userId && conv.user2Id?.toString() !== req.userId) {
    res.status(403).json({ error: "Not a participant" }); return;
  }
  const otherId = conv.user1Id?.toString() === req.userId ? conv.user2Id : conv.user1Id;
  if (!otherId) { res.status(400).json({ error: "Invalid conversation participants" }); return; }
  const meId = new mongoose.Types.ObjectId(req.userId!);
  const otherObjId = new mongoose.Types.ObjectId(otherId);
  await User.findByIdAndUpdate(req.userId, { $addToSet: { blockedUsers: otherObjId } });
  await User.findByIdAndUpdate(req.userId, { $pull: { following: otherObjId, followers: otherObjId } });
  await User.findByIdAndUpdate(otherObjId, { $pull: { following: meId, followers: meId } });
  const io = getIo(req);
  if (io) {
    io.to(`conversation:${conv._id}`).emit("block_changed", {
      conversationId: conv._id.toString(),
      blockerId: req.userId,
      isBlocked: true,
    });
  }
  res.json({ ok: true, isBlocked: true });
});

router.post("/conversations/:conversationId/unblock", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const conv = await Conversation.findById(req.params.conversationId).catch(() => null);
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  if (conv.isGroup) {
    res.status(400).json({ error: "Cannot block/unblock a group conversation." });
    return;
  }
  if (conv.user1Id?.toString() !== req.userId && conv.user2Id?.toString() !== req.userId) {
    res.status(403).json({ error: "Not a participant" }); return;
  }
  const otherId = conv.user1Id?.toString() === req.userId ? conv.user2Id : conv.user1Id;
  if (!otherId) { res.status(400).json({ error: "Invalid conversation participants" }); return; }
  const otherObjId = new mongoose.Types.ObjectId(otherId);
  await User.findByIdAndUpdate(req.userId, {
    $pull: { blockedUsers: { $in: [otherObjId, otherId.toString()] } }
  });
  const io = getIo(req);
  if (io) {
    io.to(`conversation:${conv._id}`).emit("block_changed", {
      conversationId: conv._id.toString(),
      blockerId: req.userId,
      isBlocked: false,
    });
  }
  res.json({ ok: true, isBlocked: false });
});

// ── Timeout (restrict user from messaging for a period) ───────────────────────
router.post("/conversations/:conversationId/timeout", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { duration } = req.body as { duration?: string | null }; // "15m"|"1h"|"24h"|"7d"|null
  const conv = await Conversation.findById(req.params.conversationId).catch(() => null);
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  if (conv.isGroup) {
    res.status(400).json({ error: "Timeout is only supported in direct conversations." });
    return;
  }
  if (conv.user1Id?.toString() !== req.userId && conv.user2Id?.toString() !== req.userId) {
    res.status(403).json({ error: "Not a participant" }); return;
  }
  const otherId = conv.user1Id?.toString() === req.userId ? conv.user2Id : conv.user1Id;
  if (!otherId) { res.status(400).json({ error: "Invalid conversation participants" }); return; }
  // Remove any existing timeout for the other user first
  await Conversation.findByIdAndUpdate(conv._id, { $pull: { timeoutEntries: { userId: otherId } } });
  if (!duration) {
    const io0 = getIo(req);
    if (io0) {
      io0.to(`conversation:${conv._id}`).emit("timeout_changed", {
        conversationId: conv._id.toString(),
        restrictedUserId: otherId.toString(),
        until: null,
      });
    }
    res.json({ ok: true, until: null }); return;
  }
  const durationMap: Record<string, number> = { "15m": 15, "1h": 60, "24h": 1440, "7d": 10080 };
  const minutes = durationMap[duration];
  if (!minutes) { res.status(400).json({ error: "Invalid duration. Use 15m, 1h, 24h, or 7d" }); return; }
  const until = new Date(Date.now() + minutes * 60 * 1000);
  await Conversation.findByIdAndUpdate(conv._id, { $push: { timeoutEntries: { userId: otherId, until } } });
  const io = getIo(req);
  if (io) {
    io.to(`conversation:${conv._id}`).emit("timeout_changed", {
      conversationId: conv._id.toString(),
      restrictedUserId: otherId.toString(),
      until: until.toISOString(),
    });
  }
  res.json({ ok: true, until: until.toISOString() });
});

// ── Disappearing messages toggle ────────────────────────────────────────────
router.patch("/conversations/:conversationId/disappear", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { disappearAfter } = req.body as { disappearAfter?: string | null };
  const valid = [null, "1h", "24h", "7d"];
  if (!valid.includes(disappearAfter ?? null)) { res.status(400).json({ error: "Invalid disappearAfter value" }); return; }
  const conv = await Conversation.findById(req.params.conversationId).catch(() => null);
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  
  const isParticipant = conv.isGroup
    ? (conv.memberIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId)
    : (conv.user1Id?.toString() === req.userId || conv.user2Id?.toString() === req.userId);

  if (!isParticipant) {
    res.status(403).json({ error: "Not a participant" }); return;
  }
  await Conversation.findByIdAndUpdate(conv._id, { disappearAfter: disappearAfter ?? null });
  const io = getIo(req);
  if (io) {
    io.to(`conversation:${conv._id}`).emit("disappear_changed", {
      conversationId: conv._id.toString(),
      disappearAfter: disappearAfter ?? null,
    });
  }
  res.json({ ok: true, disappearAfter: disappearAfter ?? null });
});

router.get("/conversations/:conversationId/messages", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const conversationId = req.params.conversationId as string;
  if (!(await assertParticipant(conversationId, req.userId!))) {
    res.status(403).json({ error: "Not a participant" }); return;
  }
  const limit = Math.min(parseInt(String(req.query.limit ?? "40"), 10), 100);
  const before = req.query.before ? new mongoose.Types.ObjectId(String(req.query.before)) : undefined;
  const after = req.query.after ? new mongoose.Types.ObjectId(String(req.query.after)) : undefined;
  const filter: any = { conversationId };
  if (before) filter._id = { $lt: before };
  if (after) filter._id = { ...(filter._id ?? {}), $gt: after };
  // Apply disappearing filter
  const conv = await Conversation.findById(conversationId).catch(() => null);
  if (conv?.disappearAfter) {
    const cutoff = disappearFilter(conv.disappearAfter);
    if (cutoff) filter.createdAt = { $gt: cutoff };
  }
  const msgs = await Message.find(filter).sort({ createdAt: -1 }).limit(limit);
  const replyIds = msgs.map(m => m.replyToId).filter(Boolean);
  const pollIds = msgs.map(m => m.pollId).filter(Boolean);
  const gameIds = msgs.map(m => m.gameId).filter(Boolean);

  const [replyMsgs, pollDocs, gameDocs, latestWhiteboard] = await Promise.all([
    replyIds.length ? Message.find({ _id: { $in: replyIds } }) : [],
    pollIds.length ? Poll.find({ _id: { $in: pollIds } }) : [],
    gameIds.length ? GameSession.find({ _id: { $in: gameIds } }) : [],
    Whiteboard.findOne({ conversationId, status: { $ne: "deleted" } }).sort({ createdAt: -1 }),
  ]);

  const replyMap = new Map<string, any>(replyMsgs.map(m => [m._id.toString(), m] as [string, any]));
  const pollMap = new Map<string, any>(pollDocs.map(p => [p._id.toString(), p] as [string, any]));
  const gameMap = new Map<string, any>(gameDocs.map(g => [g._id.toString(), g] as [string, any]));

  // Ensure any whiteboard message without whiteboardId is populated with the active session
  for (const m of msgs) {
    if ((m.messageType === "whiteboard" || m.text === "Created a shared whiteboard" || (typeof m.text === "string" && m.text.startsWith("Created a shared whiteboard"))) && !m.whiteboardId && latestWhiteboard) {
      m.whiteboardId = latestWhiteboard._id;
    }
  }

  // Filter out selectiveVisibility messages hidden from this user
  const visibleMsgs = msgs.filter(m => {
    if (!m.selectiveVisibility || m.selectiveVisibility.mode === "all") return true;
    if (m.senderId.toString() === req.userId) return true;
    if (m.selectiveVisibility.mode === "allow_list") {
      return (m.selectiveVisibility.allowedUserIds || []).some((id: any) => id.toString() === req.userId);
    }
    if (m.selectiveVisibility.mode === "deny_list") {
      return !(m.selectiveVisibility.deniedUserIds || []).some((id: any) => id.toString() === req.userId);
    }
    return true;
  });

  const serialized = visibleMsgs.reverse().map(m =>
    serializeMessage(
      m,
      replyMap.get(m.replyToId?.toString() ?? "") ?? null,
      pollMap.get(m.pollId?.toString() ?? "") ?? null,
      gameMap.get(m.gameId?.toString() ?? "") ?? null,
      req.userId
    )
  );

  res.json({ messages: serialized, hasMore: msgs.length === limit });
});

router.post("/conversations/:conversationId/messages", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const conversationId = req.params.conversationId as string;
  const conv = await Conversation.findById(conversationId).catch(() => null);
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  const {
    text, mediaUrl, mediaType, fileName, clientId, replyToId, isSnap, viewOnce, maxViews, replyToNoteId, replyToNote,
    replyToStory,
    messageType, postId, reelId, sharedPost, sharedReel, spotifyTrack, callLog, gifInfo, stickerInfo, locationInfo,
    whiteboardId,
    puzzle, permissionGated, selectiveVisibility, coWrite,
  } = req.body as any;

  let resolvedNoteContext: any = replyToNote || null;
  if (!resolvedNoteContext && replyToNoteId) {
    const noteObj = await Note.findById(replyToNoteId).catch(() => null);
    if (noteObj) {
      const noteAuthor = await User.findById(noteObj.userId);
      resolvedNoteContext = {
        noteId: noteObj._id,
        text: noteObj.text || null,
        emoji: noteObj.emoji || null,
        gifUrl: noteObj.gifUrl || null,
        sticker: noteObj.sticker || null,
        voiceUrl: noteObj.voiceUrl || null,
        voiceDuration: noteObj.voiceDuration || null,
        imageUrl: noteObj.imageUrl || null,
        spotifyTrack: noteObj.spotifyTrack || null,
        location: noteObj.location ? {
          name: noteObj.location.name,
          lat: noteObj.location.lat,
          lng: noteObj.location.lng,
        } : null,
        theme: noteObj.theme || "default",
        authorUsername: noteAuthor?.username || null,
        isExpired: new Date() >= new Date(noteObj.expiresAt),
      };
    }
  }

  let resolvedSharedPost = sharedPost || null;
  let resolvedSharedReel = sharedReel || null;

  if (postId && !resolvedSharedPost) {
    const postObj = await Post.findById(postId).catch(() => null);
    if (postObj) {
      const creator = await User.findById(postObj.userId);
      resolvedSharedPost = {
        id: postObj._id.toString(),
        mediaUrl: postObj.mediaUrls?.[0] || postObj.mediaUrl || null,
        mediaType: postObj.mediaType || "image",
        caption: postObj.caption || "",
        creatorUsername: creator?.username || "user",
        creatorAvatar: creator?.avatarUrl || null,
      };
    }
  }

  if (reelId && !resolvedSharedReel) {
    const reelObj = await Post.findById(reelId).catch(() => null);
    if (reelObj) {
      const creator = await User.findById(reelObj.userId);
      resolvedSharedReel = {
        id: reelObj._id.toString(),
        videoUrl: reelObj.mediaUrls?.[0] || reelObj.mediaUrl || null,
        thumbnailUrl: reelObj.thumbnailUrl || reelObj.mediaUrls?.[0] || null,
        caption: reelObj.caption || "",
        creatorUsername: creator?.username || "user",
        creatorAvatar: creator?.avatarUrl || null,
      };
    }
  }

  // ── Advanced Message Payload Processing ──
  let processedPuzzle: any = null;
  let processedPermissionGated: any = null;
  let processedSelectiveVisibility: any = null;
  let processedCoWrite: any = null;
  let effectiveText = text;

  if (messageType === "puzzle" && puzzle) {
    const rawAnswer = Array.isArray(puzzle.answer) ? puzzle.answer.join(",") : String(puzzle.answer || "");
    const solutionHash = hashSolution(rawAnswer);
    const encryptedPayload = encryptPayload(text || "");
    effectiveText = null; // Encrypted text stored securely

    processedPuzzle = {
      type: puzzle.type || "secret_question",
      question: puzzle.question || "Can you solve this puzzle?",
      hint: puzzle.hint || null,
      solutionHash,
      encryptedPayload,
      maxAttempts: puzzle.maxAttempts !== undefined ? Number(puzzle.maxAttempts) : 3,
      attemptsUsed: 0,
      expiresAt: puzzle.expiresAt ? new Date(puzzle.expiresAt) : null,
      revealPolicy: puzzle.revealPolicy || "permanent",
      memoryCards: puzzle.memoryCards || [],
      failedUserAttempts: [],
    };
  } else if (messageType === "permission_gated" && permissionGated) {
    const encryptedPayload = encryptPayload(text || "");
    effectiveText = null; // Encrypted text stored securely

    processedPermissionGated = {
      encryptedPayload,
      previewNote: permissionGated.previewNote || null,
      allowReopening: permissionGated.allowReopening ?? true,
      expiresAt: permissionGated.expiresAt ? new Date(permissionGated.expiresAt) : null,
      grants: [],
    };
  } else if (messageType === "co_write" && coWrite) {
    processedCoWrite = {
      draftId: coWrite.draftId ? new mongoose.Types.ObjectId(coWrite.draftId) : null,
      authorIds: (coWrite.authorIds || []).map((id: any) => new mongoose.Types.ObjectId(id)),
      authorUsernames: coWrite.authorUsernames || [],
    };
  }

  if (selectiveVisibility && conv.isGroup && selectiveVisibility.mode && selectiveVisibility.mode !== "all") {
    processedSelectiveVisibility = {
      mode: selectiveVisibility.mode,
      allowedUserIds: (selectiveVisibility.allowedUserIds || []).map((id: any) => new mongoose.Types.ObjectId(id)),
      deniedUserIds: (selectiveVisibility.deniedUserIds || []).map((id: any) => new mongoose.Types.ObjectId(id)),
      isSilent: selectiveVisibility.isSilent ?? true,
      updatedAt: new Date(),
    };
  }

  const extraPayload = {
    messageType: messageType || (whiteboardId ? "whiteboard" : postId ? "post" : reelId ? "reel" : spotifyTrack ? "music" : gifInfo ? "gif" : stickerInfo ? "sticker" : callLog ? "call" : locationInfo ? "location" : mediaUrl ? (mediaType?.startsWith("audio") ? "voice" : "image") : "text"),
    whiteboardId: whiteboardId ? new mongoose.Types.ObjectId(String(whiteboardId)) : null,
    postId: postId ?? null,
    reelId: reelId ?? null,
    sharedPost: resolvedSharedPost,
    sharedReel: resolvedSharedReel,
    spotifyTrack: spotifyTrack ?? null,
    callLog: callLog ?? null,
    gifInfo: gifInfo ?? null,
    stickerInfo: stickerInfo ?? null,
    locationInfo: locationInfo ?? null,
    replyToStory: replyToStory ?? null,
    puzzle: processedPuzzle,
    permissionGated: processedPermissionGated,
    selectiveVisibility: processedSelectiveVisibility,
    coWrite: processedCoWrite,
  };

  // ── Group conversation checks ─────────────────────────────────────────────
  if (conv.isGroup) {
    if (conv.isDisabled) {
      res.status(403).json({ error: conv.disabledReason || "This group has been suspended by administration." });
      return;
    }
    const isBanned = (conv.bannedUserIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
    if (isBanned) {
      res.status(403).json({ error: "You have been banned from this group." });
      return;
    }
    const isMember = (conv.memberIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
    if (!isMember) { res.status(403).json({ error: "Not a group member" }); return; }
    if (conv.onlyAdminsCanSend) {
      const isAdmin = (conv.adminIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
      if (!isAdmin) { res.status(403).json({ error: "Only admins can send messages in this group" }); return; }
    }
    if (clientId) {
      const existing = await Message.findOne({ conversationId, clientId });
      if (existing) { res.status(200).json(serializeMessage(existing, null, null, null, req.userId)); return; }
    }
    const msg = await Message.create({ conversationId, senderId: req.userId, text: effectiveText, mediaUrl, mediaType, fileName: fileName ?? null, replyToId: replyToId ?? null, clientId: clientId ?? null, ...extraPayload });
    await Conversation.findByIdAndUpdate(conversationId, { lastActivityAt: new Date() });

    // Determine target recipient IDs with selective visibility enforcement
    let targetRecipientIds = (conv.memberIds ?? []).filter((id: mongoose.Types.ObjectId) => id.toString() !== req.userId);
    if (processedSelectiveVisibility && processedSelectiveVisibility.mode !== "all") {
      if (processedSelectiveVisibility.mode === "allow_list") {
        const allowedStrs = (processedSelectiveVisibility.allowedUserIds || []).map((id: any) => id.toString());
        targetRecipientIds = targetRecipientIds.filter(id => allowedStrs.includes(id.toString()));
      } else if (processedSelectiveVisibility.mode === "deny_list") {
        const deniedStrs = (processedSelectiveVisibility.deniedUserIds || []).map((id: any) => id.toString());
        targetRecipientIds = targetRecipientIds.filter(id => !deniedStrs.includes(id.toString()));
      }
    }

    // Notify only allowed members (no leakage to excluded users)
    await Promise.all(targetRecipientIds.map((id: mongoose.Types.ObjectId) =>
      Notification.create({
        userId: id,
        actorId: req.userId,
        type: "message",
        commentText: messageType === "puzzle" ? "sent a puzzle message 🔒" : messageType === "permission_gated" ? "sent a protected message 🔐" : undefined,
      }).catch(() => {})
    ));
    for (const id of targetRecipientIds) {
      notifyUserPush(id.toString(), req.userId!, "message").catch(() => {});
    }

    let replyMsg = null;
    if (replyToId) replyMsg = await Message.findById(replyToId).catch(() => null);
    const senderMsgData = serializeMessage(msg, replyMsg, null, null, req.userId);

    const io = getIo(req);
    if (io) {
      if (processedSelectiveVisibility && processedSelectiveVisibility.mode !== "all") {
        // Selective visibility: emit strictly to allowed users and sender
        io.to(`user:${req.userId}`).emit("new_message", senderMsgData);
        for (const rid of targetRecipientIds) {
          const recipientMsgData = serializeMessage(msg, replyMsg, null, null, rid.toString());
          io.to(`user:${rid.toString()}`).emit("new_message", recipientMsgData);
        }
      } else {
        // Normal broadcast
        io.to(`conversation:${conversationId}`).emit("new_message", senderMsgData);
        for (const rid of targetRecipientIds) {
          const recipientMsgData = serializeMessage(msg, replyMsg, null, null, rid.toString());
          io.to(`user:${rid.toString()}`).emit("new_message", recipientMsgData);
        }
      }
    }
    res.status(201).json(senderMsgData);
    return;
  }

  // ── 1:1 conversation checks ───────────────────────────────────────────────
  if (conv.user1Id?.toString() !== req.userId && conv.user2Id?.toString() !== req.userId) {
    res.status(403).json({ error: "Not a participant" }); return;
  }
  const recipientId = conv.user1Id?.toString() === req.userId ? conv.user2Id : conv.user1Id;
  const [meUser, recipientUser] = await Promise.all([User.findById(req.userId), User.findById(recipientId)]);
  const iBlocked = (meUser?.blockedUsers ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === recipientId?.toString());
  const theyBlocked = (recipientUser?.blockedUsers ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
  if (iBlocked || theyBlocked) { res.status(403).json({ error: "blocked" }); return; }

  // Enforce recipient's whoCanMessage privacy setting
  const whoCanMessage = recipientUser?.privacySettings?.whoCanMessage || "everyone";
  if (whoCanMessage === "none" || whoCanMessage === "no_one") {
    res.status(403).json({ error: "This user does not accept direct messages." });
    return;
  }
  if (whoCanMessage === "following") {
    // Check if recipient follows the sender
    const recipientFollowsMe = (recipientUser?.following ?? []).some(
      (id: mongoose.Types.ObjectId) => id.toString() === req.userId
    );
    if (!recipientFollowsMe) {
      res.status(403).json({ error: "Only accounts followed by this user can send them messages." });
      return;
    }
  }

  const now = new Date();
  const myTimeout = (conv.timeoutEntries ?? []).find((e: any) => e.userId.toString() === req.userId && new Date(e.until) > now);
  if (myTimeout) { res.status(403).json({ error: "restricted", until: new Date(myTimeout.until).toISOString() }); return; }

  if (clientId) {
    const existing = await Message.findOne({ conversationId, clientId });
    if (existing) { res.status(200).json(serializeMessage(existing, null, null, null, req.userId)); return; }
  }
  const snapFields = isSnap ? { isSnap: true, viewOnce: viewOnce ?? false, viewsLeft: maxViews ?? null, viewedBy: [] } : {};
  const msg = await Message.create({
    conversationId,
    senderId: req.userId,
    text: effectiveText,
    mediaUrl,
    mediaType,
    fileName: fileName ?? null,
    replyToId: replyToId ?? null,
    replyToNote: resolvedNoteContext,
    clientId: clientId ?? null,
    ...extraPayload,
    ...snapFields,
  });
  await Conversation.findByIdAndUpdate(conversationId, { lastActivityAt: new Date() });
  if (resolvedNoteContext) {
    await Notification.create({
      userId: recipientId,
      actorId: req.userId,
      type: "note_reply",
      commentText: text,
      noteId: resolvedNoteContext.noteId ?? null,
      noteText: resolvedNoteContext.text || "Note",
      conversationId: conv._id,
    });
  } else if (replyToStory) {
    await Notification.create({
      userId: recipientId,
      actorId: req.userId,
      type: "story_reply",
      commentText: text,
      storyId: replyToStory.storyId ?? null,
      conversationId: conv._id,
    });
  } else {
    await Notification.create({
      userId: recipientId,
      actorId: req.userId,
      type: "message",
      commentText: messageType === "puzzle" ? "sent a puzzle message 🔒" : messageType === "permission_gated" ? "sent a protected message 🔐" : undefined,
    });
  }
  notifyUserPush(recipientId!.toString(), req.userId!, "message").catch(() => {});
  let replyMsg = null;
  if (replyToId) replyMsg = await Message.findById(replyToId);
  const senderMsgData = serializeMessage(msg, replyMsg, null, null, req.userId);
  const recipientMsgData = serializeMessage(msg, replyMsg, null, null, recipientId!.toString());
  const io = getIo(req);
  if (io) {
    io.to(`conversation:${conversationId}`).emit("new_message", senderMsgData);
    io.to(`user:${recipientId}`).emit("new_message", recipientMsgData);
  }
  res.status(201).json(senderMsgData);
});

// ── Forward message ──────────────────────────────────────────────────────────
router.post("/messages/:messageId/forward", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { conversationId } = req.body as { conversationId: string };
  if (!conversationId) { res.status(400).json({ error: "conversationId required" }); return; }
  const originalMsg = await Message.findById(req.params.messageId).catch(() => null);
  if (!originalMsg || originalMsg.isDeleted) { res.status(404).json({ error: "Message not found" }); return; }
  // Verify requester is a participant in the source conversation
  if (!(await assertParticipant(originalMsg.conversationId.toString(), req.userId!))) {
    res.status(403).json({ error: "Not a participant" }); return;
  }
  const targetConv = await Conversation.findById(conversationId).catch(() => null);
  if (!targetConv) { res.status(404).json({ error: "Conversation not found" }); return; }
  
  // Verify requester is a participant in the target conversation
  const isTargetParticipant = targetConv.isGroup
    ? (targetConv.memberIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId)
    : (targetConv.user1Id?.toString() === req.userId || targetConv.user2Id?.toString() === req.userId);

  if (!isTargetParticipant) {
    res.status(403).json({ error: "Not a participant in target conversation" }); return;
  }

  // ── Block check (target conversation if direct chat) ───────────────────────────────────
  let fwdRecipientId: mongoose.Types.ObjectId | undefined;
  if (!targetConv.isGroup && targetConv.user1Id && targetConv.user2Id) {
    fwdRecipientId = targetConv.user1Id.toString() === req.userId ? targetConv.user2Id : targetConv.user1Id;
    const [fwdMeUser, fwdRecipientUser] = await Promise.all([User.findById(req.userId), User.findById(fwdRecipientId)]);
    const fwdIBlocked = (fwdMeUser?.blockedUsers ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === fwdRecipientId!.toString());
    const fwdTheyBlocked = (fwdRecipientUser?.blockedUsers ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
    if (fwdIBlocked || fwdTheyBlocked) { res.status(403).json({ error: "blocked" }); return; }
  }

  // ── Timeout check (target conversation) ─────────────────────────────────
  const fwdNow = new Date();
  const fwdMyTimeout = (targetConv.timeoutEntries ?? []).find((e: any) => e.userId.toString() === req.userId && new Date(e.until) > fwdNow);
  if (fwdMyTimeout) { res.status(403).json({ error: "restricted", until: new Date(fwdMyTimeout.until).toISOString() }); return; }
  
  const clientId = `fwd-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const newMsg = await Message.create({
    conversationId,
    senderId: req.userId,
    text: originalMsg.text,
    mediaUrl: originalMsg.mediaUrl,
    mediaType: originalMsg.mediaType,
    isForwarded: true,
    clientId,
  });
  await Conversation.findByIdAndUpdate(conversationId, { lastActivityAt: new Date() });

  if (fwdRecipientId) {
    await Notification.create({ userId: fwdRecipientId, actorId: req.userId, type: "message" });
    notifyUserPush(fwdRecipientId.toString(), req.userId!, "message").catch(() => {});
  }

  const msgData = serializeMessage(newMsg);
  const io = getIo(req);
  if (io) {
    io.to(`conversation:${conversationId}`).emit("new_message", msgData);
    if (fwdRecipientId) {
      io.to(`user:${fwdRecipientId}`).emit("new_message", msgData);
    }
  }
  res.status(201).json(msgData);
});

router.patch("/messages/:messageId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { text } = req.body as { text: string };
  if (!text?.trim()) { res.status(400).json({ error: "Text required" }); return; }
  if (text.length > 4000) { res.status(400).json({ error: "Message too long" }); return; }
  const msg = await Message.findById(req.params.messageId).catch(() => null);
  if (!msg) { res.status(404).json({ error: "Not found" }); return; }
  if (msg.senderId.toString() !== req.userId) { res.status(403).json({ error: "Not your message" }); return; }
  if (msg.isDeleted) { res.status(400).json({ error: "Deleted message" }); return; }
  const updated = await Message.findByIdAndUpdate(msg._id, { text: text.trim(), isEdited: true, updatedAt: new Date() }, { new: true });
  const msgData = serializeMessage(updated);
  const io = getIo(req);
  if (io) io.to(`conversation:${msg.conversationId}`).emit("message_edited", msgData);
  res.json(msgData);
});

router.delete("/messages/:messageId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const msg = await Message.findById(req.params.messageId).catch(() => null);
  if (!msg) { res.status(404).json({ error: "Not found" }); return; }
  if (msg.senderId.toString() !== req.userId) { res.status(403).json({ error: "Not your message" }); return; }
  const updated = await Message.findByIdAndUpdate(msg._id, { isDeleted: true, text: null, mediaUrl: null, updatedAt: new Date() }, { new: true });
  const msgData = serializeMessage(updated);
  const io = getIo(req);
  if (io) io.to(`conversation:${msg.conversationId}`).emit("message_deleted", msgData);
  res.json(msgData);
});

router.post("/messages/:messageId/react", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { emoji } = req.body as { emoji: string };
  const ALLOWED = ["❤️", "👍", "😂", "🔥", "😮", "😢", "👎", "🎉"];
  if (!emoji || !ALLOWED.includes(emoji)) { res.status(400).json({ error: "Invalid emoji" }); return; }
  const msg = await Message.findById(req.params.messageId).catch(() => null);
  if (!msg || msg.isDeleted) { res.status(404).json({ error: "Not found" }); return; }
  const meId = new mongoose.Types.ObjectId(req.userId!);
  const reactions: Map<string, mongoose.Types.ObjectId[]> = msg.reactions instanceof Map ? msg.reactions : new Map(Object.entries(msg.reactions ?? {}));
  const users = reactions.get(emoji) ?? [];
  const hasReacted = users.some(id => id.toString() === req.userId);
  if (hasReacted) {
    const filtered = users.filter(id => id.toString() !== req.userId);
    if (filtered.length === 0) reactions.delete(emoji);
    else reactions.set(emoji, filtered);
  } else {
    reactions.set(emoji, [...users, meId]);
  }
  const updated = await Message.findByIdAndUpdate(msg._id, { reactions, updatedAt: new Date() }, { new: true });
  const msgData = serializeMessage(updated);
  const io = getIo(req);
  if (io) io.to(`conversation:${msg.conversationId}`).emit("message_reaction", msgData);
  res.json(msgData);
});

router.post("/messages/:messageId/pin", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const msg = await Message.findById(req.params.messageId).catch(() => null);
  if (!msg) { res.status(404).json({ error: "Not found" }); return; }
  const updated = await Message.findByIdAndUpdate(msg._id, { isPinned: !msg.isPinned }, { new: true });
  const msgData = serializeMessage(updated);
  const io = getIo(req);
  if (io) io.to(`conversation:${msg.conversationId}`).emit("message_pinned", msgData);
  res.json(msgData);
});

router.post("/messages/:messageId/star", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const meId = new mongoose.Types.ObjectId(req.userId!);
  const msg = await Message.findById(req.params.messageId).catch(() => null);
  if (!msg) { res.status(404).json({ error: "Not found" }); return; }
  const isStarred = (msg.starredBy ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
  const updated = isStarred
    ? await Message.findByIdAndUpdate(msg._id, { $pull: { starredBy: meId } }, { new: true })
    : await Message.findByIdAndUpdate(msg._id, { $addToSet: { starredBy: meId } }, { new: true });
  res.json(serializeMessage(updated));
});

router.get("/conversations/:conversationId/pinned", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const msgs = await Message.find({ conversationId: req.params.conversationId, isPinned: true, isDeleted: false }).sort({ createdAt: -1 });
  res.json(msgs.map(m => serializeMessage(m)));
});

router.get("/conversations/:conversationId/starred", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const msgs = await Message.find({ conversationId: req.params.conversationId, isDeleted: false, starredBy: req.userId }).sort({ createdAt: -1 });
  res.json(msgs.map(m => serializeMessage(m)));
});

router.get("/conversations/:conversationId/media", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!(await assertParticipant(req.params.conversationId as string, req.userId!))) {
    res.status(403).json({ error: "Not a participant" }); return;
  }
  const msgs = await Message.find({ conversationId: req.params.conversationId, isDeleted: false, mediaUrl: { $ne: null } }).sort({ createdAt: -1 }).limit(50);
  res.json(msgs.map(m => serializeMessage(m)));
});

router.get("/conversations/:conversationId/search", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!(await assertParticipant(req.params.conversationId as string, req.userId!))) {
    res.status(403).json({ error: "Not a participant" }); return;
  }
  const q = String(req.query.q ?? "").trim();
  if (!q || q.length < 2) { res.json([]); return; }
  const msgs = await Message.find({ conversationId: req.params.conversationId, isDeleted: false, text: { $regex: q, $options: "i" } }).sort({ createdAt: -1 }).limit(30);

  // Filter out selective messages hidden from searching user and puzzle/permission locked content
  const visibleMsgs = msgs.filter(m => {
    if (m.selectiveVisibility && m.selectiveVisibility.mode !== "all" && m.senderId.toString() !== req.userId) {
      if (m.selectiveVisibility.mode === "allow_list") {
        if (!(m.selectiveVisibility.allowedUserIds || []).some((id: any) => id.toString() === req.userId)) return false;
      } else if (m.selectiveVisibility.mode === "deny_list") {
        if ((m.selectiveVisibility.deniedUserIds || []).some((id: any) => id.toString() === req.userId)) return false;
      }
    }
    return true;
  });

  res.json(visibleMsgs.map(m => serializeMessage(m, null, null, null, req.userId)));
});

// ── Media uploads ────────────────────────────────────────────────────────────
router.post("/messages/upload", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { data, mimeType } = req.body as { data?: string; mimeType?: string };
  if (!data || !mimeType) { res.status(400).json({ error: "data and mimeType required" }); return; }
  const folder = mimeType.startsWith("audio/") ? "voice_messages" : "messages";
  const result = await uploadBase64(data, mimeType, folder);
  res.json({ url: result.url, publicId: result.publicId, resourceType: result.resourceType });
});

router.post("/messages/upload-voice", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { data, mimeType } = req.body as { data?: string; mimeType?: string };
  if (!data || !mimeType) { res.status(400).json({ error: "data and mimeType required" }); return; }
  const result = await uploadBase64(data, mimeType ?? "audio/webm", "voice_messages");
  res.json({ url: result.url, publicId: result.publicId, resourceType: result.resourceType });
});

router.post("/messages/upload-file", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { data, mimeType } = req.body as { data?: string; mimeType?: string };
  if (!data || !mimeType) { res.status(400).json({ error: "data and mimeType required" }); return; }
  const result = await uploadBase64(data, mimeType, "documents");
  res.json({ url: result.url, publicId: result.publicId, resourceType: result.resourceType });
});

// ── Snap viewed ──────────────────────────────────────────────────────────────
router.post("/messages/:messageId/snap-viewed", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const msg = await Message.findById(req.params.messageId as string).catch(() => null);
  if (!msg || msg.isDeleted) { res.status(404).json({ error: "Message not found" }); return; }
  if (!msg.isSnap) { res.status(400).json({ error: "Not a snap message" }); return; }

  // Verify requester is a participant in the conversation
  const conv = await Conversation.findById(msg.conversationId).catch(() => null);
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  const isParticipant = conv.user1Id.toString() === req.userId || conv.user2Id.toString() === req.userId;
  if (!isParticipant) { res.status(403).json({ error: "Not a participant" }); return; }

  const viewerId = new mongoose.Types.ObjectId(req.userId!);
  const isSender = msg.senderId.toString() === req.userId;
  const alreadyViewed = (msg.viewedBy ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);

  // Sender can always see their own snap
  if (!isSender) {
    // Enforce view limits for recipients
    if (!alreadyViewed) {
      // First time this user opens snap — check if views are exhausted
      if (msg.viewsLeft !== null && msg.viewsLeft <= 0) {
        res.status(403).json({ error: "This snap has expired", viewsLeft: 0 });
        return;
      }
      // Atomically decrement and add to viewedBy
      const update: any = { $addToSet: { viewedBy: viewerId }, isRead: true };
      if (msg.viewsLeft !== null) update.$inc = { viewsLeft: -1 };
      await Message.findByIdAndUpdate(msg._id, update);
    } else {
      // Already viewed by this user — only allow if views still unlimited or > 0 at the message level
      const remainingViews = msg.viewsLeft;
      if (remainingViews !== null && remainingViews <= 0) {
        res.status(403).json({ error: "This snap has expired", viewsLeft: 0 });
        return;
      }
    }
  }

  // Re-fetch updated message to get accurate viewsLeft
  const updated = await Message.findById(msg._id);
  const currentViewsLeft = updated?.viewsLeft ?? null;

  // Return with media URL revealed
  res.json({ ...serializeMessage(updated ?? msg), mediaUrl: msg.mediaUrl ?? null, viewsLeft: currentViewsLeft });
});

export default router;

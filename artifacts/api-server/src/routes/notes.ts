import { Router, type IRouter } from "express";
import { Note, User, Conversation, Message, Notification } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { buildUserSummary } from "./users";
import { uploadBase64 } from "../lib/cloudinary";
import { notifyUserPush } from "../lib/push";
import type { Server as SocketServer } from "socket.io";

const router: IRouter = Router();

const VALID_THEMES = ["default", "green", "blue", "purple", "pink", "orange", "red", "dark"] as const;

function getIo(req: AuthRequest): SocketServer | undefined {
  return (req as any).app.get("io");
}

function noteExpiresAt() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
}

async function formatNote(n: any, currentUserId: string) {
  const author = await User.findById(n.userId);
  return {
    id: n._id.toString(),
    text: n.text || "",
    emoji: n.emoji ?? null,
    gifUrl: n.gifUrl ?? null,
    sticker: n.sticker ?? null,
    voiceUrl: n.voiceUrl ?? null,
    voiceDuration: n.voiceDuration ?? null,
    imageUrl: n.imageUrl ?? null,
    spotifyTrack: n.spotifyTrack ?? null,
    location: n.location ? {
      name: n.location.name,
      lat: n.location.lat,
      lng: n.location.lng,
    } : null,
    audience: n.audience || "followers",
    theme: n.theme || "default",
    expiresAt: n.expiresAt.toISOString(),
    createdAt: n.createdAt ? n.createdAt.toISOString() : undefined,
    isMe: n.userId.toString() === currentUserId,
    author: await buildUserSummary(author, currentUserId),
  };
}

// ── POST /notes/upload — upload media for rich notes ─────────────────────────
router.post("/notes/upload", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { data, mimeType } = req.body as { data?: string; mimeType?: string };
  if (!data || !mimeType) {
    res.status(400).json({ error: "data and mimeType required" });
    return;
  }
  const folder = mimeType.startsWith("audio/") ? "whiterchat/notes/voice" : "whiterchat/notes/media";
  try {
    const result = await uploadBase64(data, mimeType, folder);
    res.json({ url: result.url });
  } catch {
    // Fallback safely to inline data URI if cloud storage is unavailable
    const dataUri = data.startsWith("data:") ? data : `data:${mimeType};base64,${data}`;
    res.json({ url: dataUri });
  }
});

// ── POST /notes — create or replace current rich note ────────────────────────
router.post("/notes", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const {
    text,
    emoji,
    gifUrl,
    sticker,
    voiceUrl,
    voiceDuration,
    imageUrl,
    spotifyTrack,
    location,
    audience,
    theme,
  } = req.body as {
    text?: string;
    emoji?: string;
    gifUrl?: string;
    sticker?: string;
    voiceUrl?: string;
    voiceDuration?: number;
    imageUrl?: string;
    spotifyTrack?: {
      trackId: string;
      title: string;
      artist: string;
      album?: string;
      coverUrl?: string;
      previewUrl?: string;
      spotifyUrl?: string;
    };
    location?: { name: string; lat?: number; lng?: number };
    audience?: "followers" | "close_friends";
    theme?: string;
  };

  const safeTheme = theme && VALID_THEMES.includes(theme as any) ? theme : "default";

  const cleanText = typeof text === "string" ? text.trim() : "";
  const hasContent = cleanText.length > 0 || !!gifUrl || !!sticker || !!voiceUrl || !!imageUrl || !!spotifyTrack?.trackId || !!location?.name;

  if (!hasContent) {
    res.status(400).json({ error: "Note must include text, photo, GIF, sticker, voice, Spotify music, or location" });
    return;
  }

  if (cleanText.length > 100) {
    res.status(400).json({ error: "Note text must be 100 characters or less" });
    return;
  }

  const note = await Note.findOneAndUpdate(
    { userId: req.userId },
    {
      text: cleanText,
      emoji: emoji || null,
      gifUrl: gifUrl || null,
      sticker: sticker || null,
      voiceUrl: voiceUrl || null,
      voiceDuration: typeof voiceDuration === "number" ? voiceDuration : null,
      imageUrl: imageUrl || null,
      spotifyTrack: spotifyTrack?.trackId ? {
        trackId: spotifyTrack.trackId,
        title: spotifyTrack.title,
        artist: spotifyTrack.artist,
        album: spotifyTrack.album || "",
        coverUrl: spotifyTrack.coverUrl || "",
        previewUrl: spotifyTrack.previewUrl || null,
        spotifyUrl: spotifyTrack.spotifyUrl || `https://open.spotify.com/track/${spotifyTrack.trackId}`,
      } : null,
      location: location?.name ? {
        name: location.name.trim(),
        lat: typeof location.lat === "number" ? location.lat : undefined,
        lng: typeof location.lng === "number" ? location.lng : undefined,
      } : null,
      audience: audience === "close_friends" ? "close_friends" : "followers",
      theme: safeTheme,
      expiresAt: noteExpiresAt(),
    },
    { upsert: true, new: true }
  );

  const formatted = await formatNote(note, req.userId!);
  res.status(201).json(formatted);
});

// ── DELETE /notes/me — delete my current note ────────────────────────────────
router.delete("/notes/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  await Note.deleteOne({ userId: req.userId });
  res.json({ ok: true });
});

// ── DELETE /notes/:id — delete note by ID (owner only) ───────────────────────
router.delete("/notes/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const note = await Note.findById(req.params.id);
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  if (note.userId.toString() !== req.userId) {
    res.status(403).json({ error: "Not authorized to delete this note" });
    return;
  }
  await note.deleteOne();
  res.json({ ok: true });
});

// ── GET /notes/feed — my note + notes from followed users ────────────────────
router.get("/notes/feed", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const me = await User.findById(req.userId).select("following");
  if (!me) { res.json([]); return; }

  const visibleIds = [req.userId!, ...(me.following ?? []).map((id: any) => id.toString())];
  const now = new Date();
  const notes = await Note.find({
    userId: { $in: visibleIds },
    expiresAt: { $gt: now },
  }).sort({ updatedAt: -1 });

  const formattedNotes = await Promise.all(
    notes.map(async (n) => {
      // Privacy check for close_friends
      if (n.audience === "close_friends" && n.userId.toString() !== req.userId) {
        const author = await User.findById(n.userId).select("closeFriends");
        const isCloseFriend = (author?.closeFriends ?? []).some((cfId: any) => cfId.toString() === req.userId);
        if (!isCloseFriend) return null;
      }
      return formatNote(n, req.userId!);
    })
  );

  const result = formattedNotes.filter(Boolean);
  // Put my own note first
  result.sort((a, b) => (b!.isMe ? 1 : 0) - (a!.isMe ? 1 : 0));
  res.json(result);
});

// ── GET /notes/user/:username — get active note for a specific profile ────────
router.get("/notes/user/:username", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const targetUser = await User.findOne({ username: req.params.username });
  if (!targetUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const note = await Note.findOne({
    userId: targetUser._id,
    expiresAt: { $gt: new Date() },
  });
  if (!note) {
    res.json({ note: null });
    return;
  }
  if (note.audience === "close_friends" && note.userId.toString() !== req.userId) {
    const isCloseFriend = (targetUser.closeFriends ?? []).some((cfId: any) => cfId.toString() === req.userId);
    if (!isCloseFriend) {
      res.json({ note: null });
      return;
    }
  }
  const formatted = await formatNote(note, req.userId!);
  res.json({ note: formatted });
});

// ── GET /notes/:id — get a single note by ID with permission check ───────────
router.get("/notes/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const note = await Note.findById(req.params.id);
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  const isExpired = new Date() >= new Date(note.expiresAt);
  if (note.audience === "close_friends" && note.userId.toString() !== req.userId) {
    const author = await User.findById(note.userId).select("closeFriends");
    const isCloseFriend = (author?.closeFriends ?? []).some((cfId: any) => cfId.toString() === req.userId);
    if (!isCloseFriend) {
      res.status(403).json({ error: "Not authorized to view this note" });
      return;
    }
  }
  const formatted = await formatNote(note, req.userId!);
  res.json({ note: { ...formatted, isExpired } });
});

// ── POST /notes/:id/reply — reply to a note with DM conversation + context + notification ──
router.post("/notes/:id/reply", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { text } = req.body as { text?: string };
  const cleanReplyText = typeof text === "string" ? text.trim() : "";
  if (!cleanReplyText) {
    res.status(400).json({ error: "Reply text cannot be empty" });
    return;
  }

  // 1. Find note
  const note = await Note.findById(req.params.id);
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  // 2. Validate note has not expired
  if (new Date() >= new Date(note.expiresAt)) {
    res.status(410).json({ error: "This note has expired and can no longer be replied to" });
    return;
  }

  // 3. Prevent self-reply
  if (note.userId.toString() === req.userId) {
    res.status(400).json({ error: "You cannot reply to your own note" });
    return;
  }

  // 4. Check author and permissions
  const author = await User.findById(note.userId);
  if (!author) {
    res.status(404).json({ error: "Note author not found" });
    return;
  }

  if (note.audience === "close_friends") {
    const isCloseFriend = (author.closeFriends ?? []).some((cfId: any) => cfId.toString() === req.userId);
    if (!isCloseFriend) {
      res.status(403).json({ error: "You do not have permission to reply to this note" });
      return;
    }
  }

  // Check blocks
  const meUser = await User.findById(req.userId);
  const iBlocked = (meUser?.blockedUsers ?? []).some((id: any) => id.toString() === author._id.toString());
  const theyBlocked = (author.blockedUsers ?? []).some((id: any) => id.toString() === req.userId);
  if (iBlocked || theyBlocked) {
    res.status(403).json({ error: "Cannot message this user" });
    return;
  }

  // 5. Find or create 1:1 conversation
  let conv = await Conversation.findOne({
    $or: [
      { user1Id: req.userId, user2Id: author._id },
      { user1Id: author._id, user2Id: req.userId },
    ],
  });

  if (!conv) {
    conv = await Conversation.create({
      user1Id: req.userId,
      user2Id: author._id,
      lastActivityAt: new Date(),
    });
  } else {
    conv.lastActivityAt = new Date();
    await conv.save();
  }

  // 6. Build Note Reply Preview Context
  const notePreviewContext = {
    noteId: note._id,
    text: note.text || null,
    emoji: note.emoji || null,
    gifUrl: note.gifUrl || null,
    sticker: note.sticker || null,
    voiceUrl: note.voiceUrl || null,
    voiceDuration: note.voiceDuration || null,
    imageUrl: note.imageUrl || null,
    spotifyTrack: note.spotifyTrack || null,
    location: note.location ? {
      name: note.location.name,
      lat: note.location.lat,
      lng: note.location.lng,
    } : null,
    theme: note.theme || "default",
    authorUsername: author.username,
    isExpired: false,
  };

  // 7. Create real Message in Private Chat
  const message = await Message.create({
    conversationId: conv._id,
    senderId: req.userId,
    text: cleanReplyText,
    replyToNote: notePreviewContext,
    isRead: false,
  });

  // 8. Create Notification for the note owner
  await Notification.create({
    userId: author._id,
    actorId: req.userId,
    type: "note_reply",
    commentText: cleanReplyText,
    noteId: note._id,
    noteText: note.text || (note.emoji ? `${note.emoji} Note` : "Shared a note"),
    conversationId: conv._id,
  });

  notifyUserPush(author._id.toString(), req.userId!, "message").catch(() => {});

  // 9. Emit real-time Socket.IO events
  const serializedMsg = {
    id: message._id.toString(),
    conversationId: conv._id.toString(),
    senderId: req.userId!,
    text: message.text,
    mediaUrl: null,
    mediaType: null,
    fileName: null,
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
    replyToNote: {
      noteId: note._id.toString(),
      text: notePreviewContext.text,
      emoji: notePreviewContext.emoji,
      gifUrl: notePreviewContext.gifUrl,
      sticker: notePreviewContext.sticker,
      voiceUrl: notePreviewContext.voiceUrl,
      voiceDuration: notePreviewContext.voiceDuration,
      imageUrl: notePreviewContext.imageUrl,
      spotifyTrack: notePreviewContext.spotifyTrack,
      location: notePreviewContext.location,
      theme: notePreviewContext.theme,
      authorUsername: notePreviewContext.authorUsername,
      isExpired: false,
    },
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

  const io = getIo(req);
  if (io) {
    io.to(`conversation:${conv._id}`).emit("new_message", serializedMsg);
    io.to(`user:${author._id}`).emit("new_message", serializedMsg);
  }

  res.status(201).json({
    ok: true,
    conversationId: conv._id.toString(),
    authorUsername: author.username,
    message: serializedMsg,
  });
});

export default router;


import { Router, type IRouter } from "express";
import { Poll, Conversation, Message } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";
import mongoose from "mongoose";
import type { Server as SocketServer } from "socket.io";

const router: IRouter = Router();

function getIo(req: AuthRequest): SocketServer | undefined {
  return (req as any).app.get("io");
}

export function serializePoll(p: any, currentUserId?: string) {
  const options = (p.options ?? []).map((o: any) => {
    const voters = (o.voterIds ?? []).map((v: any) => v.toString());
    return {
      id: o.id,
      text: o.text,
      voterIds: voters,
      voteCount: voters.length,
      hasVoted: currentUserId ? voters.includes(currentUserId) : false,
    };
  });
  const totalVotes = options.reduce((sum: number, o: any) => sum + o.voteCount, 0);

  return {
    id: p._id.toString(),
    conversationId: p.conversationId.toString(),
    creatorId: p.creatorId.toString(),
    question: p.question,
    options,
    allowMultiple: p.allowMultiple ?? false,
    allowVoteChange: p.allowVoteChange ?? true,
    isClosed: p.isClosed ?? false,
    closedAt: p.closedAt ? p.closedAt.toISOString() : null,
    totalVotes,
    createdAt: p.createdAt?.toISOString(),
    updatedAt: p.updatedAt?.toISOString(),
  };
}

// ── Helper: Check participant ─────────────────────────────────────────────────
async function isConversationParticipant(conv: any, userId: string): Promise<boolean> {
  if (!conv) return false;
  if (conv.isGroup) {
    return (conv.memberIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === userId);
  }
  return conv.user1Id?.toString() === userId || conv.user2Id?.toString() === userId;
}

// ── POST /api/conversations/:conversationId/polls ─────────────────────────────
router.post("/conversations/:conversationId/polls", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const conversationId = req.params.conversationId;
  const { question, options, allowMultiple = false, allowVoteChange = true } = req.body as {
    question?: string;
    options?: string[];
    allowMultiple?: boolean;
    allowVoteChange?: boolean;
  };

  if (!question || !question.trim()) {
    res.status(400).json({ error: "Question is required" });
    return;
  }

  if (!Array.isArray(options) || options.length < 2) {
    res.status(400).json({ error: "At least 2 options are required" });
    return;
  }

  if (options.length > 10) {
    res.status(400).json({ error: "Maximum 10 options allowed" });
    return;
  }

  const cleanOptions = options.map((opt, i) => ({
    id: `opt_${Date.now()}_${i}`,
    text: opt.trim(),
    voterIds: [] as mongoose.Types.ObjectId[],
  })).filter(o => o.text.length > 0);

  if (cleanOptions.length < 2) {
    res.status(400).json({ error: "Options cannot be empty" });
    return;
  }

  const conv = await Conversation.findById(conversationId).catch(() => null);
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  if (!(await isConversationParticipant(conv, req.userId!))) {
    res.status(403).json({ error: "You are not a participant in this conversation" });
    return;
  }

  const poll = await Poll.create({
    conversationId: conv._id,
    creatorId: new mongoose.Types.ObjectId(req.userId!),
    question: question.trim(),
    options: cleanOptions,
    allowMultiple: !!allowMultiple,
    allowVoteChange: allowVoteChange !== false,
    isClosed: false,
  });

  // Create message in chat stream
  const msg = await Message.create({
    conversationId: conv._id,
    senderId: req.userId,
    text: `📊 Poll: ${question.trim()}`,
    pollId: poll._id,
  });

  await Conversation.findByIdAndUpdate(conv._id, { lastActivityAt: new Date() });

  const pollData = serializePoll(poll, req.userId);
  const io = getIo(req);
  if (io) {
    io.to(`conversation:${conversationId}`).emit("poll_updated", pollData);
    io.to(`conversation:${conversationId}`).emit("new_message", {
      id: msg._id.toString(),
      conversationId: msg.conversationId.toString(),
      senderId: msg.senderId.toString(),
      text: msg.text,
      mediaUrl: null,
      mediaType: null,
      fileName: null,
      isRead: false,
      isEdited: false,
      isDeleted: false,
      reactions: {},
      isPinned: false,
      starredBy: [],
      clientId: null,
      replyToId: null,
      replyTo: null,
      isSnap: false,
      pollId: poll._id.toString(),
      poll: pollData,
      createdAt: msg.createdAt.toISOString(),
      updatedAt: msg.updatedAt.toISOString(),
    });
  }

  res.status(201).json(pollData);
});

// ── GET /api/polls/:pollId ────────────────────────────────────────────────────
router.get("/polls/:pollId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const poll = await Poll.findById(req.params.pollId).catch(() => null);
  if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }

  const conv = await Conversation.findById(poll.conversationId).catch(() => null);
  if (!(await isConversationParticipant(conv, req.userId!))) {
    res.status(403).json({ error: "Not a participant" });
    return;
  }

  res.json(serializePoll(poll, req.userId));
});

// ── POST /api/polls/:pollId/vote ──────────────────────────────────────────────
router.post("/polls/:pollId/vote", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const poll = await Poll.findById(req.params.pollId).catch(() => null);
  if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }

  const conv = await Conversation.findById(poll.conversationId).catch(() => null);
  if (!(await isConversationParticipant(conv, req.userId!))) {
    res.status(403).json({ error: "Not a participant" });
    return;
  }

  if (poll.isClosed) {
    res.status(400).json({ error: "This poll is closed" });
    return;
  }

  const { optionId } = req.body as { optionId?: string };
  if (!optionId) {
    res.status(400).json({ error: "optionId is required" });
    return;
  }

  const targetOption = poll.options.find(o => o.id === optionId);
  if (!targetOption) {
    res.status(404).json({ error: "Option not found" });
    return;
  }

  const myOid = new mongoose.Types.ObjectId(req.userId!);
  const currentVotesForMe = poll.options.filter(o =>
    (o.voterIds ?? []).some(v => v.toString() === req.userId)
  );

  const alreadyVotedThisOption = (targetOption.voterIds ?? []).some(v => v.toString() === req.userId);

  if (!poll.allowMultiple) {
    // Single choice mode
    if (alreadyVotedThisOption) {
      // User tapped the same option again: if allowVoteChange, allow unselecting or keep
      if (!poll.allowVoteChange) {
        res.status(400).json({ error: "Changing or removing votes is disabled for this poll" });
        return;
      }
      targetOption.voterIds = targetOption.voterIds.filter(v => v.toString() !== req.userId);
    } else {
      // Changing vote or voting first time
      if (currentVotesForMe.length > 0 && !poll.allowVoteChange) {
        res.status(400).json({ error: "Changing votes is disabled for this poll" });
        return;
      }
      // Remove previous vote from all options
      poll.options.forEach(o => {
        o.voterIds = (o.voterIds ?? []).filter(v => v.toString() !== req.userId);
      });
      // Add to new option
      targetOption.voterIds.push(myOid);
    }
  } else {
    // Multiple choice mode: toggle option
    if (alreadyVotedThisOption) {
      if (!poll.allowVoteChange) {
        res.status(400).json({ error: "Removing votes is disabled for this poll" });
        return;
      }
      targetOption.voterIds = targetOption.voterIds.filter(v => v.toString() !== req.userId);
    } else {
      targetOption.voterIds.push(myOid);
    }
  }

  poll.markModified("options");
  await poll.save();

  const pollData = serializePoll(poll, req.userId);
  const io = getIo(req);
  if (io) {
    io.to(`conversation:${poll.conversationId}`).emit("poll_updated", pollData);
  }

  res.json(pollData);
});

// ── POST /api/polls/:pollId/close ─────────────────────────────────────────────
router.post("/polls/:pollId/close", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const poll = await Poll.findById(req.params.pollId).catch(() => null);
  if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }

  // Only creator can close poll
  if (poll.creatorId.toString() !== req.userId) {
    res.status(403).json({ error: "Only the poll creator can close this poll" });
    return;
  }

  poll.isClosed = true;
  poll.closedAt = new Date();
  await poll.save();

  const pollData = serializePoll(poll, req.userId);
  const io = getIo(req);
  if (io) {
    io.to(`conversation:${poll.conversationId}`).emit("poll_updated", pollData);
  }

  res.json(pollData);
});

export default router;

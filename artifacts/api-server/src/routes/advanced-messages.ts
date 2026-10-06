import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import { Message, Conversation, User, Notification, CoWriteDraft } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { encryptPayload, decryptPayload, verifySolution } from "../lib/messageCrypto";
import type { Server as SocketServer } from "socket.io";
import { notifyUserPush } from "../lib/push";

const router: IRouter = Router();

function getIo(req: AuthRequest): SocketServer | undefined {
  return (req as any).app.get("io");
}

async function assertParticipant(conversationId: string, userId: string): Promise<any> {
  const conv = await Conversation.findById(conversationId).catch(() => null);
  if (!conv) return null;
  const isParticipant = conv.isGroup
    ? (conv.memberIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === userId)
    : (conv.user1Id?.toString() === userId || conv.user2Id?.toString() === userId);
  return isParticipant ? conv : null;
}

// ════════════════════════════════════════════════════════════════════════════
// 1. PUZZLE MESSAGE ENDPOINTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/messages/:messageId/puzzle/solve
 * Submit an answer or memory sequence for a puzzle message.
 */
router.post("/messages/:messageId/puzzle/solve", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { answer } = req.body as { answer?: string | string[] };
    if (!answer) {
      res.status(400).json({ error: "Answer is required" });
      return;
    }

    const msg = await Message.findById(req.params.messageId).catch(() => null);
    if (!msg || msg.isDeleted) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    if (msg.messageType !== "puzzle" || !msg.puzzle) {
      res.status(400).json({ error: "This is not a puzzle message" });
      return;
    }

    const conv = await assertParticipant(msg.conversationId.toString(), req.userId!);
    if (!conv) {
      res.status(403).json({ error: "Not a participant in this conversation" });
      return;
    }

    const meId = new mongoose.Types.ObjectId(req.userId!);
    const isSender = msg.senderId.toString() === req.userId;

    // Check expiration
    if (msg.puzzle.expiresAt && new Date() > new Date(msg.puzzle.expiresAt)) {
      res.status(410).json({ error: "This puzzle has expired" });
      return;
    }

    // Check if already solved
    const alreadySolved = (msg.puzzle.solvedBy ?? []).some(id => id && id.toString() === req.userId);
    if (alreadySolved || isSender) {
      const revealedText = msg.puzzle.encryptedPayload ? decryptPayload(msg.puzzle.encryptedPayload) : (msg.text || "");
      res.json({ ok: true, solved: true, text: revealedText });
      return;
    }

    // Check attempt limits
    const failedList = msg.puzzle.failedUserAttempts || [];
    const userAttempt = failedList.find(a => a && a.userId && a.userId.toString() === req.userId);
    const currentAttempts = userAttempt ? (userAttempt.attempts || 0) : 0;
    const maxAttempts = msg.puzzle.maxAttempts ?? 3;

    if (maxAttempts > 0 && currentAttempts >= maxAttempts) {
      res.status(403).json({ error: "Maximum attempts exceeded", attemptsUsed: currentAttempts, maxAttempts });
      return;
    }

    // Validate answer string or array of memory cards
    const candidateStr = Array.isArray(answer) ? answer.join(",") : String(answer);
    const isCorrect = verifySolution(candidateStr, msg.puzzle.solutionHash);

    const io = getIo(req);

    if (isCorrect) {
      // Correct answer!
      await Message.findByIdAndUpdate(msg._id, {
        $addToSet: { "puzzle.solvedBy": meId },
        $set: { "puzzle.solvedAt": new Date() },
      });

      const decryptedText = msg.puzzle.encryptedPayload ? decryptPayload(msg.puzzle.encryptedPayload) : (msg.text || "");

      // Notify sender that puzzle was solved
      await Notification.create({
        userId: msg.senderId,
        actorId: req.userId,
        type: "message",
        commentText: "solved your puzzle message! 🔓",
        conversationId: msg.conversationId,
      }).catch(() => {});

      notifyUserPush(msg.senderId.toString(), req.userId!, "message").catch(() => {});

      if (io) {
        io.to(`conversation:${msg.conversationId}`).emit("puzzle_message_solved", {
          messageId: msg._id.toString(),
          conversationId: msg.conversationId.toString(),
          solverId: req.userId,
        });
        io.to(`user:${msg.senderId}`).emit("puzzle_message_solved", {
          messageId: msg._id.toString(),
          conversationId: msg.conversationId.toString(),
          solverId: req.userId,
        });
      }

      res.json({ ok: true, solved: true, text: decryptedText });
    } else {
      // Wrong answer
      const newAttempts = currentAttempts + 1;

      // Update failed attempts directly on Mongoose instance safely
      msg.puzzle.attemptsUsed = (msg.puzzle.attemptsUsed || 0) + 1;
      if (!msg.puzzle.failedUserAttempts) {
        msg.puzzle.failedUserAttempts = [];
      }

      const idx = msg.puzzle.failedUserAttempts.findIndex(
        (a: any) => a && a.userId && a.userId.toString() === req.userId
      );

      if (idx !== -1) {
        msg.puzzle.failedUserAttempts[idx].attempts = newAttempts;
        msg.puzzle.failedUserAttempts[idx].lastAttemptAt = new Date();
      } else {
        msg.puzzle.failedUserAttempts.push({
          userId: meId,
          attempts: 1,
          lastAttemptAt: new Date(),
        });
      }

      msg.markModified("puzzle");
      await msg.save();

      const solverUser = await User.findById(req.userId).catch(() => null);
      const solverName = solverUser?.fullName || solverUser?.username || "Someone";

      // If reached 3 failed attempts, notify sender
      if (newAttempts === 3) {
        await Notification.create({
          userId: msg.senderId,
          actorId: req.userId,
          type: "message",
          commentText: `${solverName} tried to unlock your puzzle message but couldn't solve it.`,
          conversationId: msg.conversationId,
        }).catch(() => {});

        if (io) {
          io.to(`user:${msg.senderId}`).emit("puzzle_message_failed", {
            messageId: msg._id.toString(),
            conversationId: msg.conversationId.toString(),
            solverId: req.userId,
            attempts: newAttempts,
          });
        }
      }

      const attemptsRemaining = maxAttempts > 0 ? Math.max(0, maxAttempts - newAttempts) : 999;
      res.status(400).json({
        error: "Not quite 😅",
        attemptsUsed: newAttempts,
        attemptsRemaining,
        maxAttempts,
      });
    }
  } catch (err) {
    console.error("Error solving puzzle message:", err);
    res.status(500).json({ error: "An unexpected error occurred while solving the puzzle." });
  }
});

/**
 * POST /api/messages/:messageId/puzzle/hint
 * Sender sends or updates a hint for a puzzle message.
 */
router.post("/messages/:messageId/puzzle/hint", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { hint } = req.body as { hint?: string };
  if (!hint?.trim()) {
    res.status(400).json({ error: "Hint is required" });
    return;
  }

  const msg = await Message.findById(req.params.messageId).catch(() => null);
  if (!msg || msg.isDeleted) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  if (msg.senderId.toString() !== req.userId) {
    res.status(403).json({ error: "Only the sender can provide a hint" });
    return;
  }

  await Message.findByIdAndUpdate(msg._id, { $set: { "puzzle.hint": hint.trim() } });

  const io = getIo(req);
  if (io) {
    io.to(`conversation:${msg.conversationId}`).emit("puzzle_message_hint_sent", {
      messageId: msg._id.toString(),
      conversationId: msg.conversationId.toString(),
      hint: hint.trim(),
    });
  }

  res.json({ ok: true, hint: hint.trim() });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. PERMISSION-GATED MESSAGE ENDPOINTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/messages/:messageId/access/request
 * Recipient requests permission to read a protected message.
 */
router.post("/messages/:messageId/access/request", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const msg = await Message.findById(req.params.messageId).catch(() => null);
  if (!msg || msg.isDeleted) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  if (msg.messageType !== "permission_gated" || !msg.permissionGated) {
    res.status(400).json({ error: "This is not a permission-gated message" });
    return;
  }

  const conv = await assertParticipant(msg.conversationId.toString(), req.userId!);
  if (!conv) {
    res.status(403).json({ error: "Not a participant" });
    return;
  }

  const meId = new mongoose.Types.ObjectId(req.userId!);
  const existingGrant = (msg.permissionGated.grants || []).find(g => g.userId.toString() === req.userId);

  if (existingGrant) {
    await Message.updateOne(
      { _id: msg._id, "permissionGated.grants.userId": meId },
      {
        $set: {
          "permissionGated.grants.$.status": "pending",
          "permissionGated.grants.$.requestedAt": new Date(),
        },
      }
    );
  } else {
    await Message.findByIdAndUpdate(msg._id, {
      $push: {
        "permissionGated.grants": {
          userId: meId,
          grantType: "one_time",
          status: "pending",
          requestedAt: new Date(),
        },
      },
    });
  }

  const requesterUser = await User.findById(req.userId);
  const requesterName = requesterUser?.fullName || requesterUser?.username || "Someone";

  await Notification.create({
    userId: msg.senderId,
    actorId: req.userId,
    type: "message",
    commentText: `${requesterName} wants to view your protected message. 🔐`,
    conversationId: msg.conversationId,
  }).catch(() => {});

  notifyUserPush(msg.senderId.toString(), req.userId!, "message").catch(() => {});

  const io = getIo(req);
  if (io) {
    io.to(`user:${msg.senderId}`).emit("protected_message_access_requested", {
      messageId: msg._id.toString(),
      conversationId: msg.conversationId.toString(),
      requesterId: req.userId,
      requesterUsername: requesterUser?.username,
      requesterAvatar: requesterUser?.avatarUrl,
    });
    io.to(`conversation:${msg.conversationId}`).emit("protected_message_status_changed", {
      messageId: msg._id.toString(),
      userId: req.userId,
      status: "pending",
    });
  }

  res.json({ ok: true, status: "pending" });
});

/**
 * POST /api/messages/:messageId/access/decide
 * Sender approves or declines access for a requester.
 */
router.post("/messages/:messageId/access/decide", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { requesterId, decision, grantType } = req.body as {
    requesterId: string;
    decision: "approved" | "declined";
    grantType?: "one_time" | "1h" | "24h" | "permanent";
  };

  if (!requesterId || !["approved", "declined"].includes(decision)) {
    res.status(400).json({ error: "requesterId and valid decision (approved/declined) required" });
    return;
  }

  const msg = await Message.findById(req.params.messageId).catch(() => null);
  if (!msg || msg.isDeleted) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  if (msg.senderId.toString() !== req.userId) {
    res.status(403).json({ error: "Only the sender can approve or decline access" });
    return;
  }

  const validGrantType = grantType && ["one_time", "1h", "24h", "permanent"].includes(grantType) ? grantType : "one_time";
  let expiresAt: Date | null = null;
  if (decision === "approved") {
    if (validGrantType === "1h") expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    else if (validGrantType === "24h") expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  const reqObjId = new mongoose.Types.ObjectId(requesterId);

  await Message.updateOne(
    { _id: msg._id, "permissionGated.grants.userId": reqObjId },
    {
      $set: {
        "permissionGated.grants.$.status": decision,
        "permissionGated.grants.$.grantType": validGrantType,
        "permissionGated.grants.$.decidedAt": new Date(),
        "permissionGated.grants.$.expiresAt": expiresAt,
      },
    }
  );

  const io = getIo(req);
  if (io) {
    io.to(`user:${requesterId}`).emit(
      decision === "approved" ? "protected_message_access_granted" : "protected_message_access_denied",
      {
        messageId: msg._id.toString(),
        conversationId: msg.conversationId.toString(),
        grantType: validGrantType,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
      }
    );
    io.to(`conversation:${msg.conversationId}`).emit("protected_message_status_changed", {
      messageId: msg._id.toString(),
      userId: requesterId,
      status: decision,
      grantType: validGrantType,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    });
  }

  res.json({ ok: true, decision, grantType: validGrantType, expiresAt: expiresAt?.toISOString() || null });
});

/**
 * POST /api/messages/:messageId/access/open
 * Authorized recipient opens and reads the protected message payload.
 */
router.post("/messages/:messageId/access/open", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const msg = await Message.findById(req.params.messageId).catch(() => null);
  if (!msg || msg.isDeleted) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  if (msg.messageType !== "permission_gated" || !msg.permissionGated) {
    res.status(400).json({ error: "Not a permission-gated message" });
    return;
  }

  const isSender = msg.senderId.toString() === req.userId;
  const grant = (msg.permissionGated.grants || []).find(g => g.userId.toString() === req.userId);

  if (!isSender) {
    if (!grant || grant.status !== "approved") {
      res.status(403).json({ error: "Access has not been approved" });
      return;
    }
    if (grant.expiresAt && new Date() > new Date(grant.expiresAt)) {
      res.status(403).json({ error: "Access expired" });
      return;
    }
    if (grant.grantType === "one_time" && grant.consumed) {
      res.status(403).json({ error: "One-time access already consumed" });
      return;
    }

    // Mark as opened and consumed if one-time
    const meId = new mongoose.Types.ObjectId(req.userId!);
    await Message.updateOne(
      { _id: msg._id, "permissionGated.grants.userId": meId },
      {
        $set: {
          "permissionGated.grants.$.openedAt": new Date(),
          "permissionGated.grants.$.consumed": grant.grantType === "one_time",
        },
      }
    );
  }

  const decryptedText = msg.permissionGated.encryptedPayload
    ? decryptPayload(msg.permissionGated.encryptedPayload)
    : (msg.text || "");

  res.json({ ok: true, text: decryptedText });
});

/**
 * POST /api/messages/:messageId/access/revoke
 * Sender revokes access for a specific recipient.
 */
router.post("/messages/:messageId/access/revoke", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { requesterId } = req.body as { requesterId: string };
  if (!requesterId) {
    res.status(400).json({ error: "requesterId required" });
    return;
  }

  const msg = await Message.findById(req.params.messageId).catch(() => null);
  if (!msg || msg.isDeleted) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  if (msg.senderId.toString() !== req.userId) {
    res.status(403).json({ error: "Only sender can revoke access" });
    return;
  }

  const reqObjId = new mongoose.Types.ObjectId(requesterId);
  await Message.updateOne(
    { _id: msg._id, "permissionGated.grants.userId": reqObjId },
    { $set: { "permissionGated.grants.$.status": "revoked" } }
  );

  const io = getIo(req);
  if (io) {
    io.to(`user:${requesterId}`).emit("protected_message_access_revoked", {
      messageId: msg._id.toString(),
      conversationId: msg.conversationId.toString(),
    });
    io.to(`conversation:${msg.conversationId}`).emit("protected_message_status_changed", {
      messageId: msg._id.toString(),
      userId: requesterId,
      status: "revoked",
    });
  }

  res.json({ ok: true, revoked: true });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. CO-WRITE DRAFT ENDPOINTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/conversations/:conversationId/co-write
 * Initiate a new collaborative message draft.
 */
router.post("/conversations/:conversationId/co-write", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const conversationId = req.params.conversationId as string;
  const conv = await assertParticipant(conversationId, req.userId!);
  if (!conv) {
    res.status(403).json({ error: "Not a participant in this conversation" });
    return;
  }

  const { participantIds, title, initialContent } = req.body as {
    participantIds?: string[];
    title?: string;
    initialContent?: string;
  };

  const myId = new mongoose.Types.ObjectId(req.userId!);
  let allParticipantIds: mongoose.Types.ObjectId[] = [myId];

  if (conv.isGroup) {
    if (Array.isArray(participantIds) && participantIds.length > 0) {
      // Validate all participantIds belong to the group
      const validGroupMemberIds = (conv.memberIds ?? []).map((id: any) => id.toString());
      const selected = participantIds.filter(id => validGroupMemberIds.includes(id));
      allParticipantIds = Array.from(new Set([req.userId!, ...selected])).map(id => new mongoose.Types.ObjectId(id));
    } else {
      // Default: all group members
      allParticipantIds = conv.memberIds || [myId];
    }
  } else {
    // 1-on-1: both user1 and user2
    const otherId = conv.user1Id.toString() === req.userId ? conv.user2Id : conv.user1Id;
    if (otherId) allParticipantIds = [myId, otherId];
  }

  const initialApprovals = allParticipantIds.map(pid => ({
    userId: pid,
    status: pid.toString() === req.userId ? ("approved" as const) : ("pending" as const),
    reason: null,
    updatedAt: new Date(),
  }));

  const draft = await CoWriteDraft.create({
    conversationId: conv._id,
    creatorId: myId,
    participantIds: allParticipantIds,
    title: title || "Collaborative Message",
    content: initialContent || "",
    version: 1,
    status: "drafting",
    approvals: initialApprovals,
    operations: [],
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h expiration
  });

  const creatorUser = await User.findById(req.userId);
  const creatorName = creatorUser?.fullName || creatorUser?.username || "Someone";

  // Notify other participants
  const otherIds = allParticipantIds.filter(id => id.toString() !== req.userId);
  for (const oid of otherIds) {
    await Notification.create({
      userId: oid,
      actorId: req.userId,
      type: "message",
      commentText: `${creatorName} invited you to co-write a collaborative message! ✍️`,
      conversationId: conv._id,
    }).catch(() => {});
  }

  const io = getIo(req);
  if (io) {
    const draftPayload = {
      draftId: draft._id.toString(),
      conversationId: conv._id.toString(),
      creatorId: req.userId,
      title: draft.title,
      participantIds: allParticipantIds.map(id => id.toString()),
      status: draft.status,
    };
    io.to(`conversation:${conversationId}`).emit("co_write_created", draftPayload);
    for (const oid of otherIds) {
      io.to(`user:${oid.toString()}`).emit("co_write_created", draftPayload);
    }
  }

  res.status(201).json(draft);
});

/**
 * GET /api/co-write/:draftId
 * Fetch full collaborative draft state.
 */
router.get("/co-write/:draftId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const draft = await CoWriteDraft.findById(req.params.draftId).catch(() => null);
  if (!draft) {
    res.status(404).json({ error: "Draft not found" });
    return;
  }

  const isParticipant = (draft.participantIds || []).some(id => id.toString() === req.userId);
  if (!isParticipant) {
    res.status(403).json({ error: "Not an invited participant in this draft" });
    return;
  }

  const participantUsers = await User.find({ _id: { $in: draft.participantIds } });
  const participants = participantUsers.map(u => ({
    id: u._id.toString(),
    username: u.username,
    fullName: u.fullName,
    avatarUrl: u.avatarUrl,
  }));

  res.json({
    id: draft._id.toString(),
    conversationId: draft.conversationId.toString(),
    creatorId: draft.creatorId.toString(),
    title: draft.title,
    content: draft.content,
    version: draft.version,
    status: draft.status,
    participants,
    approvals: (draft.approvals || []).map(a => ({
      userId: a.userId.toString(),
      status: a.status,
      reason: a.reason,
      updatedAt: a.updatedAt.toISOString(),
    })),
    expiresAt: draft.expiresAt?.toISOString() || null,
    lockedAt: draft.lockedAt?.toISOString() || null,
    sentAt: draft.sentAt?.toISOString() || null,
  });
});

/**
 * POST /api/co-write/:draftId/op
 * Apply an editing operation to the draft.
 */
router.post("/co-write/:draftId/op", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const draft = await CoWriteDraft.findById(req.params.draftId).catch(() => null);
  if (!draft) {
    res.status(404).json({ error: "Draft not found" });
    return;
  }

  const isParticipant = (draft.participantIds || []).some(id => id.toString() === req.userId);
  if (!isParticipant) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  if (draft.status !== "drafting") {
    res.status(400).json({ error: "Draft is currently locked or in review" });
    return;
  }

  const { content, operation } = req.body as {
    content?: string;
    operation?: {
      type: "insert" | "delete" | "replace" | "set_text";
      position?: number;
      text?: string;
      length?: number;
    };
  };

  const newContent = content !== undefined ? content : draft.content;
  const newVersion = draft.version + 1;
  const opRecord = {
    operationId: `op-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId: new mongoose.Types.ObjectId(req.userId!),
    sequence: newVersion,
    type: operation?.type || "set_text",
    position: operation?.position,
    text: operation?.text,
    length: operation?.length,
    timestamp: new Date(),
  };

  // When text changes, reset all other participants' approvals to pending
  const myIdStr = req.userId!;
  const updatedApprovals = (draft.approvals || []).map(a => ({
    userId: a.userId,
    status: a.userId.toString() === myIdStr ? ("approved" as const) : ("pending" as const),
    reason: null,
    updatedAt: new Date(),
  }));

  const updated = await CoWriteDraft.findByIdAndUpdate(
    draft._id,
    {
      $set: { content: newContent, version: newVersion, approvals: updatedApprovals },
      $push: { operations: opRecord },
    },
    { new: true }
  );

  const io = getIo(req);
  if (io) {
    io.to(`conversation:${draft.conversationId}`).emit("co_write_operation", {
      draftId: draft._id.toString(),
      userId: req.userId,
      version: newVersion,
      content: newContent,
      operation: opRecord,
    });
  }

  res.json({ ok: true, version: newVersion, content: newContent });
});

/**
 * POST /api/co-write/:draftId/review
 * Transition draft to review state and request approval from all participants.
 */
router.post("/co-write/:draftId/review", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const draft = await CoWriteDraft.findById(req.params.draftId).catch(() => null);
  if (!draft) {
    res.status(404).json({ error: "Draft not found" });
    return;
  }

  const isParticipant = (draft.participantIds || []).some(id => id.toString() === req.userId);
  if (!isParticipant) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  const myIdStr = req.userId!;
  const updatedApprovals = (draft.approvals || []).map(a => ({
    userId: a.userId,
    status: a.userId.toString() === myIdStr ? ("approved" as const) : ("pending" as const),
    reason: null,
    updatedAt: new Date(),
  }));

  await CoWriteDraft.findByIdAndUpdate(draft._id, {
    $set: { status: "review", approvals: updatedApprovals },
  });

  const senderUser = await User.findById(req.userId);
  const senderName = senderUser?.fullName || senderUser?.username || "Someone";

  const otherIds = (draft.participantIds || []).filter(id => id.toString() !== req.userId);
  for (const oid of otherIds) {
    await Notification.create({
      userId: oid,
      actorId: req.userId,
      type: "message",
      commentText: `${senderName} submitted the collaborative message for your approval! 👥`,
      conversationId: draft.conversationId,
    }).catch(() => {});
  }

  const io = getIo(req);
  if (io) {
    io.to(`conversation:${draft.conversationId}`).emit("co_write_review", {
      draftId: draft._id.toString(),
      content: draft.content,
      submittedBy: req.userId,
      approvals: updatedApprovals.map(a => ({ userId: a.userId.toString(), status: a.status })),
    });
  }

  res.json({ ok: true, status: "review", approvals: updatedApprovals });
});

/**
 * POST /api/co-write/:draftId/decide
 * Approve or reject the collaborative draft.
 */
router.post("/co-write/:draftId/decide", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { decision, reason } = req.body as { decision: "approved" | "rejected"; reason?: string };
  if (!["approved", "rejected"].includes(decision)) {
    res.status(400).json({ error: "decision must be 'approved' or 'rejected'" });
    return;
  }

  const draft = await CoWriteDraft.findById(req.params.draftId).catch(() => null);
  if (!draft) {
    res.status(404).json({ error: "Draft not found" });
    return;
  }

  const isParticipant = (draft.participantIds || []).some(id => id.toString() === req.userId);
  if (!isParticipant) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  const meId = new mongoose.Types.ObjectId(req.userId!);
  const newStatus = decision === "rejected" ? "drafting" : draft.status;

  await CoWriteDraft.updateOne(
    { _id: draft._id, "approvals.userId": meId },
    {
      $set: {
        "approvals.$.status": decision,
        "approvals.$.reason": reason || null,
        "approvals.$.updatedAt": new Date(),
        status: newStatus,
      },
    }
  );

  const updatedDraft = await CoWriteDraft.findById(draft._id);
  const allApproved = (updatedDraft?.approvals || []).every(a => a.status === "approved");

  const io = getIo(req);
  if (io) {
    io.to(`conversation:${draft.conversationId}`).emit("co_write_decision", {
      draftId: draft._id.toString(),
      userId: req.userId,
      decision,
      reason,
      status: newStatus,
      allApproved,
      approvals: (updatedDraft?.approvals || []).map(a => ({ userId: a.userId.toString(), status: a.status, reason: a.reason })),
    });
  }

  res.json({ ok: true, decision, status: newStatus, allApproved });
});

/**
 * POST /api/co-write/:draftId/send
 * Convert approved collaborative draft into a permanent chat message.
 */
router.post("/co-write/:draftId/send", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const draft = await CoWriteDraft.findById(req.params.draftId).catch(() => null);
  if (!draft) {
    res.status(404).json({ error: "Draft not found" });
    return;
  }

  const isParticipant = (draft.participantIds || []).some(id => id.toString() === req.userId);
  if (!isParticipant) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  if (draft.status === "sent") {
    res.status(400).json({ error: "Draft has already been sent" });
    return;
  }

  const allApproved = (draft.approvals || []).every(a => a.status === "approved");
  if (!allApproved) {
    res.status(403).json({ error: "All co-writers must approve before sending" });
    return;
  }

  if (!draft.content?.trim()) {
    res.status(400).json({ error: "Message content cannot be empty" });
    return;
  }

  // Retrieve participant usernames
  const participantUsers = await User.find({ _id: { $in: draft.participantIds } });
  const authorUsernames = participantUsers.map(u => u.fullName || u.username);

  // Create final chat message
  const msg = await Message.create({
    conversationId: draft.conversationId,
    senderId: draft.creatorId,
    text: draft.content.trim(),
    messageType: "co_write",
    coWrite: {
      draftId: draft._id,
      authorIds: draft.participantIds,
      authorUsernames,
    },
    isRead: false,
  });

  await CoWriteDraft.findByIdAndUpdate(draft._id, {
    $set: {
      status: "sent",
      finalMessageId: msg._id,
      sentAt: new Date(),
    },
  });

  await Conversation.findByIdAndUpdate(draft.conversationId, { lastActivityAt: new Date() });

  const io = getIo(req);
  if (io) {
    const serializedMsg = {
      id: msg._id.toString(),
      conversationId: msg.conversationId.toString(),
      senderId: msg.senderId.toString(),
      text: msg.text,
      messageType: "co_write",
      coWrite: {
        draftId: draft._id.toString(),
        authorIds: draft.participantIds.map(id => id.toString()),
        authorUsernames,
      },
      createdAt: msg.createdAt.toISOString(),
      updatedAt: msg.updatedAt.toISOString(),
    };

    io.to(`conversation:${draft.conversationId}`).emit("new_message", serializedMsg);
    io.to(`conversation:${draft.conversationId}`).emit("co_write_sent", {
      draftId: draft._id.toString(),
      messageId: msg._id.toString(),
    });
  }

  res.status(201).json(msg);
});

// ════════════════════════════════════════════════════════════════════════════
// 4. SELECTIVE VISIBILITY ENDPOINT
// ════════════════════════════════════════════════════════════════════════════

/**
 * PATCH /api/messages/:messageId/visibility
 * Update visibility list for an existing group message.
 */
router.patch("/messages/:messageId/visibility", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { mode, allowedUserIds, deniedUserIds, isSilent } = req.body as {
    mode: "all" | "allow_list" | "deny_list";
    allowedUserIds?: string[];
    deniedUserIds?: string[];
    isSilent?: boolean;
  };

  const msg = await Message.findById(req.params.messageId).catch(() => null);
  if (!msg || msg.isDeleted) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  if (msg.senderId.toString() !== req.userId) {
    res.status(403).json({ error: "Only the sender can edit visibility" });
    return;
  }

  const allowedObjIds = (allowedUserIds || []).map(id => new mongoose.Types.ObjectId(id));
  const deniedObjIds = (deniedUserIds || []).map(id => new mongoose.Types.ObjectId(id));

  await Message.findByIdAndUpdate(msg._id, {
    $set: {
      selectiveVisibility: {
        mode: mode || "all",
        allowedUserIds: allowedObjIds,
        deniedUserIds: deniedObjIds,
        isSilent: isSilent ?? true,
        updatedAt: new Date(),
      },
    },
  });

  const io = getIo(req);
  if (io) {
    io.to(`conversation:${msg.conversationId}`).emit("message_visibility_updated", {
      messageId: msg._id.toString(),
      conversationId: msg.conversationId.toString(),
      mode: mode || "all",
    });
  }

  res.json({ ok: true, mode: mode || "all" });
});

export default router;

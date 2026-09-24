import { Router, type IRouter } from "express";
import { Report, Message, Conversation, User, Post } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";
import mongoose from "mongoose";

const router: IRouter = Router();

const ALLOWED_REASONS = [
  "Spam",
  "Harassment",
  "Abuse",
  "Inappropriate Content",
  "Scam",
  "Other",
  "Nudity or sexual activity",
  "Hate speech or symbols",
  "Violence or dangerous content",
  "Bullying or harassment",
];

// ── POST /api/comments/:commentId/report ──────────────────────────────────────
router.post("/comments/:commentId/report", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const commentId = req.params.commentId;
  const { reason, details } = req.body as { reason?: string; details?: string };

  if (!reason) {
    res.status(400).json({ error: "reason is required" });
    return;
  }

  const post = await Post.findOne({ "comments._id": new mongoose.Types.ObjectId(commentId) }).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }
  const comment = post.comments.find((c: any) => c._id.toString() === commentId);
  if (!comment || comment.isDeleted) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  if (comment.authorId.toString() === req.userId) {
    res.status(400).json({ error: "You cannot report your own comment" });
    return;
  }

  const existingReport = await Report.findOne({
    reporterId: req.userId,
    targetCommentId: comment._id,
  });

  if (existingReport) {
    res.status(400).json({
      error: "You have already reported this comment and it is under review",
      alreadyReported: true,
    });
    return;
  }

  const report = await Report.create({
    reporterId: req.userId,
    targetType: "comment",
    targetPostId: post._id,
    targetCommentId: comment._id,
    targetUserId: comment.authorId,
    reason,
    details: details?.trim() || null,
    status: "pending",
  });

  res.status(201).json({
    success: true,
    message: "Your report has been received and will be reviewed by moderation",
    report: {
      id: report._id.toString(),
      targetCommentId: comment._id.toString(),
      reason: report.reason,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
    },
  });
});

// ── POST /api/posts/:postId/report ────────────────────────────────────────────
router.post("/posts/:postId/report", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const postId = req.params.postId;
  const { reason, details } = req.body as { reason?: string; details?: string };

  if (!reason) {
    res.status(400).json({ error: "reason is required" });
    return;
  }

  const post = await Post.findById(postId).catch(() => null);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  if (post.authorId.toString() === req.userId) {
    res.status(400).json({ error: "You cannot report your own post" });
    return;
  }

  const existingReport = await Report.findOne({
    reporterId: req.userId,
    targetPostId: post._id,
    targetType: "post",
  });

  if (existingReport) {
    res.status(400).json({
      error: "You have already reported this post and it is under review",
      alreadyReported: true,
    });
    return;
  }

  const report = await Report.create({
    reporterId: req.userId,
    targetType: "post",
    targetPostId: post._id,
    targetUserId: post.authorId,
    reason,
    details: details?.trim() || null,
    status: "pending",
  });

  res.status(201).json({
    success: true,
    message: "Your report has been received and will be reviewed by moderation",
    report: {
      id: report._id.toString(),
      targetPostId: post._id.toString(),
      reason: report.reason,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
    },
  });
});

// ── POST /api/messages/:messageId/report ──────────────────────────────────────
router.post("/messages/:messageId/report", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const messageId = req.params.messageId;
  const { reason, details } = req.body as { reason?: string; details?: string };

  if (!reason || !ALLOWED_REASONS.includes(reason)) {
    res.status(400).json({
      error: `Invalid reason. Must be one of: ${ALLOWED_REASONS.join(", ")}`,
    });
    return;
  }

  const msg = await Message.findById(messageId).catch(() => null);
  if (!msg || msg.isDeleted) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  // Must be participant in the conversation
  const conv = await Conversation.findById(msg.conversationId).catch(() => null);
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  const isParticipant = conv.isGroup
    ? (conv.memberIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId)
    : (conv.user1Id?.toString() === req.userId || conv.user2Id?.toString() === req.userId);

  if (!isParticipant) {
    res.status(403).json({ error: "Not authorized to report messages from this conversation" });
    return;
  }

  // Prevent reporting own message
  if (msg.senderId.toString() === req.userId) {
    res.status(400).json({ error: "You cannot report your own message" });
    return;
  }

  // Prevent duplicate reports from the same user for the same message
  const existingReport = await Report.findOne({
    reporterId: req.userId,
    targetMessageId: msg._id,
  });

  if (existingReport) {
    res.status(400).json({
      error: "You have already reported this message and it is under review",
      alreadyReported: true,
      reportId: existingReport._id.toString(),
    });
    return;
  }

  const report = await Report.create({
    reporterId: req.userId,
    targetType: "message",
    targetMessageId: msg._id,
    targetConversationId: conv._id,
    targetUserId: msg.senderId,
    reason,
    details: details?.trim() || null,
    status: "pending",
  });

  res.status(201).json({
    success: true,
    message: "Your report has been received and will be reviewed by moderation",
    report: {
      id: report._id.toString(),
      targetMessageId: msg._id.toString(),
      reason: report.reason,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
    },
  });
});

// ── GET /api/reports (Admin / moderation overview) ────────────────────────────
router.get("/reports", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { status, type } = req.query as { status?: string; type?: string };
  const filter: any = {};
  if (status) filter.status = status;
  if (type) filter.targetType = type;

  const reports = await Report.find(filter)
    .sort({ createdAt: -1 })
    .limit(100);

  const reporterIds = reports.map(r => r.reporterId);
  const targetUserIds = reports.map(r => r.targetUserId).filter(Boolean);
  const messageIds = reports.map(r => r.targetMessageId).filter(Boolean);

  const [users, messages] = await Promise.all([
    User.find({ _id: { $in: [...reporterIds, ...targetUserIds] } }).select("username fullName avatarUrl"),
    Message.find({ _id: { $in: messageIds } }).select("text mediaUrl mediaType isDeleted senderId createdAt"),
  ]);

  const userMap = new Map(users.map(u => [u._id.toString(), u]));
  const msgMap = new Map(messages.map(m => [m._id.toString(), m]));

  const data = reports.map(r => {
    const reporter = userMap.get(r.reporterId.toString());
    const targetUser = r.targetUserId ? userMap.get(r.targetUserId.toString()) : null;
    const msg = r.targetMessageId ? msgMap.get(r.targetMessageId.toString()) : null;

    return {
      id: r._id.toString(),
      targetType: r.targetType,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      reporter: reporter ? {
        id: reporter._id.toString(),
        username: reporter.username,
        fullName: reporter.fullName,
        avatarUrl: reporter.avatarUrl,
      } : null,
      targetUser: targetUser ? {
        id: targetUser._id.toString(),
        username: targetUser.username,
        fullName: targetUser.fullName,
        avatarUrl: targetUser.avatarUrl,
      } : null,
      message: msg ? {
        id: msg._id.toString(),
        text: msg.isDeleted ? "[Deleted message]" : msg.text,
        mediaUrl: msg.isDeleted ? null : msg.mediaUrl,
        mediaType: msg.mediaType,
      } : null,
    };
  });

  res.json({ reports: data });
});

// ── PATCH /api/reports/:reportId (Review / update status) ──────────────────────
router.patch("/reports/:reportId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { status } = req.body as { status?: "reviewed" | "resolved" | "rejected" };
  const valid = ["pending", "reviewed", "resolved", "rejected"];
  if (!status || !valid.includes(status)) {
    res.status(400).json({ error: "Invalid status. Must be pending, reviewed, resolved, or rejected" });
    return;
  }

  const report = await Report.findById(req.params.reportId).catch(() => null);
  if (!report) { res.status(404).json({ error: "Report not found" }); return; }

  report.status = status;
  if (status === "resolved" || status === "rejected" || status === "reviewed") {
    report.resolvedAt = new Date();
    report.resolvedBy = new mongoose.Types.ObjectId(req.userId!);
  }
  await report.save();

  res.json({
    success: true,
    report: {
      id: report._id.toString(),
      status: report.status,
      resolvedAt: report.resolvedAt?.toISOString() ?? null,
    },
  });
});

export default router;

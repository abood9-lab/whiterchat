import { Router, type IRouter } from "express";
import { Conversation, Message, User, Notification, GroupJoinRequest } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { buildUserSummary } from "./users";
import { uploadBase64 } from "../lib/cloudinary";
import mongoose from "mongoose";
import type { Server as SocketServer } from "socket.io";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function getIo(req: AuthRequest): SocketServer | undefined {
  return (req as any).app.get("io");
}

// ── Build a serialised group conversation object ────────────────────────────
export async function buildGroupConversation(conv: any, meId?: string) {
  const meStr = meId ? String(meId) : "";
  const isArchived = (conv.isArchivedBy ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === meStr);
  const isMuted = (conv.isMutedBy ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === meStr);
  const isAdmin = (conv.adminIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === meStr);
  const isModerator = (conv.moderatorIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === meStr);
  const isMember = (conv.memberIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === meStr);
  const isBanned = (conv.bannedUserIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === meStr);

  const lastMsg: any = await Message.findOne({ conversationId: conv._id, isDeleted: false }).sort({ createdAt: -1 });

  // Unread: messages sent by others that don't have meId in readBy
  let unreadCount = 0;
  if (meStr) {
    const meOid = new mongoose.Types.ObjectId(meStr);
    unreadCount = await Message.countDocuments({
      conversationId: conv._id,
      senderId: { $ne: meOid },
      readBy: { $not: { $elemMatch: { $eq: meOid } } },
      isDeleted: false,
    });
  }

  const memberUsers = await User.find({ _id: { $in: conv.memberIds ?? [] } });
  const members = await Promise.all(memberUsers.map((u: any) => buildUserSummary(u, meStr)));

  // Check join request if not a member
  let pendingJoinRequest = null;
  if (meStr && !isMember && !isBanned) {
    pendingJoinRequest = await GroupJoinRequest.findOne({
      groupId: conv._id,
      userId: meStr,
      status: "pending",
    });
  }

  return {
    id: conv._id.toString(),
    isGroup: true,
    groupName: conv.groupName || "Group",
    groupAvatarUrl: conv.groupAvatarUrl ?? null,
    groupCoverUrl: conv.groupCoverUrl ?? null,
    groupDescription: conv.groupDescription ?? null,
    privacy: conv.privacy || "approval_required", // "public" | "approval_required" | "private"
    memberCount: (conv.memberIds ?? []).length,
    members,
    adminIds: (conv.adminIds ?? []).map((id: mongoose.Types.ObjectId) => id.toString()),
    moderatorIds: (conv.moderatorIds ?? []).map((id: mongoose.Types.ObjectId) => id.toString()),
    bannedUserIds: (conv.bannedUserIds ?? []).map((id: mongoose.Types.ObjectId) => id.toString()),
    isAdmin,
    isModerator,
    isMember,
    isBanned,
    hasPendingRequest: Boolean(pendingJoinRequest),
    pendingRequestId: pendingJoinRequest?._id?.toString() ?? null,
    isDisabled: Boolean(conv.isDisabled),
    disabledReason: conv.disabledReason ?? null,
    createdBy: conv.createdBy?.toString() ?? null,
    onlyAdminsCanSend: conv.onlyAdminsCanSend ?? false,
    lastMessage: lastMsg
      ? (lastMsg.isDeleted
          ? "Message deleted"
          : (lastMsg.text ?? (lastMsg.mediaUrl ? `[${lastMsg.mediaType ?? "media"}]` : null)))
      : null,
    lastMessageAt: lastMsg?.createdAt?.toISOString() ?? conv.lastActivityAt?.toISOString() ?? null,
    unreadCount,
    isArchived,
    isMuted,
    disappearAfter: conv.disappearAfter ?? null,
    isBlocked: false,
    isBlockedBy: false,
    myTimeoutUntil: null,
    otherTimeoutUntil: null,
    isRequest: false,
    otherUser: null,
  };
}

// ── Search users to add ─────────────────────────────────────────────────────
router.get("/groups/user-search", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const q = String(req.query.q ?? "").trim();
  if (!q) { res.json([]); return; }
  const users = await User.find({
    _id: { $ne: req.userId },
    $or: [
      { username: { $regex: q, $options: "i" } },
      { fullName: { $regex: q, $options: "i" } },
    ],
  }).limit(15);
  const results = await Promise.all(users.map((u: any) => buildUserSummary(u, req.userId!)));
  res.json(results);
});

// ── Discover explore groups ───────────────────────────────────────────────────
router.get("/groups/discover", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const q = String(req.query.q ?? "").trim();
    const filter: any = {
      isGroup: true,
      isDisabled: { $ne: true },
      privacy: { $in: ["public", "approval_required"] },
    };

    if (q) {
      filter.$or = [
        { groupName: { $regex: q, $options: "i" } },
        { groupDescription: { $regex: q, $options: "i" } },
      ];
    }

    const groups = await Conversation.find(filter)
      .sort({ lastActivityAt: -1 })
      .limit(30);

    const results = await Promise.all(
      groups.map(async (conv) => {
        return buildGroupConversation(conv, req.userId!);
      })
    );

    res.json({ groups: results });
  } catch (err: any) {
    logger.error({ err }, "Error discovering groups");
    res.status(500).json({ error: "Failed to discover groups" });
  }
});

// ── Create group ────────────────────────────────────────────────────────────
router.post("/groups", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { name, description, privacy, memberUsernames, avatarData, coverData } = req.body as {
    name?: string;
    description?: string;
    privacy?: "public" | "approval_required" | "private";
    memberUsernames?: string[];
    avatarData?: string;
    coverData?: string;
  };

  if (!name?.trim()) { res.status(400).json({ error: "Group name is required" }); return; }

  const creatorOid = new mongoose.Types.ObjectId(req.userId!);
  const memberIds: mongoose.Types.ObjectId[] = [creatorOid];

  if (Array.isArray(memberUsernames) && memberUsernames.length > 0) {
    const users = await User.find({ username: { $in: memberUsernames } });
    for (const u of users) {
      if (!memberIds.some(id => id.toString() === u._id.toString())) {
        memberIds.push(u._id);
      }
    }
  }

  let groupAvatarUrl: string | null = null;
  if (avatarData) {
    try {
      const result = await uploadBase64(avatarData, "group_avatars");
      groupAvatarUrl = result.url;
    } catch { /* continue without avatar */ }
  }

  let groupCoverUrl: string | null = null;
  if (coverData) {
    try {
      const result = await uploadBase64(coverData, "group_covers");
      groupCoverUrl = result.url;
    } catch { /* continue without cover */ }
  }

  const validPrivacy = ["public", "approval_required", "private"].includes(privacy || "")
    ? privacy
    : "approval_required";

  const conv = await Conversation.create({
    isGroup: true,
    groupName: name.trim(),
    groupDescription: description?.trim() ?? null,
    groupAvatarUrl,
    groupCoverUrl,
    privacy: validPrivacy,
    memberIds,
    adminIds: [creatorOid],
    moderatorIds: [],
    bannedUserIds: [],
    createdBy: creatorOid,
    onlyAdminsCanSend: false,
    lastActivityAt: new Date(),
  });

  const io = getIo(req);
  if (io) {
    for (const memberId of memberIds) {
      if (memberId.toString() !== req.userId) {
        io.to(`user:${memberId}`).emit("group_created", { groupId: conv._id.toString() });
      }
    }
  }

  res.status(201).json(await buildGroupConversation(conv, req.userId!));
});

// ── Get group info ──────────────────────────────────────────────────────────
router.get("/groups/:groupId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const conv = await Conversation.findOne({ _id: req.params.groupId, isGroup: true }).catch(() => null);
  if (!conv) { res.status(404).json({ error: "Group not found" }); return; }

  const isMember = (conv.memberIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
  const isBanned = (conv.bannedUserIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);

  if (conv.isDisabled && !isMember) {
    res.status(403).json({ error: conv.disabledReason || "This group is suspended." });
    return;
  }

  // Non-members can view group preview if discoverable
  const groupData = await buildGroupConversation(conv, req.userId!);
  res.json(groupData);
});

// ── Request to Join Group (Server-Side Gatekeeper) ──────────────────────────
router.post("/groups/:groupId/join-request", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const conv = await Conversation.findOne({ _id: req.params.groupId, isGroup: true });
    if (!conv) { res.status(404).json({ error: "Group not found" }); return; }

    if (conv.isDisabled) {
      res.status(403).json({ error: conv.disabledReason || "This group is suspended." });
      return;
    }

    const userId = req.userId!;
    const userOid = new mongoose.Types.ObjectId(userId);

    const isBanned = (conv.bannedUserIds ?? []).some((id) => id.toString() === userId);
    if (isBanned) {
      res.status(403).json({ error: "You are banned from joining this group." });
      return;
    }

    const isMember = (conv.memberIds ?? []).some((id) => id.toString() === userId);
    if (isMember) {
      res.status(400).json({ error: "You are already a member of this group." });
      return;
    }

    const { message } = req.body as { message?: string };

    // If group is PUBLIC and privacy === "public", direct join is allowed
    if (conv.privacy === "public") {
      await Conversation.findByIdAndUpdate(conv._id, {
        $addToSet: { memberIds: userOid },
      });

      const io = getIo(req);
      if (io) {
        io.to(`conversation:${conv._id}`).emit("group_members_changed", {
          groupId: conv._id.toString(),
          action: "joined",
          userIds: [userId],
        });
      }

      const updated = await Conversation.findById(conv._id);
      res.json({
        success: true,
        status: "joined",
        message: "You have joined the group.",
        group: await buildGroupConversation(updated, userId),
      });
      return;
    }

    // Otherwise (approval_required or private), create join request
    const existingReq = await GroupJoinRequest.findOne({
      groupId: conv._id,
      userId: userOid,
      status: "pending",
    });

    if (existingReq) {
      res.status(400).json({
        error: "You already have a pending join request for this group.",
        request: existingReq,
      });
      return;
    }

    const joinReq = await GroupJoinRequest.create({
      groupId: conv._id,
      userId: userOid,
      message: message?.trim() || undefined,
      status: "pending",
    });

    const requester = await User.findById(userId);

    // Notify group owner & admins
    const targetAdminIds = (conv.adminIds ?? []).filter((id) => id.toString() !== userId);
    if (conv.createdBy && !targetAdminIds.some((id) => id.toString() === conv.createdBy?.toString())) {
      targetAdminIds.push(conv.createdBy);
    }

    await Promise.all(
      targetAdminIds.map((adminId) =>
        Notification.create({
          userId: adminId,
          actorId: userOid,
          type: "group_join_request",
          conversationId: conv._id,
          messageText: `${requester?.fullName || requester?.username || "A user"} requested to join ${conv.groupName}.`,
          extraData: { requestId: joinReq._id.toString() },
        }).catch(() => {})
      )
    );

    res.status(201).json({
      success: true,
      status: "pending",
      message: "Your request to join has been sent to group administrators.",
      request: joinReq,
    });
  } catch (err: any) {
    logger.error({ err }, "Error handling group join request");
    res.status(500).json({ error: "Failed to submit join request" });
  }
});

// ── List Group Join Requests (Group Admins only) ─────────────────────────────
router.get("/groups/:groupId/join-requests", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const conv = await Conversation.findOne({ _id: req.params.groupId, isGroup: true });
    if (!conv) { res.status(404).json({ error: "Group not found" }); return; }

    const isAdmin = (conv.adminIds ?? []).some((id) => id.toString() === req.userId);
    const isOwner = conv.createdBy?.toString() === req.userId;
    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: "Only group administrators can view join requests." });
      return;
    }

    const requests = await GroupJoinRequest.find({ groupId: conv._id })
      .sort({ createdAt: -1 })
      .populate("userId", "username fullName avatarUrl isVerified verificationBadge bio");

    res.json({ requests });
  } catch (err: any) {
    logger.error({ err }, "Error listing group join requests");
    res.status(500).json({ error: "Failed to fetch join requests" });
  }
});

// ── Approve Join Request (Group Admins only) ─────────────────────────────────
router.post("/groups/:groupId/join-requests/:requestId/approve", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const conv = await Conversation.findOne({ _id: req.params.groupId, isGroup: true });
    if (!conv) { res.status(404).json({ error: "Group not found" }); return; }

    const isAdmin = (conv.adminIds ?? []).some((id) => id.toString() === req.userId);
    const isOwner = conv.createdBy?.toString() === req.userId;
    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: "Only group administrators can approve requests." });
      return;
    }

    const joinReq = await GroupJoinRequest.findOne({
      _id: req.params.requestId,
      groupId: conv._id,
    });

    if (!joinReq) {
      res.status(404).json({ error: "Join request not found." });
      return;
    }

    if (joinReq.status === "approved") {
      res.status(400).json({ error: "Request is already approved." });
      return;
    }

    joinReq.status = "approved";
    joinReq.reviewedBy = new mongoose.Types.ObjectId(req.userId!);
    joinReq.reviewedAt = new Date();
    await joinReq.save();

    // Add user to memberIds
    await Conversation.findByIdAndUpdate(conv._id, {
      $addToSet: { memberIds: joinReq.userId },
      $pull: { bannedUserIds: joinReq.userId },
    });

    // Notify user
    await Notification.create({
      userId: joinReq.userId,
      actorId: new mongoose.Types.ObjectId(req.userId!),
      type: "group_join_approved",
      conversationId: conv._id,
      messageText: `Your request to join "${conv.groupName}" has been approved!`,
    }).catch(() => {});

    const io = getIo(req);
    if (io) {
      io.to(`user:${joinReq.userId}`).emit("group_join_approved", {
        groupId: conv._id.toString(),
        groupName: conv.groupName,
      });
      io.to(`conversation:${conv._id}`).emit("group_members_changed", {
        groupId: conv._id.toString(),
        action: "added",
        userIds: [joinReq.userId.toString()],
      });
    }

    const updated = await Conversation.findById(conv._id);
    res.json({
      success: true,
      message: "Join request approved.",
      request: joinReq,
      group: await buildGroupConversation(updated, req.userId!),
    });
  } catch (err: any) {
    logger.error({ err }, "Error approving join request");
    res.status(500).json({ error: "Failed to approve join request" });
  }
});

// ── Reject Join Request (Group Admins only) ──────────────────────────────────
router.post("/groups/:groupId/join-requests/:requestId/reject", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const conv = await Conversation.findOne({ _id: req.params.groupId, isGroup: true });
    if (!conv) { res.status(404).json({ error: "Group not found" }); return; }

    const isAdmin = (conv.adminIds ?? []).some((id) => id.toString() === req.userId);
    const isOwner = conv.createdBy?.toString() === req.userId;
    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: "Only group administrators can reject requests." });
      return;
    }

    const { reason } = req.body as { reason?: string };

    const joinReq = await GroupJoinRequest.findOne({
      _id: req.params.requestId,
      groupId: conv._id,
    });

    if (!joinReq) {
      res.status(404).json({ error: "Join request not found." });
      return;
    }

    joinReq.status = "rejected";
    joinReq.rejectionReason = reason?.trim() || undefined;
    joinReq.reviewedBy = new mongoose.Types.ObjectId(req.userId!);
    joinReq.reviewedAt = new Date();
    await joinReq.save();

    await Notification.create({
      userId: joinReq.userId,
      actorId: new mongoose.Types.ObjectId(req.userId!),
      type: "group_join_rejected",
      conversationId: conv._id,
      messageText: `Your request to join "${conv.groupName}" was declined.`,
    }).catch(() => {});

    res.json({
      success: true,
      message: "Join request rejected.",
      request: joinReq,
    });
  } catch (err: any) {
    logger.error({ err }, "Error rejecting join request");
    res.status(500).json({ error: "Failed to reject join request" });
  }
});

// ── Member Role Management (Admin / Moderator / Member) ─────────────────────
router.post("/groups/:groupId/members/:targetUserId/role", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const conv = await Conversation.findOne({ _id: req.params.groupId, isGroup: true });
    if (!conv) { res.status(404).json({ error: "Group not found" }); return; }

    const isAdmin = (conv.adminIds ?? []).some((id) => id.toString() === req.userId);
    const isOwner = conv.createdBy?.toString() === req.userId;
    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: "Only group administrators can change member roles." });
      return;
    }

    const { role } = req.body as { role: "admin" | "moderator" | "member" };
    const targetOid = new mongoose.Types.ObjectId(req.params.targetUserId);

    if (role === "admin") {
      await Conversation.findByIdAndUpdate(conv._id, {
        $addToSet: { adminIds: targetOid },
        $pull: { moderatorIds: targetOid },
      });
    } else if (role === "moderator") {
      await Conversation.findByIdAndUpdate(conv._id, {
        $addToSet: { moderatorIds: targetOid },
        $pull: { adminIds: targetOid },
      });
    } else {
      // Regular member
      await Conversation.findByIdAndUpdate(conv._id, {
        $pull: { adminIds: targetOid, moderatorIds: targetOid },
      });
    }

    const updated = await Conversation.findById(conv._id);
    const io = getIo(req);
    if (io) {
      io.to(`conversation:${conv._id}`).emit("group_updated", {
        groupId: conv._id.toString(),
      });
    }

    res.json(await buildGroupConversation(updated, req.userId!));
  } catch (err: any) {
    logger.error({ err }, "Error changing member role");
    res.status(500).json({ error: "Failed to update member role" });
  }
});

// ── Ban / Unban Member ───────────────────────────────────────────────────────
router.post("/groups/:groupId/members/:targetUserId/ban", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const conv = await Conversation.findOne({ _id: req.params.groupId, isGroup: true });
    if (!conv) { res.status(404).json({ error: "Group not found" }); return; }

    const isAdmin = (conv.adminIds ?? []).some((id) => id.toString() === req.userId);
    const isOwner = conv.createdBy?.toString() === req.userId;
    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: "Only group administrators can ban members." });
      return;
    }

    const targetOid = new mongoose.Types.ObjectId(req.params.targetUserId);
    await Conversation.findByIdAndUpdate(conv._id, {
      $pull: { memberIds: targetOid, adminIds: targetOid, moderatorIds: targetOid },
      $addToSet: { bannedUserIds: targetOid },
    });

    const io = getIo(req);
    if (io) {
      io.to(`conversation:${conv._id}`).emit("group_members_changed", {
        groupId: conv._id.toString(),
        action: "banned",
        userIds: [req.params.targetUserId],
      });
      io.to(`user:${req.params.targetUserId}`).emit("group_removed", { groupId: conv._id.toString() });
    }

    res.json({ ok: true, message: "User banned from group." });
  } catch (err: any) {
    logger.error({ err }, "Error banning member");
    res.status(500).json({ error: "Failed to ban member" });
  }
});

router.post("/groups/:groupId/members/:targetUserId/unban", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const conv = await Conversation.findOne({ _id: req.params.groupId, isGroup: true });
    if (!conv) { res.status(404).json({ error: "Group not found" }); return; }

    const isAdmin = (conv.adminIds ?? []).some((id) => id.toString() === req.userId);
    const isOwner = conv.createdBy?.toString() === req.userId;
    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: "Only group administrators can unban members." });
      return;
    }

    const targetOid = new mongoose.Types.ObjectId(req.params.targetUserId);
    await Conversation.findByIdAndUpdate(conv._id, {
      $pull: { bannedUserIds: targetOid },
    });

    res.json({ ok: true, message: "User unbanned." });
  } catch (err: any) {
    logger.error({ err }, "Error unbanning member");
    res.status(500).json({ error: "Failed to unban member" });
  }
});

// ── Update group info (admin only) ──────────────────────────────────────────
router.patch("/groups/:groupId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const conv = await Conversation.findOne({ _id: req.params.groupId, isGroup: true }).catch(() => null);
  if (!conv) { res.status(404).json({ error: "Group not found" }); return; }
  const isAdmin = (conv.adminIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
  const isOwner = conv.createdBy?.toString() === req.userId;
  if (!isAdmin && !isOwner) { res.status(403).json({ error: "Only admins can update group info" }); return; }

  const { name, description, privacy, avatarData, coverData, onlyAdminsCanSend } = req.body as any;
  const updates: Record<string, any> = {};

  if (name !== undefined) updates.groupName = String(name).trim().slice(0, 60);
  if (description !== undefined) updates.groupDescription = description ? String(description).trim().slice(0, 300) : null;
  if (privacy !== undefined && ["public", "approval_required", "private"].includes(privacy)) {
    updates.privacy = privacy;
  }
  if (onlyAdminsCanSend !== undefined) updates.onlyAdminsCanSend = Boolean(onlyAdminsCanSend);

  if (avatarData) {
    try {
      const result = await uploadBase64(avatarData, "group_avatars");
      updates.groupAvatarUrl = result.url;
    } catch { /* ignore upload errors */ }
  }

  if (coverData) {
    try {
      const result = await uploadBase64(coverData, "group_covers");
      updates.groupCoverUrl = result.url;
    } catch { /* ignore upload errors */ }
  }

  const updated = await Conversation.findByIdAndUpdate(conv._id, updates, { new: true });

  const io = getIo(req);
  if (io) {
    io.to(`conversation:${conv._id}`).emit("group_updated", {
      groupId: conv._id.toString(),
      ...updates,
    });
  }

  res.json(await buildGroupConversation(updated, req.userId!));
});

// ── Add members (admin only) ────────────────────────────────────────────────
router.post("/groups/:groupId/members", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const conv = await Conversation.findOne({ _id: req.params.groupId, isGroup: true }).catch(() => null);
  if (!conv) { res.status(404).json({ error: "Group not found" }); return; }
  const isAdmin = (conv.adminIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
  if (!isAdmin) { res.status(403).json({ error: "Only admins can add members" }); return; }

  const { usernames } = req.body as { usernames?: string[] };
  if (!Array.isArray(usernames) || usernames.length === 0) { res.status(400).json({ error: "usernames required" }); return; }

  const users = await User.find({ username: { $in: usernames } });
  if (users.length === 0) { res.status(404).json({ error: "No users found" }); return; }

  const newMemberIds: mongoose.Types.ObjectId[] = users.map((u: any) => u._id);
  await Conversation.findByIdAndUpdate(conv._id, { $addToSet: { memberIds: { $each: newMemberIds } } });

  const io = getIo(req);
  if (io) {
    for (const memberId of newMemberIds) {
      io.to(`user:${memberId}`).emit("group_created", { groupId: conv._id.toString() });
    }
    io.to(`conversation:${conv._id}`).emit("group_members_changed", {
      groupId: conv._id.toString(),
      action: "added",
      userIds: newMemberIds.map(id => id.toString()),
    });
  }

  const updated = await Conversation.findById(conv._id);
  res.json(await buildGroupConversation(updated, req.userId!));
});

// ── Remove member ───────────────────────────────────────────────────────────
router.delete("/groups/:groupId/members/:userId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const conv = await Conversation.findOne({ _id: req.params.groupId, isGroup: true }).catch(() => null);
  if (!conv) { res.status(404).json({ error: "Group not found" }); return; }

  const isAdmin = (conv.adminIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
  const isSelf = req.params.userId === req.userId;

  if (!isAdmin && !isSelf) { res.status(403).json({ error: "Only admins can remove members" }); return; }

  const targetStr = String(req.params.userId);
  const targetOid = new mongoose.Types.ObjectId(targetStr);

  const isTargetAdmin = (conv.adminIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === targetStr);
  if (isTargetAdmin && (conv.adminIds ?? []).length === 1 && (conv.memberIds ?? []).length > 1) {
    res.status(400).json({ error: "Transfer admin role before removing the last admin" }); return;
  }

  await Conversation.findByIdAndUpdate(conv._id, {
    $pull: { memberIds: targetOid, adminIds: targetOid, moderatorIds: targetOid },
  });

  const io = getIo(req);
  if (io) {
    io.to(`conversation:${conv._id}`).emit("group_members_changed", {
      groupId: conv._id.toString(),
      action: "removed",
      userIds: [targetStr],
    });
    io.to(`user:${targetStr}`).emit("group_removed", { groupId: conv._id.toString() });
  }

  res.json({ ok: true });
});

// ── Leave group ─────────────────────────────────────────────────────────────
router.post("/groups/:groupId/leave", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const conv = await Conversation.findOne({ _id: req.params.groupId, isGroup: true }).catch(() => null);
  if (!conv) { res.status(404).json({ error: "Group not found" }); return; }

  const isMember = (conv.memberIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
  if (!isMember) { res.status(400).json({ error: "Not a member" }); return; }

  const meOid = new mongoose.Types.ObjectId(req.userId!);
  const isAdmin = (conv.adminIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
  const remainingMembers = (conv.memberIds ?? []).filter((id: mongoose.Types.ObjectId) => id.toString() !== req.userId);

  if (isAdmin && (conv.adminIds ?? []).length === 1 && remainingMembers.length > 0) {
    await Conversation.findByIdAndUpdate(conv._id, { $addToSet: { adminIds: remainingMembers[0] } });
  }

  await Conversation.findByIdAndUpdate(conv._id, {
    $pull: { memberIds: meOid, adminIds: meOid, moderatorIds: meOid },
  });

  const io = getIo(req);
  if (io) {
    io.to(`conversation:${conv._id}`).emit("group_members_changed", {
      groupId: conv._id.toString(),
      action: "left",
      userIds: [req.userId!],
    });
  }

  res.json({ ok: true });
});

// ── Delete group ────────────────────────────────────────────────────────────
router.delete("/groups/:groupId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const conv = await Conversation.findOne({ _id: req.params.groupId, isGroup: true }).catch(() => null);
  if (!conv) { res.status(404).json({ error: "Group not found" }); return; }
  const isAdmin = (conv.adminIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId);
  const isOwner = conv.createdBy?.toString() === req.userId;
  if (!isAdmin && !isOwner) { res.status(403).json({ error: "Only admins can delete the group" }); return; }

  const io = getIo(req);
  if (io) {
    io.to(`conversation:${conv._id}`).emit("group_deleted", { groupId: conv._id.toString() });
  }

  await GroupJoinRequest.deleteMany({ groupId: conv._id });
  await Message.deleteMany({ conversationId: conv._id });
  await Conversation.findByIdAndDelete(conv._id);

  res.json({ ok: true });
});

export default router;

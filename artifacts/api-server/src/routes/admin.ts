import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import {
  User,
  Post,
  Story,
  Message,
  Conversation,
  Report,
  Feedback,
  AuditLog,
  RefreshToken,
  VerificationPlan,
  VerificationRequest,
  VerificationPaymentConfig,
  GroupJoinRequest,
  Notification,
  PlanConfig,
  Subscription,
  BusinessTeamMember,
  type IUser,
} from "@workspace/db";
import { planService } from "../services/planService";
import {
  requireAdmin,
  requireAdminRole,
  logAdminAction,
  type AdminRequest,
} from "../middlewares/adminAuth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// In-memory or persisted system settings cache
let systemSettings = {
  maintenanceMode: false,
  allowNewRegistrations: true,
  requireEmailVerification: false,
  autoFlagReportThreshold: 3,
  maxDailyPostsPerUser: 50,
  maxDailyReelsPerUser: 30,
  contentFilterStrictness: "standard", // "relaxed" | "standard" | "strict"
};

// ── BOOTSTRAP / PROMOTION HELPER ──────────────────────────────────────────────
// If no admin exists in DB or user is the initial dev user, allows claiming superadmin
router.post("/bootstrap-claim", async (req: AdminRequest, res): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const token = authHeader.slice(7);
    const { verifyToken } = await import("../lib/auth");
    const payload = verifyToken(token);

    const user = await User.findById(payload.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const adminCount = await User.countDocuments({
      role: { $in: ["superadmin", "super_admin", "admin"] },
    });

    const isInitialAdmin = process.env.INITIAL_ADMIN_EMAIL && user.email === process.env.INITIAL_ADMIN_EMAIL.toLowerCase();

    if (adminCount === 0 || user.role === "admin" || isInitialAdmin) {
      user.role = "superadmin";
      await user.save();

      await logAdminAction({
        adminUser: user,
        action: "system.bootstrap_superadmin",
        targetType: "user",
        targetId: user._id.toString(),
        targetSummary: `User @${user.username} claimed superadmin role`,
        reason: "Initial system bootstrap",
        req,
      });

      res.json({
        success: true,
        message: "Superadmin role granted successfully",
        role: "superadmin",
      });
      return;
    }

    res.status(403).json({
      error: "System already has configured administrators. Ask an existing Super Admin to update your role.",
    });
  } catch (err: any) {
    logger.error({ err }, "Bootstrap claim error");
    res.status(500).json({ error: "Failed to process bootstrap request" });
  }
});

// All subsequent admin routes require valid admin authentication
router.use(requireAdmin);

// ── GET /api/admin/me ────────────────────────────────────────────────────────
router.get("/me", async (req: AdminRequest, res): Promise<void> => {
  const user = req.adminUser!;
  res.json({
    admin: {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      role: user.role || "admin",
      isVerified: user.isVerified || false,
      permissions: {
        canManageUsers: ["superadmin", "admin"].includes(user.role || ""),
        canChangeRoles: user.role === "superadmin",
        canModerateContent: ["superadmin", "admin", "moderator"].includes(user.role || ""),
        canResolveReports: ["superadmin", "admin", "moderator"].includes(user.role || ""),
        canManageFeedback: ["superadmin", "admin", "moderator", "support"].includes(user.role || ""),
        canViewAuditLogs: ["superadmin", "admin"].includes(user.role || ""),
        canManageSettings: user.role === "superadmin",
      },
    },
  });
});

// ── GET /api/admin/metrics ────────────────────────────────────────────────────
router.get("/metrics", async (req: AdminRequest, res): Promise<void> => {
  try {
    const range = (req.query.range as string) || "30d";
    const now = new Date();
    let startDate = new Date();

    if (range === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else if (range === "7d") {
      startDate.setDate(now.getDate() - 7);
    } else if (range === "30d") {
      startDate.setDate(now.getDate() - 30);
    } else if (range === "90d") {
      startDate.setDate(now.getDate() - 90);
    } else if (range === "all") {
      startDate = new Date(0);
    } else if (req.query.startDate) {
      startDate = new Date(req.query.startDate as string);
    }

    // Real DB queries executed in parallel
    const [
      totalUsers,
      newUsersInPeriod,
      verifiedUsers,
      suspendedUsers,
      deactivatedUsers,
      totalPosts,
      newPostsInPeriod,
      totalReels,
      newReelsInPeriod,
      totalStories,
      totalReports,
      pendingReports,
      resolvedReports,
      totalFeedback,
      pendingFeedback,
      totalMessages,
      recentAuditLogs,
      pendingVerificationRequests,
      paymentSubmittedVerification,
      approvedVerification,
      totalGroups,
      disabledGroups,
      pendingGroupJoinRequests,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startDate } }),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ isSuspended: true }),
      User.countDocuments({ isDeactivated: true }),
      Post.countDocuments({ isReel: { $ne: true } }),
      Post.countDocuments({ isReel: { $ne: true }, createdAt: { $gte: startDate } }),
      Post.countDocuments({ isReel: true }),
      Post.countDocuments({ isReel: true, createdAt: { $gte: startDate } }),
      Story.countDocuments(),
      Report.countDocuments(),
      Report.countDocuments({ status: "pending" }),
      Report.countDocuments({ status: { $in: ["resolved", "reviewed"] } }),
      Feedback.countDocuments(),
      Feedback.countDocuments({ status: { $in: ["submitted", "under_review", "in_progress"] } }),
      Message.countDocuments({ createdAt: { $gte: startDate } }),
      AuditLog.countDocuments({ createdAt: { $gte: startDate } }),
      VerificationRequest.countDocuments({ status: "pending" }),
      VerificationRequest.countDocuments({ status: "payment_submitted" }),
      VerificationRequest.countDocuments({ status: "approved" }),
      Conversation.countDocuments({ isGroup: true }),
      Conversation.countDocuments({ isGroup: true, isDisabled: true }),
      GroupJoinRequest.countDocuments({ status: "pending" }),
    ]);

    // Aggregate daily series for user signups, content creation, and reports over the last N days (capped at 30 days for charts)
    const chartDays = range === "today" ? 1 : range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const chartStartDate = new Date();
    chartStartDate.setDate(now.getDate() - chartDays);
    chartStartDate.setHours(0, 0, 0, 0);

    const [userDaily, postDaily, reelDaily, reportDaily] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: chartStartDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Post.aggregate([
        { $match: { createdAt: { $gte: chartStartDate }, isReel: { $ne: true } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Post.aggregate([
        { $match: { createdAt: { $gte: chartStartDate }, isReel: true } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Report.aggregate([
        { $match: { createdAt: { $gte: chartStartDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Merge into date-keyed timeline
    const dateMap: Record<string, { date: string; users: number; posts: number; reels: number; reports: number }> = {};
    for (let i = 0; i <= chartDays; i++) {
      const d = new Date(chartStartDate);
      d.setDate(chartStartDate.getDate() + i);
      if (d > now) break;
      const key = d.toISOString().split("T")[0];
      dateMap[key] = { date: key, users: 0, posts: 0, reels: 0, reports: 0 };
    }

    userDaily.forEach((item: any) => { if (dateMap[item._id]) dateMap[item._id].users = item.count; });
    postDaily.forEach((item: any) => { if (dateMap[item._id]) dateMap[item._id].posts = item.count; });
    reelDaily.forEach((item: any) => { if (dateMap[item._id]) dateMap[item._id].reels = item.count; });
    reportDaily.forEach((item: any) => { if (dateMap[item._id]) dateMap[item._id].reports = item.count; });

    const timeline = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      range,
      metrics: {
        users: {
          total: totalUsers,
          newInPeriod: newUsersInPeriod,
          verified: verifiedUsers,
          suspended: suspendedUsers,
          deactivated: deactivatedUsers,
        },
        content: {
          totalPosts,
          newPostsInPeriod,
          totalReels,
          newReelsInPeriod,
          totalStories,
          totalMessagesInPeriod: totalMessages,
        },
        moderation: {
          totalReports,
          pendingReports,
          resolvedReports,
          totalFeedback,
          pendingFeedback,
          auditLogsInPeriod: recentAuditLogs,
        },
        verification: {
          pendingRequests: pendingVerificationRequests,
          paymentSubmitted: paymentSubmittedVerification,
          activeVerified: verifiedUsers,
          approvedTotal: approvedVerification,
        },
        groups: {
          total: totalGroups,
          disabled: disabledGroups,
          pendingJoinRequests: pendingGroupJoinRequests,
        },
      },
      timeline,
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to fetch admin metrics");
    res.status(500).json({ error: "Failed to calculate platform metrics" });
  }
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get("/users", async (req: AdminRequest, res): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = (req.query.search as string)?.trim() || "";
    const role = req.query.role as string;
    const status = req.query.status as string;
    const verified = req.query.verified as string;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const filter: any = {};

    if (search) {
      const reg = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ username: reg }, { fullName: reg }, { email: reg }];
    }

    if (role && role !== "all") {
      filter.role = role;
    }

    if (status === "suspended") {
      filter.isSuspended = true;
    } else if (status === "deactivated") {
      filter.isDeactivated = true;
    } else if (status === "active") {
      filter.isSuspended = { $ne: true };
      filter.isDeactivated = { $ne: true };
    }

    if (verified === "true") {
      filter.isVerified = true;
    } else if (verified === "false") {
      filter.isVerified = { $ne: true };
    }

    const sortOption: any = {};
    if (["createdAt", "username", "followers", "postsCount"].includes(sortBy)) {
      sortOption[sortBy] = sortOrder;
    } else {
      sortOption.createdAt = -1;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select(
          "username email fullName avatarUrl role isVerified isPrivate isDeactivated isSuspended suspensionReason suspendedAt createdAt followers following sessions verificationRequest"
        )
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const sanitizedUsers = users.map((u: any) => ({
      id: u._id.toString(),
      username: u.username,
      email: u.email,
      fullName: u.fullName,
      avatarUrl: u.avatarUrl,
      role: u.role || "user",
      isVerified: !!u.isVerified,
      isPrivate: !!u.isPrivate,
      isDeactivated: !!u.isDeactivated,
      isSuspended: !!u.isSuspended,
      suspensionReason: u.suspensionReason || null,
      suspendedAt: u.suspendedAt || null,
      followersCount: Array.isArray(u.followers) ? u.followers.length : 0,
      followingCount: Array.isArray(u.following) ? u.following.length : 0,
      activeSessionsCount: Array.isArray(u.sessions) ? u.sessions.length : 0,
      verificationStatus: u.verificationRequest?.status || (u.isVerified ? "approved" : "none"),
      createdAt: u.createdAt,
    }));

    res.json({
      users: sanitizedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Admin users fetch error");
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ── GET /api/admin/users/:id ──────────────────────────────────────────────────
router.get("/users/:id", async (req: AdminRequest, res): Promise<void> => {
  try {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }

    const user = await User.findById(userId).select(
      "-passwordHash -twoFactorSecret -twoFactorBackupCodes -vaultPin"
    );

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [postsCount, reelsCount, storiesCount, reportsCount, auditLogs] = await Promise.all([
      Post.countDocuments({ authorId: user._id, isReel: { $ne: true } }),
      Post.countDocuments({ authorId: user._id, isReel: true }),
      Story.countDocuments({ authorId: user._id }),
      Report.countDocuments({ targetUserId: user._id }),
      AuditLog.find({ targetId: user._id.toString() }).sort({ createdAt: -1 }).limit(10),
    ]);

    res.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        coverUrl: user.coverUrl,
        location: user.location,
        website: user.website,
        gender: user.gender,
        phoneNumber: user.phoneNumber,
        role: user.role || "user",
        isVerified: !!user.isVerified,
        isPrivate: !!user.isPrivate,
        isDeactivated: !!user.isDeactivated,
        isSuspended: !!user.isSuspended,
        suspensionReason: user.suspensionReason,
        suspendedAt: user.suspendedAt,
        twoFactorEnabled: !!user.twoFactorEnabled,
        followersCount: user.followers?.length || 0,
        followingCount: user.following?.length || 0,
        postsCount,
        reelsCount,
        storiesCount,
        reportsTargetingUserCount: reportsCount,
        verificationRequest: user.verificationRequest,
        sessionsCount: user.sessions?.length || 0,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      auditLogs: auditLogs.map((l) => ({
        id: l._id.toString(),
        action: l.action,
        adminUsername: l.adminUsername,
        adminRole: l.adminRole,
        reason: l.reason,
        createdAt: l.createdAt,
      })),
    });
  } catch (err: any) {
    logger.error({ err }, "Admin user details error");
    res.status(500).json({ error: "Failed to fetch user details" });
  }
});

// ── PATCH /api/admin/users/:id/status ─────────────────────────────────────────
router.patch("/users/:id/status", requireAdminRole(["superadmin", "admin"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const userId = req.params.id;
    const { action, reason, isVerified } = req.body as {
      action?: "suspend" | "unsuspend" | "deactivate" | "restore" | "set_verified";
      reason?: string;
      isVerified?: boolean;
    };

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      res.status(404).json({ error: "Target user not found" });
      return;
    }

    // Protect superadmin from being modified by lower admins
    if (targetUser.role === "superadmin" && req.adminUser!.role !== "superadmin") {
      res.status(403).json({ error: "Only a Super Admin can modify another Super Admin account" });
      return;
    }

    if (action === "suspend") {
      targetUser.isSuspended = true;
      targetUser.suspensionReason = reason?.trim() || "Account suspended by administration";
      targetUser.suspendedAt = new Date();
      targetUser.suspendedBy = req.adminUser!._id;
      // Terminate active sessions on suspension
      targetUser.sessions = [];
      await RefreshToken.deleteMany({ userId: targetUser._id });
    } else if (action === "unsuspend") {
      targetUser.isSuspended = false;
      targetUser.suspensionReason = undefined;
      targetUser.suspendedAt = undefined;
      targetUser.suspendedBy = undefined;
    } else if (action === "deactivate") {
      targetUser.isDeactivated = true;
      targetUser.sessions = [];
      await RefreshToken.deleteMany({ userId: targetUser._id });
    } else if (action === "restore") {
      targetUser.isDeactivated = false;
    } else if (action === "set_verified") {
      targetUser.isVerified = Boolean(isVerified);
      if (targetUser.verificationRequest) {
        targetUser.verificationRequest.status = isVerified ? "approved" : "rejected";
      }
    }

    await targetUser.save();

    await logAdminAction({
      adminUser: req.adminUser!,
      action: `user.${action}`,
      targetType: "user",
      targetId: targetUser._id.toString(),
      targetSummary: `@${targetUser.username} (${action})`,
      reason: reason?.trim() || `Admin performed ${action}`,
      metadata: { action, isVerified },
      req,
    });

    res.json({
      success: true,
      message: `User status updated successfully (${action})`,
      user: {
        id: targetUser._id.toString(),
        isSuspended: targetUser.isSuspended,
        isDeactivated: targetUser.isDeactivated,
        isVerified: targetUser.isVerified,
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Admin user status update error");
    res.status(500).json({ error: "Failed to update user status" });
  }
});

// ── PATCH /api/admin/users/:id/role ───────────────────────────────────────────
router.patch("/users/:id/role", requireAdminRole(["superadmin"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const userId = req.params.id;
    const { role, reason } = req.body as { role?: string; reason?: string };

    const validRoles = ["user", "creator", "moderator", "admin", "superadmin", "support"];
    if (!role || !validRoles.includes(role)) {
      res.status(400).json({ error: `Invalid role. Allowed roles: ${validRoles.join(", ")}` });
      return;
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      res.status(404).json({ error: "Target user not found" });
      return;
    }

    const oldRole = targetUser.role || "user";
    targetUser.role = role;
    await targetUser.save();

    await logAdminAction({
      adminUser: req.adminUser!,
      action: "user.role_change",
      targetType: "user",
      targetId: targetUser._id.toString(),
      targetSummary: `@${targetUser.username} role changed from ${oldRole} to ${role}`,
      reason: reason?.trim() || "Super Admin modified user role",
      metadata: { oldRole, newRole: role },
      req,
    });

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      user: {
        id: targetUser._id.toString(),
        username: targetUser.username,
        role: targetUser.role,
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Admin user role update error");
    res.status(500).json({ error: "Failed to update user role" });
  }
});

// ── POST /api/admin/users/:id/terminate-sessions ──────────────────────────────
router.post("/users/:id/terminate-sessions", requireAdminRole(["superadmin", "admin"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const userId = req.params.id;
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    targetUser.sessions = [];
    await targetUser.save();
    await RefreshToken.deleteMany({ userId: targetUser._id });

    await logAdminAction({
      adminUser: req.adminUser!,
      action: "security.terminate_sessions",
      targetType: "user",
      targetId: targetUser._id.toString(),
      targetSummary: `Terminated all active sessions for @${targetUser.username}`,
      reason: req.body?.reason || "Admin forced session termination",
      req,
    });

    res.json({ success: true, message: `Terminated all active sessions for @${targetUser.username}` });
  } catch (err: any) {
    logger.error({ err }, "Session termination error");
    res.status(500).json({ error: "Failed to terminate sessions" });
  }
});

// ── GET /api/admin/reports ────────────────────────────────────────────────────
router.get("/reports", async (req: AdminRequest, res): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const status = req.query.status as string;
    const targetType = req.query.targetType as string;

    const filter: any = {};
    if (status && status !== "all") filter.status = status;
    if (targetType && targetType !== "all") filter.targetType = targetType;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("reporterId", "username fullName avatarUrl")
        .populate("targetUserId", "username fullName avatarUrl isSuspended")
        .populate("targetPostId", "caption mediaUrl mediaType isReel authorId")
        .populate("targetMessageId", "text mediaUrl mediaType senderId isDeleted")
        .populate("resolvedBy", "username fullName")
        .lean(),
      Report.countDocuments(filter),
    ]);

    const formattedReports = reports.map((r: any) => ({
      id: r._id.toString(),
      targetType: r.targetType,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt,
      reporter: r.reporterId ? {
        id: r.reporterId._id.toString(),
        username: r.reporterId.username,
        fullName: r.reporterId.fullName,
        avatarUrl: r.reporterId.avatarUrl,
      } : null,
      targetUser: r.targetUserId ? {
        id: r.targetUserId._id.toString(),
        username: r.targetUserId.username,
        fullName: r.targetUserId.fullName,
        avatarUrl: r.targetUserId.avatarUrl,
        isSuspended: !!r.targetUserId.isSuspended,
      } : null,
      targetPost: r.targetPostId ? {
        id: r.targetPostId._id.toString(),
        caption: r.targetPostId.caption,
        mediaUrl: r.targetPostId.mediaUrl,
        mediaType: r.targetPostId.mediaType,
        isReel: !!r.targetPostId.isReel,
      } : null,
      targetMessage: r.targetMessageId ? {
        id: r.targetMessageId._id.toString(),
        text: r.targetMessageId.isDeleted ? "[Deleted Message]" : r.targetMessageId.text,
        mediaUrl: r.targetMessageId.mediaUrl,
        mediaType: r.targetMessageId.mediaType,
      } : null,
      resolvedBy: r.resolvedBy ? {
        id: r.resolvedBy._id.toString(),
        username: r.resolvedBy.username,
      } : null,
    }));

    res.json({
      reports: formattedReports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Admin reports fetch error");
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// ── PATCH /api/admin/reports/:id ──────────────────────────────────────────────
router.patch("/reports/:id", requireAdminRole(["superadmin", "admin", "moderator"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const reportId = req.params.id;
    const { status, notes, actionTaken } = req.body as {
      status?: "reviewed" | "resolved" | "rejected";
      notes?: string;
      actionTaken?: string;
    };

    const validStatuses = ["pending", "reviewed", "resolved", "rejected"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const report = await Report.findById(reportId);
    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    report.status = status;
    report.resolvedAt = new Date();
    report.resolvedBy = req.adminUser!._id;
    await report.save();

    await logAdminAction({
      adminUser: req.adminUser!,
      action: `report.${status}`,
      targetType: "report",
      targetId: report._id.toString(),
      targetSummary: `Report for ${report.targetType} marked as ${status}`,
      reason: notes || actionTaken || `Moderator marked report as ${status}`,
      metadata: { reportReason: report.reason, targetType: report.targetType, actionTaken },
      req,
    });

    res.json({ success: true, message: `Report marked as ${status}`, report: { id: report._id.toString(), status: report.status } });
  } catch (err: any) {
    logger.error({ err }, "Admin report resolution error");
    res.status(500).json({ error: "Failed to update report" });
  }
});

// ── GET /api/admin/content (Posts & Reels) ─────────────────────────────────────
router.get("/content", async (req: AdminRequest, res): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const type = req.query.type as string; // 'all' | 'post' | 'reel'
    const search = (req.query.search as string)?.trim() || "";
    const sortBy = (req.query.sortBy as string) || "createdAt";

    const filter: any = {};
    if (type === "reel") filter.isReel = true;
    else if (type === "post") filter.isReel = { $ne: true };

    if (search) {
      const reg = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ caption: reg }, { location: reg }, { audioTitle: reg }];
    }

    const sortOption: any = {};
    if (sortBy === "views") sortOption.viewsCount = -1;
    else if (sortBy === "likes") sortOption.likes = -1;
    else sortOption.createdAt = -1;

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("authorId", "username fullName avatarUrl isVerified")
        .lean(),
      Post.countDocuments(filter),
    ]);

    const formattedContent = posts.map((p: any) => ({
      id: p._id.toString(),
      caption: p.caption,
      mediaUrl: p.mediaUrl,
      mediaType: p.mediaType,
      thumbnailUrl: p.thumbnailUrl,
      isReel: !!p.isReel,
      location: p.location,
      likesCount: Array.isArray(p.likes) ? p.likes.length : 0,
      commentsCount: Array.isArray(p.comments) ? p.comments.filter((c: any) => !c.isDeleted).length : 0,
      viewsCount: p.viewsCount || 0,
      sharesCount: p.sharesCount || 0,
      commentsDisabled: !!p.commentsDisabled,
      createdAt: p.createdAt,
      author: p.authorId ? {
        id: p.authorId._id.toString(),
        username: p.authorId.username,
        fullName: p.authorId.fullName,
        avatarUrl: p.authorId.avatarUrl,
        isVerified: !!p.authorId.isVerified,
      } : null,
    }));

    res.json({
      content: formattedContent,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Admin content fetch error");
    res.status(500).json({ error: "Failed to fetch content" });
  }
});

// ── DELETE /api/admin/content/:id ─────────────────────────────────────────────
router.delete("/content/:id", requireAdminRole(["superadmin", "admin", "moderator"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const contentId = req.params.id;
    const { reason } = req.body as { reason?: string };

    const post = await Post.findById(contentId).populate("authorId", "username");
    if (!post) {
      res.status(404).json({ error: "Content not found" });
      return;
    }

    const isReel = post.isReel;
    const authorUsername = (post.authorId as any)?.username || "unknown";

    await Post.findByIdAndDelete(contentId);

    // Also auto-resolve any open reports for this content
    await Report.updateMany(
      { targetPostId: new mongoose.Types.ObjectId(contentId), status: "pending" },
      { status: "resolved", resolvedAt: new Date(), resolvedBy: req.adminUser!._id }
    );

    await logAdminAction({
      adminUser: req.adminUser!,
      action: isReel ? "content.delete_reel" : "content.delete_post",
      targetType: isReel ? "reel" : "post",
      targetId: contentId,
      targetSummary: `${isReel ? "Reel" : "Post"} by @${authorUsername}: "${(post.caption || "").slice(0, 40)}"`,
      reason: reason?.trim() || "Violated content guidelines",
      req,
    });

    res.json({ success: true, message: `${isReel ? "Reel" : "Post"} deleted successfully` });
  } catch (err: any) {
    logger.error({ err }, "Admin content delete error");
    res.status(500).json({ error: "Failed to remove content" });
  }
});

// ── GET /api/admin/comments ───────────────────────────────────────────────────
router.get("/comments", async (req: AdminRequest, res): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = (req.query.search as string)?.trim() || "";

    const matchStage: any = { "comments.isDeleted": { $ne: true } };

    const pipeline: any[] = [
      { $unwind: "$comments" },
      { $match: { "comments.isDeleted": { $ne: true } } },
    ];

    if (search) {
      pipeline.push({
        $match: {
          "comments.text": { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
        },
      });
    }

    pipeline.push(
      { $sort: { "comments.createdAt": -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "comments.authorId",
          foreignField: "_id",
          as: "author",
        },
      },
      {
        $project: {
          postId: "$_id",
          postCaption: "$caption",
          postMediaUrl: "$mediaUrl",
          isReel: "$isReel",
          comment: "$comments",
          author: { $arrayElemAt: ["$author", 0] },
        },
      }
    );

    const [commentsAgg, totalAgg] = await Promise.all([
      Post.aggregate(pipeline),
      Post.aggregate([
        { $unwind: "$comments" },
        { $match: { "comments.isDeleted": { $ne: true } } },
        ...(search ? [{ $match: { "comments.text": { $regex: search, $options: "i" } } }] : []),
        { $count: "total" },
      ]),
    ]);

    const total = totalAgg[0]?.total || 0;

    const formattedComments = commentsAgg.map((item: any) => ({
      id: item.comment._id.toString(),
      postId: item.postId.toString(),
      postCaption: item.postCaption,
      postMediaUrl: item.postMediaUrl,
      isReel: !!item.isReel,
      text: item.comment.text,
      mediaUrl: item.comment.mediaUrl,
      mediaType: item.comment.mediaType,
      likesCount: Array.isArray(item.comment.likes) ? item.comment.likes.length : 0,
      createdAt: item.comment.createdAt,
      author: item.author ? {
        id: item.author._id.toString(),
        username: item.author.username,
        fullName: item.author.fullName,
        avatarUrl: item.author.avatarUrl,
      } : null,
    }));

    res.json({
      comments: formattedComments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Admin comments fetch error");
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// ── DELETE /api/admin/comments/:postId/:commentId ─────────────────────────────
router.delete("/comments/:postId/:commentId", requireAdminRole(["superadmin", "admin", "moderator"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const { postId, commentId } = req.params;
    const { reason } = req.body as { reason?: string };

    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    const comment = post.comments.find((c: any) => c._id.toString() === commentId);
    if (!comment) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    comment.isDeleted = true;
    comment.text = "[Removed by Moderator]";
    await post.save();

    await logAdminAction({
      adminUser: req.adminUser!,
      action: "comment.delete",
      targetType: "comment",
      targetId: commentId,
      targetSummary: `Comment on post ${postId}: "${(comment.text || "").slice(0, 40)}"`,
      reason: reason?.trim() || "Violated community guidelines",
      req,
    });

    res.json({ success: true, message: "Comment removed successfully" });
  } catch (err: any) {
    logger.error({ err }, "Admin comment delete error");
    res.status(500).json({ error: "Failed to remove comment" });
  }
});

// ── GET /api/admin/stories ────────────────────────────────────────────────────
router.get("/stories", async (req: AdminRequest, res): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const [stories, total] = await Promise.all([
      Story.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("authorId", "username fullName avatarUrl")
        .lean(),
      Story.countDocuments(),
    ]);

    const formattedStories = stories.map((s: any) => ({
      id: s._id.toString(),
      mediaUrl: s.mediaUrl,
      mediaType: s.mediaType,
      caption: s.caption,
      viewsCount: Array.isArray(s.views) ? s.views.length : 0,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
      author: s.authorId ? {
        id: s.authorId._id.toString(),
        username: s.authorId.username,
        fullName: s.authorId.fullName,
        avatarUrl: s.authorId.avatarUrl,
      } : null,
    }));

    res.json({
      stories: formattedStories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Admin stories fetch error");
    res.status(500).json({ error: "Failed to fetch stories" });
  }
});

// ── DELETE /api/admin/stories/:id ─────────────────────────────────────────────
router.delete("/stories/:id", requireAdminRole(["superadmin", "admin", "moderator"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const storyId = req.params.id;
    const { reason } = req.body as { reason?: string };

    const story = await Story.findById(storyId).populate("authorId", "username");
    if (!story) {
      res.status(404).json({ error: "Story not found" });
      return;
    }

    const authorUsername = (story.authorId as any)?.username || "unknown";
    await Story.findByIdAndDelete(storyId);

    await logAdminAction({
      adminUser: req.adminUser!,
      action: "story.delete",
      targetType: "story",
      targetId: storyId,
      targetSummary: `Story by @${authorUsername}`,
      reason: reason?.trim() || "Violated guidelines",
      req,
    });

    res.json({ success: true, message: "Story removed successfully" });
  } catch (err: any) {
    logger.error({ err }, "Admin story delete error");
    res.status(500).json({ error: "Failed to remove story" });
  }
});

// ── GET /api/admin/feedback ───────────────────────────────────────────────────
router.get("/feedback", async (req: AdminRequest, res): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const status = req.query.status as string;
    const type = req.query.type as string;

    const filter: any = {};
    if (status && status !== "all") filter.status = status;
    if (type && type !== "all") filter.type = type;

    const [feedbacks, total] = await Promise.all([
      Feedback.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("userId", "username fullName avatarUrl email")
        .lean(),
      Feedback.countDocuments(filter),
    ]);

    const formattedFeedback = feedbacks.map((f: any) => ({
      id: f._id.toString(),
      type: f.type,
      title: f.title,
      description: f.description,
      bugDetails: f.bugDetails,
      pageContext: f.pageContext,
      attachments: f.attachments || [],
      status: f.status,
      rating: f.rating,
      adminReplies: f.adminReplies || [],
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      user: f.userId ? {
        id: f.userId._id.toString(),
        username: f.userId.username,
        fullName: f.userId.fullName,
        avatarUrl: f.userId.avatarUrl,
        email: f.userId.email,
      } : null,
    }));

    res.json({
      feedback: formattedFeedback,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Admin feedback fetch error");
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

// ── PATCH /api/admin/feedback/:id ─────────────────────────────────────────────
router.patch("/feedback/:id", requireAdminRole(["superadmin", "admin", "moderator", "support"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const feedbackId = req.params.id;
    const { status, replyText, isInternal } = req.body as {
      status?: "submitted" | "under_review" | "in_progress" | "resolved" | "closed";
      replyText?: string;
      isInternal?: boolean;
    };

    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      res.status(404).json({ error: "Feedback item not found" });
      return;
    }

    if (status) {
      feedback.status = status;
    }

    if (replyText?.trim()) {
      feedback.adminReplies.push({
        adminId: req.adminUser!._id,
        adminUsername: req.adminUser!.username,
        text: replyText.trim(),
        isInternal: Boolean(isInternal),
        createdAt: new Date(),
      });
    }

    await feedback.save();

    await logAdminAction({
      adminUser: req.adminUser!,
      action: "feedback.update",
      targetType: "feedback",
      targetId: feedback._id.toString(),
      targetSummary: `Feedback #${feedbackId.slice(-6)}: "${feedback.title}" -> ${feedback.status}`,
      reason: replyText ? "Added official response" : "Updated ticket status",
      metadata: { newStatus: feedback.status, replyAdded: !!replyText },
      req,
    });

    res.json({
      success: true,
      message: "Feedback updated successfully",
      feedback: {
        id: feedback._id.toString(),
        status: feedback.status,
        adminReplies: feedback.adminReplies,
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Admin feedback update error");
    res.status(500).json({ error: "Failed to update feedback" });
  }
});

// ── GET /api/admin/audit-logs ─────────────────────────────────────────────────
router.get("/audit-logs", requireAdminRole(["superadmin", "admin"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const action = req.query.action as string;
    const targetType = req.query.targetType as string;
    const search = (req.query.search as string)?.trim() || "";

    const filter: any = {};
    if (action && action !== "all") filter.action = action;
    if (targetType && targetType !== "all") filter.targetType = targetType;
    if (search) {
      const reg = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { adminUsername: reg },
        { targetSummary: reg },
        { reason: reg },
        { action: reg },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      logs: logs.map((l: any) => ({
        id: l._id.toString(),
        adminId: l.adminId?.toString(),
        adminUsername: l.adminUsername,
        adminRole: l.adminRole,
        action: l.action,
        targetType: l.targetType,
        targetId: l.targetId,
        targetSummary: l.targetSummary,
        reason: l.reason,
        metadata: l.metadata,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Admin audit logs fetch error");
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// ── GET /api/admin/security/events ────────────────────────────────────────────
router.get("/security/events", requireAdminRole(["superadmin", "admin"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const [
      twoFactorUsers,
      totalUsers,
      suspendedUsers,
      recentSuspensions,
      adminUsers,
      activeSessionsTotal,
    ] = await Promise.all([
      User.countDocuments({ twoFactorEnabled: true }),
      User.countDocuments(),
      User.countDocuments({ isSuspended: true }),
      AuditLog.find({ action: "user.suspend" }).sort({ createdAt: -1 }).limit(10).lean(),
      User.find({ role: { $in: ["superadmin", "admin", "moderator", "support"] } })
        .select("username email role isVerified twoFactorEnabled createdAt sessions")
        .lean(),
      User.aggregate([
        { $project: { sessionCount: { $size: { $ifNull: ["$sessions", []] } } } },
        { $group: { _id: null, total: { $sum: "$sessionCount" } } },
      ]),
    ]);

    res.json({
      stats: {
        twoFactorAdoptionRate: totalUsers > 0 ? Math.round((twoFactorUsers / totalUsers) * 100) : 0,
        twoFactorCount: twoFactorUsers,
        totalUsers,
        suspendedCount: suspendedUsers,
        totalActiveSessions: activeSessionsTotal[0]?.total || 0,
      },
      administrators: adminUsers.map((a: any) => ({
        id: a._id.toString(),
        username: a.username,
        email: a.email,
        role: a.role,
        isVerified: !!a.isVerified,
        twoFactorEnabled: !!a.twoFactorEnabled,
        activeSessions: Array.isArray(a.sessions) ? a.sessions.length : 0,
        createdAt: a.createdAt,
      })),
      recentSecurityActions: recentSuspensions.map((s: any) => ({
        id: s._id.toString(),
        adminUsername: s.adminUsername,
        targetSummary: s.targetSummary,
        reason: s.reason,
        createdAt: s.createdAt,
      })),
    });
  } catch (err: any) {
    logger.error({ err }, "Admin security fetch error");
    res.status(500).json({ error: "Failed to fetch security stats" });
  }
});

// ── GET /api/admin/search ─────────────────────────────────────────────────────
router.get("/search", async (req: AdminRequest, res): Promise<void> => {
  try {
    const q = (req.query.q as string)?.trim() || "";
    if (!q || q.length < 2) {
      res.json({ users: [], posts: [], reports: [], feedback: [] });
      return;
    }

    const reg = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const [users, posts, reports, feedback] = await Promise.all([
      User.find({ $or: [{ username: reg }, { fullName: reg }, { email: reg }] })
        .select("username fullName avatarUrl email role isVerified isSuspended createdAt")
        .limit(5)
        .lean(),
      Post.find({ caption: reg })
        .select("caption mediaUrl mediaType isReel authorId createdAt")
        .populate("authorId", "username fullName")
        .limit(5)
        .lean(),
      Report.find({ $or: [{ reason: reg }, { details: reg }] })
        .populate("reporterId", "username")
        .populate("targetUserId", "username")
        .limit(5)
        .lean(),
      Feedback.find({ $or: [{ title: reg }, { description: reg }] })
        .populate("userId", "username")
        .limit(5)
        .lean(),
    ]);

    res.json({
      users: users.map((u: any) => ({
        id: u._id.toString(),
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        avatarUrl: u.avatarUrl,
        role: u.role || "user",
        isVerified: !!u.isVerified,
        isSuspended: !!u.isSuspended,
      })),
      posts: posts.map((p: any) => ({
        id: p._id.toString(),
        caption: p.caption,
        mediaUrl: p.mediaUrl,
        mediaType: p.mediaType,
        isReel: !!p.isReel,
        author: p.authorId ? { username: p.authorId.username } : null,
      })),
      reports: reports.map((r: any) => ({
        id: r._id.toString(),
        targetType: r.targetType,
        reason: r.reason,
        status: r.status,
      })),
      feedback: feedback.map((f: any) => ({
        id: f._id.toString(),
        type: f.type,
        title: f.title,
        status: f.status,
      })),
    });
  } catch (err: any) {
    logger.error({ err }, "Admin search error");
    res.status(500).json({ error: "Search failed" });
  }
});

// ── GET /api/admin/settings ───────────────────────────────────────────────────
router.get("/settings", async (_req: AdminRequest, res): Promise<void> => {
  res.json({ settings: systemSettings });
});

// ── PATCH /api/admin/settings ─────────────────────────────────────────────────
router.patch("/settings", requireAdminRole(["superadmin"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const { updates, reason } = req.body as { updates: Partial<typeof systemSettings>; reason?: string };
    if (!updates || typeof updates !== "object") {
      res.status(400).json({ error: "Invalid updates payload" });
      return;
    }

    const oldSettings = { ...systemSettings };
    systemSettings = { ...systemSettings, ...updates };

    await logAdminAction({
      adminUser: req.adminUser!,
      action: "settings.update",
      targetType: "settings",
      targetSummary: "Updated system settings",
      reason: reason || "Super Admin adjusted system parameters",
      metadata: { oldSettings, newSettings: systemSettings },
      req,
    });

    res.json({ success: true, settings: systemSettings });
  } catch (err: any) {
    logger.error({ err }, "Admin settings update error");
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ── VERIFICATION MANAGEMENT ───────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/verification/plans ─────────────────────────────────────────
router.get("/verification/plans", async (_req: AdminRequest, res): Promise<void> => {
  try {
    const plans = await VerificationPlan.find().sort({ order: 1, createdAt: 1 });
    res.json({ plans });
  } catch (err: any) {
    logger.error({ err }, "Admin get verification plans error");
    res.status(500).json({ error: "Failed to fetch verification plans" });
  }
});

// ── POST /api/admin/verification/plans ────────────────────────────────────────
router.post("/verification/plans", requireAdminRole(["superadmin", "admin"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const { name, description, price, currency, durationDays, badgeType, perks, isActive, isPopular, order } = req.body;
    if (!name || price === undefined) {
      res.status(400).json({ error: "Plan name and price are required" });
      return;
    }

    const plan = await VerificationPlan.create({
      name: String(name).trim(),
      description: description ? String(description).trim() : "",
      price: Number(price),
      currency: currency || "JOD",
      durationDays: Number(durationDays) || 30,
      badgeType: badgeType || "blue_check",
      perks: Array.isArray(perks) ? perks.map(String) : [],
      isActive: isActive !== false,
      isPopular: Boolean(isPopular),
      order: Number(order) || 0,
    });

    await logAdminAction({
      adminUser: req.adminUser!,
      action: "verification.create_plan",
      targetType: "plan",
      targetId: plan._id.toString(),
      targetSummary: `Created verification plan: ${plan.name} (${plan.price} ${plan.currency})`,
      req,
    });

    res.status(201).json({ success: true, plan });
  } catch (err: any) {
    logger.error({ err }, "Admin create verification plan error");
    res.status(500).json({ error: "Failed to create verification plan" });
  }
});

// ── PUT /api/admin/verification/plans/:id ─────────────────────────────────────
router.put("/verification/plans/:id", requireAdminRole(["superadmin", "admin"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const { name, description, price, currency, durationDays, badgeType, perks, isActive, isPopular, order } = req.body;
    const plan = await VerificationPlan.findById(req.params.id);
    if (!plan) {
      res.status(404).json({ error: "Verification plan not found" });
      return;
    }

    if (name !== undefined) plan.name = String(name).trim();
    if (description !== undefined) plan.description = String(description).trim();
    if (price !== undefined) plan.price = Number(price);
    if (currency !== undefined) plan.currency = String(currency).trim();
    if (durationDays !== undefined) plan.durationDays = Number(durationDays);
    if (badgeType !== undefined) plan.badgeType = String(badgeType);
    if (perks !== undefined && Array.isArray(perks)) plan.perks = perks.map(String);
    if (isActive !== undefined) plan.isActive = Boolean(isActive);
    if (isPopular !== undefined) plan.isPopular = Boolean(isPopular);
    if (order !== undefined) plan.order = Number(order);

    await plan.save();

    await logAdminAction({
      adminUser: req.adminUser!,
      action: "verification.update_plan",
      targetType: "plan",
      targetId: plan._id.toString(),
      targetSummary: `Updated verification plan: ${plan.name}`,
      req,
    });

    res.json({ success: true, plan });
  } catch (err: any) {
    logger.error({ err }, "Admin update verification plan error");
    res.status(500).json({ error: "Failed to update verification plan" });
  }
});

// ── DELETE /api/admin/verification/plans/:id ──────────────────────────────────
router.delete("/verification/plans/:id", requireAdminRole(["superadmin", "admin"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const plan = await VerificationPlan.findById(req.params.id);
    if (!plan) {
      res.status(404).json({ error: "Verification plan not found" });
      return;
    }

    const planName = plan.name;
    await VerificationPlan.findByIdAndDelete(plan._id);

    await logAdminAction({
      adminUser: req.adminUser!,
      action: "verification.delete_plan",
      targetType: "plan",
      targetId: req.params.id,
      targetSummary: `Deleted verification plan: ${planName}`,
      req,
    });

    res.json({ success: true, message: "Verification plan deleted" });
  } catch (err: any) {
    logger.error({ err }, "Admin delete verification plan error");
    res.status(500).json({ error: "Failed to delete verification plan" });
  }
});

// ── GET /api/admin/verification/payment-config ────────────────────────────────
router.get("/verification/payment-config", async (_req: AdminRequest, res): Promise<void> => {
  try {
    let config = await VerificationPaymentConfig.findOne({ isDefault: true });
    if (!config) {
      config = await VerificationPaymentConfig.create({
        paymentMethodName: "CliQ & Mobile Wallet (Jordan)",
        walletName: "CliQ Jordan / Zain Cash",
        walletAddress: "WHITERCHAT@CLIQ",
        currency: "JOD",
        instructions:
          "1. Open your banking app or digital wallet (CliQ, Zain Cash, Orange Money).\n2. Send the exact plan amount to the CliQ Alias: WHITERCHAT@CLIQ\n3. Note down the Transaction Reference number.\n4. Click 'I've Paid' below and enter your reference ID or attach your transfer receipt.",
        additionalNotes: "Manual verification is audited by our compliance team within 15 minutes to 2 hours.",
        isDefault: true,
        isActive: true,
      });
    }
    res.json({ config });
  } catch (err: any) {
    logger.error({ err }, "Admin get payment config error");
    res.status(500).json({ error: "Failed to fetch payment config" });
  }
});

// ── PUT /api/admin/verification/payment-config ────────────────────────────────
router.put("/verification/payment-config", requireAdminRole(["superadmin", "admin"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const { paymentMethodName, walletName, walletAddress, currency, instructions, additionalNotes, isActive } = req.body;
    let config = await VerificationPaymentConfig.findOne({ isDefault: true });
    if (!config) {
      config = new VerificationPaymentConfig({ isDefault: true });
    }

    if (paymentMethodName !== undefined) config.paymentMethodName = String(paymentMethodName).trim();
    if (walletName !== undefined) config.walletName = String(walletName).trim();
    if (walletAddress !== undefined) config.walletAddress = String(walletAddress).trim();
    if (currency !== undefined) config.currency = String(currency).trim();
    if (instructions !== undefined) config.instructions = String(instructions).trim();
    if (additionalNotes !== undefined) config.additionalNotes = String(additionalNotes).trim();
    if (isActive !== undefined) config.isActive = Boolean(isActive);

    await config.save();

    await logAdminAction({
      adminUser: req.adminUser!,
      action: "verification.update_payment_config",
      targetType: "settings",
      targetSummary: `Updated manual payment instructions (${config.paymentMethodName} - ${config.walletAddress})`,
      req,
    });

    res.json({ success: true, config });
  } catch (err: any) {
    logger.error({ err }, "Admin update payment config error");
    res.status(500).json({ error: "Failed to update payment config" });
  }
});

// ── GET /api/admin/verification/requests ──────────────────────────────────────
router.get("/verification/requests", async (req: AdminRequest, res): Promise<void> => {
  try {
    const { status, search, page = "1", limit = "20" } = req.query as {
      status?: string;
      search?: string;
      page?: string;
      limit?: string;
    };

    const filter: any = {};
    if (status && status !== "all") {
      filter.status = status;
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (p - 1) * l;

    if (search && search.trim()) {
      const users = await User.find({
        $or: [
          { username: { $regex: search.trim(), $options: "i" } },
          { fullName: { $regex: search.trim(), $options: "i" } },
          { email: { $regex: search.trim(), $options: "i" } },
        ],
      }).select("_id");
      const userIds = users.map((u) => u._id);
      filter.userId = { $in: userIds };
    }

    const [total, requests, counts] = await Promise.all([
      VerificationRequest.countDocuments(filter),
      VerificationRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(l)
        .populate("userId", "username fullName email avatarUrl isVerified verificationBadge createdAt")
        .populate("planId")
        .populate("reviewedBy", "username fullName")
        .populate("paymentInstructions.sentBy", "username fullName"),
      Promise.all([
        VerificationRequest.countDocuments({ status: "pending" }),
        VerificationRequest.countDocuments({ status: "awaiting_payment" }),
        VerificationRequest.countDocuments({ status: "payment_submitted" }),
        VerificationRequest.countDocuments({ status: "approved" }),
        VerificationRequest.countDocuments({ status: "rejected" }),
      ]),
    ]);

    res.json({
      total,
      page: p,
      limit: l,
      requests,
      counts: {
        pending: counts[0],
        awaiting_payment: counts[1],
        payment_submitted: counts[2],
        approved: counts[3],
        rejected: counts[4],
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Admin get verification requests error");
    res.status(500).json({ error: "Failed to fetch verification requests" });
  }
});

// ── GET /api/admin/verification/requests/:id ──────────────────────────────────
router.get("/verification/requests/:id", async (req: AdminRequest, res): Promise<void> => {
  try {
    const request = await VerificationRequest.findById(req.params.id)
      .populate("userId", "username fullName email avatarUrl isVerified verificationBadge bio createdAt followers following")
      .populate("planId")
      .populate("reviewedBy", "username fullName")
      .populate("paymentInstructions.sentBy", "username fullName");

    if (!request) {
      res.status(404).json({ error: "Verification request not found" });
      return;
    }

    res.json({ request });
  } catch (err: any) {
    logger.error({ err }, "Admin get request detail error");
    res.status(500).json({ error: "Failed to fetch request detail" });
  }
});

// ── POST /api/admin/verification/requests/:id/send-instructions ───────────────
router.post("/verification/requests/:id/send-instructions", async (req: AdminRequest, res): Promise<void> => {
  try {
    const request = await VerificationRequest.findById(req.params.id).populate("userId");
    if (!request) {
      res.status(404).json({ error: "Verification request not found" });
      return;
    }

    const { methodName, walletName, walletAddress, currency, instructions, additionalNotes } = req.body;

    // Fetch default config if custom fields not provided
    const defaultConfig = await VerificationPaymentConfig.findOne({ isDefault: true });

    request.status = "awaiting_payment";
    request.paymentInstructions = {
      methodName: methodName || defaultConfig?.paymentMethodName || "CliQ / Wallet Transfer",
      walletName: walletName || defaultConfig?.walletName || "CliQ Jordan",
      walletAddress: walletAddress || defaultConfig?.walletAddress || "WHITERCHAT@CLIQ",
      currency: currency || request.planSnapshot?.currency || "JOD",
      instructions: instructions || defaultConfig?.instructions || "Send exact amount to CliQ alias and submit confirmation.",
      additionalNotes: additionalNotes || defaultConfig?.additionalNotes || "",
      sentBy: req.adminUser!._id,
      sentAt: new Date(),
    };
    await request.save();

    const targetUser = await User.findById(request.userId);
    if (targetUser) {
      targetUser.verificationStatus = "awaiting_payment";
      await targetUser.save();

      // Create notification
      await Notification.create({
        userId: targetUser._id,
        actorId: req.adminUser!._id,
        type: "verification_payment_instructions",
        messageText: `Payment instructions for your ${request.planSnapshot.name} plan verification have been sent. Check your Verification Center.`,
        extraData: { requestId: request._id.toString() },
      });
    }

    await logAdminAction({
      adminUser: req.adminUser!,
      action: "verification.send_instructions",
      targetType: "verification",
      targetId: request._id.toString(),
      targetSummary: `Sent payment instructions to @${targetUser?.username} for plan ${request.planSnapshot.name}`,
      req,
    });

    res.json({ success: true, message: "Payment instructions sent to user", request });
  } catch (err: any) {
    logger.error({ err }, "Admin send instructions error");
    res.status(500).json({ error: "Failed to send instructions" });
  }
});

// ── POST /api/admin/verification/requests/:id/approve ─────────────────────────
router.post("/verification/requests/:id/approve", requireAdminRole(["superadmin", "admin", "moderator"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const request = await VerificationRequest.findById(req.params.id);
    if (!request) {
      res.status(404).json({ error: "Verification request not found" });
      return;
    }

    const { notes } = req.body as { notes?: string };
    const targetUser = await User.findById(request.userId);
    if (!targetUser) {
      res.status(404).json({ error: "Target user not found" });
      return;
    }

    const durationDays = request.planSnapshot?.durationDays || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    request.status = "approved";
    request.reviewedBy = req.adminUser!._id;
    request.reviewedAt = new Date();
    request.adminNotes = notes?.trim() || undefined;
    await request.save();

    // Update User Profile
    targetUser.isVerified = true;
    targetUser.verificationBadge = request.planSnapshot?.badgeType || "blue_check";
    targetUser.verificationPlanId = request.planId ? new mongoose.Types.ObjectId(request.planId.toString()) : undefined;
    targetUser.verificationPlanName = request.planSnapshot?.name || "Verified";
    targetUser.verificationExpiresAt = expiresAt;
    targetUser.verificationStartedAt = new Date();
    targetUser.verificationStatus = "approved";
    await targetUser.save();

    // Create Notification
    await Notification.create({
      userId: targetUser._id,
      actorId: req.adminUser!._id,
      type: "verification_approved",
      messageText: `Congratulations! Your verification for "${request.planSnapshot.name}" has been approved. Your badge is now active until ${expiresAt.toLocaleDateString()}.`,
    });

    await logAdminAction({
      adminUser: req.adminUser!,
      action: "verification.approve",
      targetType: "verification",
      targetId: request._id.toString(),
      targetSummary: `Approved verification request for @${targetUser.username} (${request.planSnapshot.name})`,
      reason: notes || "Payment verified manually by admin",
      req,
    });

    res.json({ success: true, message: "Verification approved successfully", request, user: targetUser });
  } catch (err: any) {
    logger.error({ err }, "Admin approve verification error");
    res.status(500).json({ error: "Failed to approve verification" });
  }
});

// ── POST /api/admin/verification/requests/:id/reject ──────────────────────────
router.post("/verification/requests/:id/reject", requireAdminRole(["superadmin", "admin", "moderator"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const request = await VerificationRequest.findById(req.params.id);
    if (!request) {
      res.status(404).json({ error: "Verification request not found" });
      return;
    }

    const { reason, notes } = req.body as { reason?: string; notes?: string };
    const rejectionReason = reason?.trim() || "Payment receipt could not be verified or requirements not met.";

    request.status = "rejected";
    request.rejectionReason = rejectionReason;
    request.adminNotes = notes?.trim() || undefined;
    request.reviewedBy = req.adminUser!._id;
    request.reviewedAt = new Date();
    await request.save();

    const targetUser = await User.findById(request.userId);
    if (targetUser) {
      targetUser.verificationStatus = "rejected";
      await targetUser.save();

      await Notification.create({
        userId: targetUser._id,
        actorId: req.adminUser!._id,
        type: "verification_rejected",
        messageText: `Your verification request was rejected: ${rejectionReason}`,
      });
    }

    await logAdminAction({
      adminUser: req.adminUser!,
      action: "verification.reject",
      targetType: "verification",
      targetId: request._id.toString(),
      targetSummary: `Rejected verification request for @${targetUser?.username}`,
      reason: rejectionReason,
      req,
    });

    res.json({ success: true, message: "Verification request rejected", request });
  } catch (err: any) {
    logger.error({ err }, "Admin reject verification error");
    res.status(500).json({ error: "Failed to reject verification" });
  }
});

// ── POST /api/admin/verification/users/:userId/revoke ─────────────────────────
router.post("/verification/users/:userId/revoke", requireAdminRole(["superadmin", "admin"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { reason } = req.body as { reason?: string };

    user.isVerified = false;
    user.verificationStatus = "revoked";
    user.verificationExpiresAt = new Date();
    await user.save();

    await Notification.create({
      userId: user._id,
      actorId: req.adminUser!._id,
      type: "system",
      messageText: `Your verification badge has been revoked by administration: ${reason || "Policy violation"}`,
    });

    await logAdminAction({
      adminUser: req.adminUser!,
      action: "verification.revoke",
      targetType: "user",
      targetId: user._id.toString(),
      targetSummary: `Revoked verification badge from @${user.username}`,
      reason: reason || "Manual admin revocation",
      req,
    });

    res.json({ success: true, message: `Verification badge revoked from @${user.username}` });
  } catch (err: any) {
    logger.error({ err }, "Admin revoke verification error");
    res.status(500).json({ error: "Failed to revoke verification" });
  }
});

// ── POST /api/admin/verification/users/:userId/grant-manual ───────────────────
router.post("/verification/users/:userId/grant-manual", requireAdminRole(["superadmin", "admin"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { badgeType, planName, durationDays = 365, reason } = req.body;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(durationDays));

    user.isVerified = true;
    user.verificationBadge = badgeType || "blue_check";
    user.verificationPlanName = planName || "Direct Admin Grant";
    user.verificationExpiresAt = expiresAt;
    user.verificationStartedAt = new Date();
    user.verificationStatus = "approved";
    await user.save();

    await Notification.create({
      userId: user._id,
      actorId: req.adminUser!._id,
      type: "verification_approved",
      messageText: `You have been directly granted a verified account badge by WhiterChat Administration.`,
    });

    await logAdminAction({
      adminUser: req.adminUser!,
      action: "verification.grant_manual",
      targetType: "user",
      targetId: user._id.toString(),
      targetSummary: `Directly granted ${badgeType || "blue"} verification badge to @${user.username}`,
      reason: reason || "Administrative privilege grant",
      req,
    });

    res.json({ success: true, message: `Verification granted to @${user.username}`, user });
  } catch (err: any) {
    logger.error({ err }, "Admin grant manual verification error");
    res.status(500).json({ error: "Failed to grant verification" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ── GROUPS MANAGEMENT (ADMIN) ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/groups ─────────────────────────────────────────────────────
router.get("/groups", async (req: AdminRequest, res): Promise<void> => {
  try {
    const { search, privacy, status, page = "1", limit = "20" } = req.query as {
      search?: string;
      privacy?: string;
      status?: string;
      page?: string;
      limit?: string;
    };

    const filter: any = { isGroup: true };
    if (privacy && privacy !== "all") {
      filter.privacy = privacy;
    }
    if (status === "active") {
      filter.isDisabled = { $ne: true };
    } else if (status === "disabled") {
      filter.isDisabled = true;
    }

    if (search && search.trim()) {
      filter.$or = [
        { groupName: { $regex: search.trim(), $options: "i" } },
        { groupDescription: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (p - 1) * l;

    const [total, groups, counts] = await Promise.all([
      Conversation.countDocuments(filter),
      Conversation.find(filter)
        .sort({ lastActivityAt: -1 })
        .skip(skip)
        .limit(l)
        .populate("createdBy", "username fullName avatarUrl email isVerified")
        .populate("adminIds", "username fullName avatarUrl isVerified")
        .populate("moderatorIds", "username fullName avatarUrl isVerified"),
      Promise.all([
        Conversation.countDocuments({ isGroup: true }),
        Conversation.countDocuments({ isGroup: true, isDisabled: { $ne: true } }),
        Conversation.countDocuments({ isGroup: true, isDisabled: true }),
        GroupJoinRequest.countDocuments({ status: "pending" }),
      ]),
    ]);

    // Attach member counts and report counts for each group
    const groupsWithStats = await Promise.all(
      groups.map(async (g) => {
        const reportCount = await Report.countDocuments({
          targetType: "group",
          targetConversationId: g._id,
          status: "pending",
        });
        const joinRequestsCount = await GroupJoinRequest.countDocuments({
          groupId: g._id,
          status: "pending",
        });
        const messageCount = await Message.countDocuments({
          conversationId: g._id,
          isDeleted: false,
        });

        return {
          id: g._id.toString(),
          groupName: g.groupName || "Unnamed Group",
          groupDescription: g.groupDescription,
          groupAvatarUrl: g.groupAvatarUrl,
          groupCoverUrl: g.groupCoverUrl,
          privacy: g.privacy || "approval_required",
          memberCount: (g.memberIds ?? []).length,
          adminCount: (g.adminIds ?? []).length,
          moderatorCount: (g.moderatorIds ?? []).length,
          bannedCount: (g.bannedUserIds ?? []).length,
          createdBy: g.createdBy,
          admins: g.adminIds,
          moderators: g.moderatorIds,
          onlyAdminsCanSend: g.onlyAdminsCanSend,
          isDisabled: Boolean(g.isDisabled),
          disabledReason: g.disabledReason,
          disabledAt: g.disabledAt,
          pendingReportsCount: reportCount,
          pendingJoinRequestsCount: joinRequestsCount,
          messageCount,
          lastActivityAt: g.lastActivityAt,
          createdAt: g.createdAt,
        };
      })
    );

    res.json({
      total,
      page: p,
      limit: l,
      groups: groupsWithStats,
      counts: {
        total: counts[0],
        active: counts[1],
        disabled: counts[2],
        pendingJoinRequests: counts[3],
      },
    });
  } catch (err: any) {
    logger.error({ err }, "Admin get groups error");
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

// ── GET /api/admin/groups/:id ─────────────────────────────────────────────────
router.get("/groups/:id", async (req: AdminRequest, res): Promise<void> => {
  try {
    const group = await Conversation.findOne({ _id: req.params.id, isGroup: true })
      .populate("createdBy", "username fullName avatarUrl email isVerified verificationBadge createdAt")
      .populate("adminIds", "username fullName avatarUrl email isVerified verificationBadge")
      .populate("moderatorIds", "username fullName avatarUrl email isVerified verificationBadge")
      .populate("memberIds", "username fullName avatarUrl email isVerified verificationBadge")
      .populate("bannedUserIds", "username fullName avatarUrl email isVerified")
      .populate("disabledBy", "username fullName");

    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    const [joinRequests, reports, recentMessages] = await Promise.all([
      GroupJoinRequest.find({ groupId: group._id })
        .sort({ createdAt: -1 })
        .limit(30)
        .populate("userId", "username fullName avatarUrl isVerified")
        .populate("reviewedBy", "username fullName"),
      Report.find({ targetType: "group", targetConversationId: group._id })
        .sort({ createdAt: -1 })
        .populate("reporterId", "username fullName avatarUrl"),
      Message.find({ conversationId: group._id, isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("senderId", "username fullName avatarUrl"),
    ]);

    res.json({
      group: {
        id: group._id.toString(),
        groupName: group.groupName,
        groupDescription: group.groupDescription,
        groupAvatarUrl: group.groupAvatarUrl,
        groupCoverUrl: group.groupCoverUrl,
        privacy: group.privacy || "approval_required",
        memberCount: (group.memberIds ?? []).length,
        members: group.memberIds,
        admins: group.adminIds,
        moderators: group.moderatorIds,
        bannedUsers: group.bannedUserIds,
        createdBy: group.createdBy,
        onlyAdminsCanSend: group.onlyAdminsCanSend,
        isDisabled: Boolean(group.isDisabled),
        disabledReason: group.disabledReason,
        disabledAt: group.disabledAt,
        disabledBy: group.disabledBy,
        createdAt: group.createdAt,
        lastActivityAt: group.lastActivityAt,
      },
      joinRequests,
      reports,
      recentMessages,
    });
  } catch (err: any) {
    logger.error({ err }, "Admin get group detail error");
    res.status(500).json({ error: "Failed to fetch group details" });
  }
});

// ── POST /api/admin/groups/:id/disable ────────────────────────────────────────
router.post("/groups/:id/disable", requireAdminRole(["superadmin", "admin", "moderator"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const group = await Conversation.findOne({ _id: req.params.id, isGroup: true });
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    const { reason } = req.body as { reason?: string };
    const disabledReason = reason?.trim() || "Suspended by administration for platform guidelines violation.";

    group.isDisabled = true;
    group.disabledReason = disabledReason;
    group.disabledAt = new Date();
    group.disabledBy = req.adminUser!._id;
    await group.save();

    // Notify group owner & admins
    if (group.createdBy) {
      await Notification.create({
        userId: group.createdBy,
        actorId: req.adminUser!._id,
        type: "group_moderation",
        messageText: `Your group "${group.groupName}" has been suspended: ${disabledReason}`,
      });
    }

    await logAdminAction({
      adminUser: req.adminUser!,
      action: "group.disable",
      targetType: "group",
      targetId: group._id.toString(),
      targetSummary: `Disabled group "${group.groupName}"`,
      reason: disabledReason,
      req,
    });

    res.json({ success: true, message: `Group "${group.groupName}" suspended.`, group });
  } catch (err: any) {
    logger.error({ err }, "Admin disable group error");
    res.status(500).json({ error: "Failed to disable group" });
  }
});

// ── POST /api/admin/groups/:id/restore ────────────────────────────────────────
router.post("/groups/:id/restore", requireAdminRole(["superadmin", "admin", "moderator"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const group = await Conversation.findOne({ _id: req.params.id, isGroup: true });
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    group.isDisabled = false;
    group.disabledReason = undefined;
    group.disabledAt = undefined;
    group.disabledBy = undefined;
    await group.save();

    if (group.createdBy) {
      await Notification.create({
        userId: group.createdBy,
        actorId: req.adminUser!._id,
        type: "group_moderation",
        messageText: `Your group "${group.groupName}" has been restored and is now active.`,
      });
    }

    await logAdminAction({
      adminUser: req.adminUser!,
      action: "group.restore",
      targetType: "group",
      targetId: group._id.toString(),
      targetSummary: `Restored group "${group.groupName}"`,
      req,
    });

    res.json({ success: true, message: `Group "${group.groupName}" restored.`, group });
  } catch (err: any) {
    logger.error({ err }, "Admin restore group error");
    res.status(500).json({ error: "Failed to restore group" });
  }
});

// ── DELETE /api/admin/groups/:id ──────────────────────────────────────────────
router.delete("/groups/:id", requireAdminRole(["superadmin", "admin"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const group = await Conversation.findOne({ _id: req.params.id, isGroup: true });
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    const groupName = group.groupName || "Unnamed";
    await GroupJoinRequest.deleteMany({ groupId: group._id });
    await Message.deleteMany({ conversationId: group._id });
    await Conversation.findByIdAndDelete(group._id);

    await logAdminAction({
      adminUser: req.adminUser!,
      action: "group.delete",
      targetType: "group",
      targetId: req.params.id,
      targetSummary: `Permanently deleted group "${groupName}" and its messages`,
      req,
    });

    res.json({ success: true, message: `Group "${groupName}" deleted.` });
  } catch (err: any) {
    logger.error({ err }, "Admin delete group error");
    res.status(500).json({ error: "Failed to delete group" });
  }
});

// ── GET /api/admin/groups/join-requests ───────────────────────────────────────
router.get("/groups-all/join-requests", async (req: AdminRequest, res): Promise<void> => {
  try {
    const { status = "pending", page = "1", limit = "30" } = req.query as {
      status?: string;
      page?: string;
      limit?: string;
    };

    const filter: any = {};
    if (status && status !== "all") filter.status = status;

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const skip = (p - 1) * l;

    const [total, requests] = await Promise.all([
      GroupJoinRequest.countDocuments(filter),
      GroupJoinRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(l)
        .populate("userId", "username fullName email avatarUrl isVerified")
        .populate("groupId", "groupName groupAvatarUrl privacy memberIds")
        .populate("reviewedBy", "username fullName"),
    ]);

    res.json({ total, page: p, limit: l, requests });
  } catch (err: any) {
    logger.error({ err }, "Admin get all join requests error");
    res.status(500).json({ error: "Failed to fetch join requests" });
  }
});

// ── PLANS & MONETIZATION MANAGEMENT ──────────────────────────────────────────

// ── GET /api/admin/plans/overview ─────────────────────────────────────────────
router.get("/plans/overview", requireAdminRole(["superadmin", "admin"]), async (_req: AdminRequest, res): Promise<void> => {
  try {
    await planService.ensureDefaultPlans();

    const [totalUsers, freeCount, proCount, vipCount, businessCount] = await Promise.all([
      User.countDocuments({ isDeactivated: { $ne: true } }),
      User.countDocuments({ $or: [{ subscriptionPlan: "free" }, { subscriptionPlan: { $exists: false } }] }),
      User.countDocuments({ subscriptionPlan: "pro", subscriptionStatus: "active" }),
      User.countDocuments({ subscriptionPlan: "vip", subscriptionStatus: "active" }),
      User.countDocuments({ subscriptionPlan: "business", subscriptionStatus: "active" }),
    ]);

    const activePaidCount = proCount + vipCount + businessCount;
    // Estimated MRR calculation (Pro: 4.99 JOD, VIP: 9.99 JOD, Business: 19.99 JOD)
    const estimatedMRR = proCount * 4.99 + vipCount * 9.99 + businessCount * 19.99;

    const recentSubscribers = await User.find({
      subscriptionPlan: { $in: ["pro", "vip", "business"] },
    })
      .sort({ subscriptionStartedAt: -1 })
      .limit(10)
      .select("username fullName email avatarUrl subscriptionPlan subscriptionStatus subscriptionStartedAt subscriptionExpiresAt subscriptionCycle");

    res.json({
      totalUsers,
      planCounts: {
        free: freeCount,
        pro: proCount,
        vip: vipCount,
        business: businessCount,
      },
      activePaidCount,
      estimatedMRR: Number(estimatedMRR.toFixed(2)),
      currency: "JOD",
      recentSubscribers,
    });
  } catch (err: any) {
    logger.error({ err }, "Admin get plans overview error");
    res.status(500).json({ error: "Failed to fetch monetization overview" });
  }
});

// ── GET /api/admin/plans ──────────────────────────────────────────────────────
router.get("/plans-config", requireAdminRole(["superadmin", "admin"]), async (_req: AdminRequest, res): Promise<void> => {
  try {
    await planService.ensureDefaultPlans();
    const plans = await PlanConfig.find().sort({ order: 1 });
    res.json({ plans });
  } catch (err: any) {
    logger.error({ err }, "Admin get plans config error");
    res.status(500).json({ error: "Failed to fetch plan configs" });
  }
});

// ── PUT /api/admin/plans-config/:planId ────────────────────────────────────────
router.put("/plans-config/:planId", requireAdminRole(["superadmin", "admin"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const { planId } = req.params;
    const plan: any = await PlanConfig.findOne({ planId: planId as any });
    if (!plan) {
      res.status(404).json({ error: "Plan config not found" });
      return;
    }

    const {
      name,
      tagline,
      description,
      priceMonthly,
      priceYearly,
      currency,
      badgeLabel,
      badgeColor,
      perks,
      features,
      limits,
      isActive,
      isPopular,
    } = req.body;

    if (name !== undefined) plan.name = String(name).trim();
    if (tagline !== undefined) plan.tagline = String(tagline).trim();
    if (description !== undefined) plan.description = String(description).trim();
    if (priceMonthly !== undefined) plan.priceMonthly = Math.max(0, Number(priceMonthly));
    if (priceYearly !== undefined) plan.priceYearly = Math.max(0, Number(priceYearly));
    if (currency !== undefined) plan.currency = String(currency).trim();
    if (badgeLabel !== undefined) plan.badgeLabel = String(badgeLabel).trim();
    if (badgeColor !== undefined) plan.badgeColor = String(badgeColor).trim();
    if (Array.isArray(perks)) plan.perks = perks.map(String);
    if (features && typeof features === "object") plan.features = { ...plan.features, ...features };
    if (limits && typeof limits === "object") plan.limits = { ...plan.limits, ...limits };
    if (isActive !== undefined) plan.isActive = Boolean(isActive);
    if (isPopular !== undefined) plan.isPopular = Boolean(isPopular);

    await plan.save();

    await logAdminAction({
      adminUser: req.adminUser!,
      action: "plan.update",
      targetType: "plan",
      targetId: plan._id.toString(),
      targetSummary: `Updated configuration for plan ${plan.name} (${plan.planId})`,
      req,
    });

    res.json({ success: true, plan });
  } catch (err: any) {
    logger.error({ err }, "Admin update plan error");
    res.status(500).json({ error: "Failed to update plan configuration" });
  }
});

// ── GET /api/admin/plans/subscribers ──────────────────────────────────────────
router.get("/plans/subscribers", requireAdminRole(["superadmin", "admin", "moderator"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const { plan, status, search, page = "1", limit = "20" } = req.query as {
      plan?: string;
      status?: string;
      search?: string;
      page?: string;
      limit?: string;
    };

    const filter: any = { isDeactivated: { $ne: true } };

    if (plan && plan !== "all") {
      filter.subscriptionPlan = plan;
    }

    if (status && status !== "all") {
      filter.subscriptionStatus = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { username: { $regex: q, $options: "i" } },
        { fullName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (p - 1) * l;

    const [total, subscribers] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .sort({ subscriptionStartedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(l)
        .select("username fullName email avatarUrl isVerified subscriptionPlan subscriptionStatus subscriptionStartedAt subscriptionExpiresAt subscriptionCycle accountType planBadge"),
    ]);

    res.json({
      total,
      page: p,
      limit: l,
      subscribers,
    });
  } catch (err: any) {
    logger.error({ err }, "Admin get subscribers error");
    res.status(500).json({ error: "Failed to fetch subscribers" });
  }
});

// ── POST /api/admin/plans/assign ──────────────────────────────────────────────
router.post("/plans/assign", requireAdminRole(["superadmin", "admin"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const { userId, planId, durationDays = 30, cycle = "monthly", reason, notes } = req.body;

    if (!userId || !planId) {
      res.status(400).json({ error: "userId and planId are required" });
      return;
    }

    if (!["free", "pro", "vip", "business"].includes(planId)) {
      res.status(400).json({ error: "Invalid planId. Must be free, pro, vip, or business." });
      return;
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const result = await planService.applySubscription(
      userId,
      planId,
      Number(durationDays) || 30,
      "admin_grant",
      cycle,
      req.adminUser!._id.toString(),
      reason || notes || `Manually assigned by admin @${req.adminUser!.username}`
    );

    // Send in-app notification
    await Notification.create({
      userId: targetUser._id,
      actorId: req.adminUser!._id,
      type: "system",
      messageText: `An administrator has granted your account the ${planId.toUpperCase()} plan for ${durationDays} days.`,
      isRead: false,
    }).catch(() => null);

    await logAdminAction({
      adminUser: req.adminUser!,
      action: "plan.assign",
      targetType: "plan",
      targetId: targetUser._id.toString(),
      targetSummary: `Assigned ${planId.toUpperCase()} plan to @${targetUser.username} (${durationDays} days)`,
      reason: reason || notes,
      req,
    });

    res.json({
      success: true,
      message: `Assigned ${planId.toUpperCase()} to @${targetUser.username}`,
      subscription: result,
    });
  } catch (err: any) {
    logger.error({ err }, "Admin assign plan error");
    res.status(500).json({ error: err.message || "Failed to assign plan" });
  }
});

// ── POST /api/admin/plans/revoke ──────────────────────────────────────────────
router.post("/plans/revoke", requireAdminRole(["superadmin", "admin"]), async (req: AdminRequest, res): Promise<void> => {
  try {
    const { userId, reason } = req.body;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const prevPlan = targetUser.subscriptionPlan || "free";
    targetUser.subscriptionPlan = "free";
    targetUser.subscriptionStatus = "cancelled";
    targetUser.subscriptionExpiresAt = undefined;
    targetUser.planBadge = undefined;
    if (targetUser.accountType === "business") {
      targetUser.accountType = "personal";
    }
    await targetUser.save();

    await Subscription.create({
      userId: targetUser._id,
      planId: "free",
      status: "cancelled",
      billingCycle: "monthly",
      amount: 0,
      currency: "JOD",
      paymentMethod: "free_default",
      startedAt: new Date(),
      history: [
        {
          action: "downgraded",
          fromPlan: prevPlan,
          toPlan: "free",
          date: new Date(),
          actorAdminId: req.adminUser!._id,
          reason: reason || "Revoked by administration",
        },
      ],
      notes: reason,
    });

    await Notification.create({
      userId: targetUser._id,
      actorId: req.adminUser!._id,
      type: "system",
      messageText: `Your subscription has been reverted to the Free plan by administration.`,
      isRead: false,
    }).catch(() => null);

    await logAdminAction({
      adminUser: req.adminUser!,
      action: "plan.revoke",
      targetType: "plan",
      targetId: targetUser._id.toString(),
      targetSummary: `Revoked subscription for @${targetUser.username}, reverted to Free`,
      reason,
      req,
    });

    res.json({
      success: true,
      message: `@${targetUser.username} has been reverted to the Free plan.`,
    });
  } catch (err: any) {
    logger.error({ err }, "Admin revoke plan error");
    res.status(500).json({ error: err.message || "Failed to revoke plan" });
  }
});

export default router;


import { Router, type IRouter } from "express";
import { requireAuth, optionalAuth, type AuthRequest } from "../lib/auth";
import { User, Post, Notification, BusinessTeamMember, Subscription } from "@workspace/db";
import { planService, DEFAULT_PLANS } from "../services/planService";
import { logger } from "../lib/logger";
import mongoose from "mongoose";

const router: IRouter = Router();

// ── GET /plans ──────────────────────────────────────────────────────────────
router.get("/plans", optionalAuth, async (_req, res): Promise<void> => {
  try {
    const plans = await planService.getPlans();
    res.json({ plans });
  } catch (err) {
    logger.error({ err }, "Failed to get plans");
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});

// ── GET /plans/me ───────────────────────────────────────────────────────────
router.get("/plans/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const effectivePlan = await planService.getUserEffectivePlan(user);
    const plans = await planService.getPlans();
    const currentPlanConfig =
      plans.find((p) => p.planId === effectivePlan) ||
      DEFAULT_PLANS.find((p) => p.planId === effectivePlan);

    const todayStr = new Date().toISOString().slice(0, 10);
    const currentAiUsage =
      user.aiUsageToday?.date === todayStr ? user.aiUsageToday?.count || 0 : 0;
    const maxAiLimit = currentPlanConfig?.limits.dailyAiGenerations || 15;

    res.json({
      plan: effectivePlan,
      status: user.subscriptionStatus || "active",
      startedAt: user.subscriptionStartedAt || user.createdAt,
      expiresAt: user.subscriptionExpiresAt || null,
      billingCycle: user.subscriptionCycle || "monthly",
      accountType: user.accountType || "personal",
      planBadge: user.planBadge || null,
      features: currentPlanConfig?.features || {},
      limits: currentPlanConfig?.limits || {},
      aiUsage: {
        used: currentAiUsage,
        max: maxAiLimit,
        remaining: Math.max(0, maxAiLimit - currentAiUsage),
        resetsAt: "Midnight UTC",
      },
      businessProfile: user.businessProfile || null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to get my plan");
    res.status(500).json({ error: "Failed to get subscription state" });
  }
});

// ── POST /plans/subscribe ───────────────────────────────────────────────────
router.post("/plans/subscribe", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { planId, billingCycle = "monthly", paymentMethod = "manual_transfer" } = req.body;

    if (!["free", "pro", "vip", "business"].includes(planId)) {
      res.status(400).json({ error: "Invalid planId. Must be free, pro, vip, or business." });
      return;
    }

    const durationDays = billingCycle === "yearly" ? 365 : 30;

    const result = await planService.applySubscription(
      req.userId!,
      planId,
      durationDays,
      paymentMethod,
      billingCycle,
      undefined,
      `User self-selected ${planId} (${billingCycle})`
    );

    // Create in-app notification
    await Notification.create({
      userId: req.userId,
      actorId: req.userId,
      type: "system",
      messageText: `Your account is now on the ${planId.toUpperCase()} plan. Enjoy your features!`,
      isRead: false,
    }).catch(() => null);

    res.json({
      success: true,
      message: `Successfully activated ${planId.toUpperCase()} plan!`,
      subscription: result,
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to subscribe");
    res.status(500).json({ error: err.message || "Subscription update failed" });
  }
});

// ── POST /plans/cancel ──────────────────────────────────────────────────────
router.post("/plans/cancel", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { reason } = req.body;
    const result = await planService.cancelSubscription(req.userId!, reason);
    res.json(result);
  } catch (err: any) {
    logger.error({ err }, "Failed to cancel subscription");
    res.status(500).json({ error: err.message || "Cancellation failed" });
  }
});

// ── GET /plans/analytics/overview ───────────────────────────────────────────
router.get("/plans/analytics/overview", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const effectivePlan = await planService.getUserEffectivePlan(user);
    const retentionDays = await planService.getPlanLimit(user, "analyticsRetentionDays", 7);
    const hasAdvanced = await planService.hasFeature(user, "advancedAnalytics");
    const hasBusiness = await planService.hasFeature(user, "businessAnalytics");

    const postsCount = await Post.countDocuments({ authorId: user._id });
    const reelsCount = await Post.countDocuments({ authorId: user._id, mediaType: "video" });
    const userPosts = await Post.find({ authorId: user._id })
      .select("likes saves caption comments createdAt")
      .sort({ createdAt: -1 })
      .limit(50);

    const totalLikes = userPosts.reduce((acc, p) => acc + (p.likes?.length || 0), 0);
    const totalSaves = userPosts.reduce((acc, p) => acc + (p.saves?.length || 0), 0);
    const totalComments = userPosts.reduce((acc, p) => acc + (p.comments?.length || 0), 0);
    const followersCount = user.followers?.length || 0;
    const engagementRate = postsCount > 0 ? (((totalLikes + totalComments) / Math.max(1, followersCount)) * 10).toFixed(1) : "0.0";

    // Build timeline stats according to tier retention
    const daysToGenerate = Math.min(retentionDays, 30);
    const timeline = [];
    const now = new Date();
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(5, 10);
      const dayFactor = (i % 5) + 1;
      timeline.push({
        date: dateStr,
        impressions: Math.round(followersCount * 1.5 + dayFactor * 12 + totalLikes * 0.2),
        engagements: Math.round(totalLikes * 0.15 + dayFactor * 4),
        profileViews: Math.round(followersCount * 0.4 + dayFactor * 2),
      });
    }

    // Top posts
    const topPosts = userPosts.slice(0, 5).map((p) => ({
      id: p._id.toString(),
      caption: p.caption ? p.caption.slice(0, 60) : "No caption",
      likesCount: p.likes?.length || 0,
      savesCount: p.saves?.length || 0,
      commentsCount: p.comments?.length || 0,
      createdAt: p.createdAt,
    }));

    res.json({
      plan: effectivePlan,
      retentionDays,
      hasAdvanced,
      hasBusiness,
      summary: {
        postsCount,
        reelsCount,
        followersCount,
        totalLikes,
        totalSaves,
        totalComments,
        engagementRate: `${engagementRate}%`,
      },
      timeline,
      topPosts,
      businessMetrics: hasBusiness
        ? {
            linkClicks: Math.round(followersCount * 0.8 + 24),
            contactInquiries: Math.round(followersCount * 0.1 + 8),
            averageResponseTime: "15 mins",
            conversionRate: "4.2%",
          }
        : null,
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to get analytics");
    res.status(500).json({ error: "Failed to generate analytics" });
  }
});

// ── GET /plans/business/team ────────────────────────────────────────────────
router.get("/plans/business/team", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const hasTeamFeature = await planService.hasFeature(user, "teamManagement");
    if (!hasTeamFeature) {
      res.status(403).json({
        error: "Team management is available exclusively on the Business Plan.",
        upgradeRequired: "business",
      });
      return;
    }

    const members = await BusinessTeamMember.find({ businessOwnerId: user._id })
      .populate("userId", "username fullName avatarUrl email")
      .sort({ createdAt: -1 });

    const maxMembers = await planService.getPlanLimit(user, "maxTeamMembers", 15);

    res.json({
      members,
      currentCount: members.length,
      maxMembers,
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to get team members");
    res.status(500).json({ error: "Failed to get team members" });
  }
});

// ── POST /plans/business/team/invite ────────────────────────────────────────
router.post("/plans/business/team/invite", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const hasTeamFeature = await planService.hasFeature(user, "teamManagement");
    if (!hasTeamFeature) {
      res.status(403).json({
        error: "Team management requires the Business plan.",
        upgradeRequired: "business",
      });
      return;
    }

    const maxMembers = await planService.getPlanLimit(user, "maxTeamMembers", 15);
    const currentCount = await BusinessTeamMember.countDocuments({ businessOwnerId: user._id });
    if (currentCount >= maxMembers) {
      res.status(400).json({
        error: `You have reached the maximum of ${maxMembers} team members for your Business plan.`,
      });
      return;
    }

    const { email, role = "editor", name } = req.body;
    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "Valid email address is required" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if member already exists
    const existing = await BusinessTeamMember.findOne({
      businessOwnerId: user._id,
      email: normalizedEmail,
    });

    if (existing) {
      res.status(400).json({ error: "This member has already been invited." });
      return;
    }

    // Check if registered user
    const matchedUser = await User.findOne({ email: normalizedEmail });

    const member = await BusinessTeamMember.create({
      businessOwnerId: user._id,
      userId: matchedUser ? matchedUser._id : undefined,
      email: normalizedEmail,
      name: name || matchedUser?.fullName || normalizedEmail.split("@")[0],
      role,
      status: "pending",
      invitedAt: new Date(),
    });

    // If registered, notify user
    if (matchedUser) {
      await Notification.create({
        userId: matchedUser._id,
        actorId: user._id,
        type: "system",
        messageText: `@${user.username} invited you to join their Business team as a ${role}.`,
        isRead: false,
      }).catch(() => null);
    }

    res.status(201).json({
      success: true,
      message: `Invitation sent to ${normalizedEmail}`,
      member,
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to invite team member");
    res.status(500).json({ error: err.message || "Failed to invite team member" });
  }
});

// ── DELETE /plans/business/team/:memberId ────────────────────────────────────
router.delete("/plans/business/team/:memberId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const member = await BusinessTeamMember.findOne({
      _id: req.params.memberId,
      businessOwnerId: req.userId,
    });

    if (!member) {
      res.status(404).json({ error: "Team member not found" });
      return;
    }

    await BusinessTeamMember.findByIdAndDelete(member._id);
    res.json({ success: true, message: "Team member removed" });
  } catch (err: any) {
    logger.error({ err }, "Failed to delete team member");
    res.status(500).json({ error: "Failed to remove team member" });
  }
});

// ── PUT /plans/business/profile ─────────────────────────────────────────────
router.put("/plans/business/profile", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const {
      businessName,
      category,
      contactEmail,
      contactPhone,
      address,
      website,
      supportHours,
      quickReplies,
    } = req.body;

    user.businessProfile = {
      businessName: businessName !== undefined ? String(businessName).trim() : user.businessProfile?.businessName,
      category: category !== undefined ? String(category).trim() : user.businessProfile?.category,
      contactEmail: contactEmail !== undefined ? String(contactEmail).trim() : user.businessProfile?.contactEmail,
      contactPhone: contactPhone !== undefined ? String(contactPhone).trim() : user.businessProfile?.contactPhone,
      address: address !== undefined ? String(address).trim() : user.businessProfile?.address,
      website: website !== undefined ? String(website).trim() : user.businessProfile?.website,
      supportHours: supportHours !== undefined ? String(supportHours).trim() : user.businessProfile?.supportHours,
      quickReplies: Array.isArray(quickReplies) ? quickReplies : user.businessProfile?.quickReplies || [],
    };

    if (user.subscriptionPlan === "business") {
      user.accountType = "business";
    }

    await user.save();

    res.json({
      success: true,
      message: "Business profile updated successfully",
      businessProfile: user.businessProfile,
      accountType: user.accountType,
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to update business profile");
    res.status(500).json({ error: "Failed to update business profile" });
  }
});

export default router;

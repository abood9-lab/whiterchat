import {
  User,
  PlanConfig,
  Subscription,
  type IUser,
  type IPlanConfig,
  type PlanTier,
  type IPlanFeatures,
  type IPlanLimits,
} from "@workspace/db";
import { logger } from "../lib/logger";

export const DEFAULT_PLANS: Array<Omit<IPlanConfig, "_id" | "createdAt" | "updatedAt">> = [
  {
    planId: "free",
    name: "Free",
    tagline: "The complete core social experience for everyone",
    description:
      "Enjoy full social connection with posts, reels, stories, direct messaging, groups, and search without any artificial barriers.",
    priceMonthly: 0,
    priceYearly: 0,
    currency: "JOD",
    badgeLabel: "Community",
    badgeColor: "gray",
    perks: [
      "Full access to feed, reels & stories",
      "Unlimited direct messaging & group chats",
      "Post photos & videos up to 10 items",
      "15 daily AI Assistant generations",
      "Standard profile customization & up to 3 links",
      "Up to 15 saved collections",
      "Standard community interactions & comments",
    ],
    features: {
      advancedAnalytics: false,
      creatorInsights: false,
      businessAnalytics: false,
      aiAssistantHighQuota: false,
      priorityUpload: false,
      premiumThemes: false,
      teamManagement: false,
      businessProfile: false,
      businessQuickReplies: false,
      exportDataAdvanced: false,
      customBadgeDisplay: false,
    },
    limits: {
      dailyAiGenerations: 15,
      maxCarouselMedia: 10,
      maxReelSizeMB: 50,
      maxSavedCollections: 15,
      maxCustomLinks: 3,
      maxTeamMembers: 0,
      analyticsRetentionDays: 7,
    },
    isActive: true,
    isPopular: false,
    order: 0,
  } as any,
  {
    planId: "pro",
    name: "Pro",
    tagline: "Enhanced creator tools, higher limits & insights",
    description:
      "For creators looking to step up their game with extended carousel capacity, 30-day performance insights, 60 daily AI credits, and sleek profile accents.",
    priceMonthly: 4.99,
    priceYearly: 49.99,
    currency: "JOD",
    badgeLabel: "Pro",
    badgeColor: "emerald",
    perks: [
      "Everything in Free included",
      "60 daily AI Assistant generations",
      "Upload carousels with up to 15 items",
      "Reels & video uploads up to 200 MB",
      "30-day creator analytics & post performance",
      "Up to 50 saved collections & 8 bio links",
      "Pro profile badge & custom accent highlights",
    ],
    features: {
      advancedAnalytics: true,
      creatorInsights: true,
      businessAnalytics: false,
      aiAssistantHighQuota: true,
      priorityUpload: true,
      premiumThemes: true,
      teamManagement: false,
      businessProfile: false,
      businessQuickReplies: false,
      exportDataAdvanced: true,
      customBadgeDisplay: true,
    },
    limits: {
      dailyAiGenerations: 60,
      maxCarouselMedia: 15,
      maxReelSizeMB: 200,
      maxSavedCollections: 50,
      maxCustomLinks: 8,
      maxTeamMembers: 0,
      analyticsRetentionDays: 30,
    },
    isActive: true,
    isPopular: true,
    order: 1,
  } as any,
  {
    planId: "vip",
    name: "VIP",
    tagline: "Maximum creative freedom, deep analytics & elite flair",
    description:
      "Crafted for power creators and influencers who want 200 daily AI generations, 90-day deep retention insights, 500MB uploads, and elite VIP styling.",
    priceMonthly: 9.99,
    priceYearly: 99.99,
    currency: "JOD",
    badgeLabel: "VIP",
    badgeColor: "purple",
    perks: [
      "Everything in Pro included",
      "200 daily AI Assistant generations",
      "Upload carousels with up to 20 items",
      "Reels & video uploads up to 500 MB",
      "90-day deep audience analytics & retention curves",
      "Up to 150 saved collections & 15 bio links",
      "VIP glowing badge, themes & priority upload pipeline",
    ],
    features: {
      advancedAnalytics: true,
      creatorInsights: true,
      businessAnalytics: true,
      aiAssistantHighQuota: true,
      priorityUpload: true,
      premiumThemes: true,
      teamManagement: false,
      businessProfile: false,
      businessQuickReplies: false,
      exportDataAdvanced: true,
      customBadgeDisplay: true,
    },
    limits: {
      dailyAiGenerations: 200,
      maxCarouselMedia: 20,
      maxReelSizeMB: 500,
      maxSavedCollections: 150,
      maxCustomLinks: 15,
      maxTeamMembers: 0,
      analyticsRetentionDays: 90,
    },
    isActive: true,
    isPopular: false,
    order: 2,
  } as any,
  {
    planId: "business",
    name: "Business",
    tagline: "Complete organizational tools, team members & professional presence",
    description:
      "Built for brands, agencies, and teams. Manage up to 15 team members with roles, publish business contact info, quick replies, and full professional exportable analytics.",
    priceMonthly: 19.99,
    priceYearly: 199.99,
    currency: "JOD",
    badgeLabel: "Business",
    badgeColor: "blue",
    perks: [
      "Everything in VIP included",
      "500 daily AI Assistant generations",
      "Team Management: Invite up to 15 team members (Admin, Editor, Moderator)",
      "Dedicated Business Profile with Contact info, Category & Hours",
      "Business messaging Quick Replies",
      "Professional analytics with CSV/JSON export",
      "Unlimited saved collections & unlimited bio links",
      "Business organization badge & priority infrastructure",
    ],
    features: {
      advancedAnalytics: true,
      creatorInsights: true,
      businessAnalytics: true,
      aiAssistantHighQuota: true,
      priorityUpload: true,
      premiumThemes: true,
      teamManagement: true,
      businessProfile: true,
      businessQuickReplies: true,
      exportDataAdvanced: true,
      customBadgeDisplay: true,
    },
    limits: {
      dailyAiGenerations: 500,
      maxCarouselMedia: 30,
      maxReelSizeMB: 1024,
      maxSavedCollections: 9999,
      maxCustomLinks: 9999,
      maxTeamMembers: 15,
      analyticsRetentionDays: 365,
    },
    isActive: true,
    isPopular: false,
    order: 3,
  } as any,
];

class PlanService {
  private initialized = false;

  /**
   * Ensures default plans exist in database
   */
  async ensureDefaultPlans(): Promise<void> {
    if (this.initialized) return;
    try {
      for (const planData of DEFAULT_PLANS) {
        const existing = await PlanConfig.findOne({ planId: planData.planId });
        if (!existing) {
          await PlanConfig.create(planData);
          logger.info(`Seeded plan: ${planData.planId}`);
        }
      }
      this.initialized = true;
    } catch (err) {
      logger.error({ err }, "Failed to ensure default plans");
    }
  }

  /**
   * Determine the effective plan tier of a user.
   * If a paid subscription has expired, gracefully falls back to "free" and updates user state.
   */
  async getUserEffectivePlan(user: any): Promise<PlanTier> {
    if (!user) return "free";

    const currentPlan: PlanTier = user.subscriptionPlan || "free";
    if (currentPlan === "free") return "free";

    // Check expiration if set
    if (user.subscriptionExpiresAt) {
      const expires = new Date(user.subscriptionExpiresAt);
      if (Date.now() > expires.getTime()) {
        // Expired! Fallback gracefully to Free
        try {
          user.subscriptionPlan = "free";
          user.subscriptionStatus = "expired";
          if (user.save) {
            await user.save();
          } else {
            await User.findByIdAndUpdate(user._id, {
              subscriptionPlan: "free",
              subscriptionStatus: "expired",
            });
          }
          logger.info(`Subscription for user ${user._id} expired. Reverted to free.`);
        } catch (e) {
          logger.error({ err: e }, "Failed to save expired subscription fallback");
        }
        return "free";
      }
    }

    if (user.subscriptionStatus === "cancelled" && user.subscriptionExpiresAt) {
      const expires = new Date(user.subscriptionExpiresAt);
      if (Date.now() > expires.getTime()) {
        return "free";
      }
    }

    return currentPlan;
  }

  /**
   * Retrieve all active plans from DB (or fallback to defaults)
   */
  async getPlans(): Promise<IPlanConfig[]> {
    await this.ensureDefaultPlans();
    const plans = await PlanConfig.find({ isActive: true }).sort({ order: 1 });
    if (plans.length > 0) return plans;
    return DEFAULT_PLANS as any;
  }

  /**
   * Check if user has access to a specific feature flag
   */
  async hasFeature(user: any, featureKey: keyof IPlanFeatures | string): Promise<boolean> {
    const planId = await this.getUserEffectivePlan(user);
    const plan = (await PlanConfig.findOne({ planId })) || DEFAULT_PLANS.find((p) => p.planId === planId);
    if (!plan || !plan.features) return false;
    return Boolean((plan.features as any)[featureKey]);
  }

  /**
   * Retrieve specific limit for user
   */
  async getPlanLimit(user: any, limitKey: keyof IPlanLimits | string, fallback = 0): Promise<number> {
    const planId = await this.getUserEffectivePlan(user);
    const plan = (await PlanConfig.findOne({ planId })) || DEFAULT_PLANS.find((p) => p.planId === planId);
    if (!plan || !plan.limits) return fallback;
    const val = (plan.limits as any)[limitKey];
    return typeof val === "number" ? val : fallback;
  }

  /**
   * Check daily AI usage and increment if under quota.
   * Returns remaining credits or throws an error with upgrade guidance.
   */
  async checkAndIncrementAiUsage(userId: string): Promise<{ used: number; max: number; remaining: number }> {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const effectivePlan = await this.getUserEffectivePlan(user);
    const maxLimit = await this.getPlanLimit(user, "dailyAiGenerations", 15);

    const todayStr = new Date().toISOString().slice(0, 10);
    const currentUsage = user.aiUsageToday?.date === todayStr ? (user.aiUsageToday?.count || 0) : 0;

    if (currentUsage >= maxLimit) {
      const planName = effectivePlan.toUpperCase();
      throw new Error(
        `You have reached your daily AI limit of ${maxLimit} generations on the ${planName} plan. Upgrading gives you higher daily limits (Pro: 60, VIP: 200, Business: 500). Your quota resets at midnight UTC.`
      );
    }

    // Increment count
    await User.findByIdAndUpdate(userId, {
      aiUsageToday: {
        date: todayStr,
        count: currentUsage + 1,
      },
    });

    return {
      used: currentUsage + 1,
      max: maxLimit,
      remaining: maxLimit - (currentUsage + 1),
    };
  }

  /**
   * Apply plan subscription to user
   */
  async applySubscription(
    userId: string,
    planId: PlanTier,
    durationDays = 30,
    paymentMethod: "manual_transfer" | "card" | "admin_grant" | "free_default" = "manual_transfer",
    cycle: "monthly" | "yearly" = "monthly",
    adminActorId?: string,
    notes?: string
  ) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const previousPlan = user.subscriptionPlan || "free";
    const now = new Date();
    const expiresAt =
      planId === "free" ? null : new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    let planBadge: string | null = null;
    if (planId === "pro") planBadge = "pro_creator";
    else if (planId === "vip") planBadge = "vip_elite";
    else if (planId === "business") planBadge = "business_verified";

    user.subscriptionPlan = planId;
    user.subscriptionStatus = "active";
    user.subscriptionStartedAt = now;
    user.subscriptionExpiresAt = expiresAt ?? undefined;
    user.subscriptionCycle = cycle;
    user.planBadge = planBadge ?? undefined;

    if (planId === "business") {
      user.accountType = "business";
    }

    await user.save();

    // Record subscription history
    const planConfig = (await PlanConfig.findOne({ planId })) || DEFAULT_PLANS.find((p) => p.planId === planId);
    const amount = cycle === "yearly" ? planConfig?.priceYearly || 0 : planConfig?.priceMonthly || 0;

    await Subscription.create({
      userId: user._id,
      planId,
      status: "active",
      billingCycle: cycle,
      amount,
      currency: planConfig?.currency || "JOD",
      paymentMethod,
      startedAt: now,
      expiresAt: expiresAt ?? undefined,
      history: [
        {
          action: previousPlan === "free" ? "created" : "upgraded",
          fromPlan: previousPlan,
          toPlan: planId,
          date: now,
          actorAdminId: adminActorId ? (adminActorId as any) : undefined,
          reason: notes || `Subscribed to ${planId} (${cycle})`,
        },
      ],
      notes,
    });

    return {
      plan: planId,
      status: "active",
      expiresAt,
      subscriptionCycle: cycle,
    };
  }

  /**
   * Cancel subscription gracefully (keeps access until current period expires)
   */
  async cancelSubscription(userId: string, reason?: string) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    if (user.subscriptionPlan === "free") {
      return { message: "Already on Free plan" };
    }

    user.subscriptionStatus = "cancelled";
    await user.save();

    await Subscription.findOneAndUpdate(
      { userId: user._id, status: "active" },
      {
        status: "cancelled",
        cancelledAt: new Date(),
        notes: reason || "User requested cancellation",
      }
    );

    return {
      success: true,
      message: "Subscription cancelled. You will retain access until the end of your billing cycle.",
      expiresAt: user.subscriptionExpiresAt,
    };
  }
}

export const planService = new PlanService();

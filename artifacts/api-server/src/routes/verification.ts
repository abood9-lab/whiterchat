import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import {
  User,
  VerificationPlan,
  VerificationRequest,
  VerificationPaymentConfig,
  Notification,
  type IUser,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { uploadBase64 } from "../lib/cloudinary";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Seed initial plans and default payment config if empty
export async function seedVerificationDefaults() {
  try {
    const plansCount = await VerificationPlan.countDocuments();
    if (plansCount === 0) {
      await VerificationPlan.create([
        {
          name: "Standard Verified",
          description: "Essential verification badge for active individuals & authentic profiles",
          price: 5,
          currency: "JOD",
          durationDays: 30,
          badgeType: "blue_check",
          perks: [
            "Official Blue Checkmark Badge",
            "Priority indexing in search results",
            "Direct customer support access",
            "Higher media upload quality",
          ],
          isActive: true,
          isPopular: true,
          order: 1,
        },
        {
          name: "Creator Pro",
          description: "Advanced verification for public figures, creators & digital artists",
          price: 10,
          currency: "JOD",
          durationDays: 30,
          badgeType: "creator_pro",
          perks: [
            "Exclusive Creator Pro Badge",
            "Pin up to 5 reels and posts on profile",
            "Real-time audience reach analytics",
            "Priority comment placement",
            "Early access to beta features",
          ],
          isActive: true,
          isPopular: false,
          order: 2,
        },
        {
          name: "Enterprise Elite",
          description: "Premium badge for organizations, brands & executive public figures",
          price: 25,
          currency: "JOD",
          durationDays: 30,
          badgeType: "gold_badge",
          perks: [
            "Gold Elite Official Badge",
            "Dedicated verification account manager",
            "Brand impersonation protection shield",
            "Maximum audio & 4K video playback",
            "Unlimited group creation limits",
          ],
          isActive: true,
          isPopular: false,
          order: 3,
        },
      ]);
      logger.info("[Verification] Default verification plans seeded.");
    }

    const paymentConfigCount = await VerificationPaymentConfig.countDocuments();
    if (paymentConfigCount === 0) {
      await VerificationPaymentConfig.create({
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
      logger.info("[Verification] Default payment configuration seeded.");
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, "[Verification] Seed error");
  }
}

// ── GET /api/verification/plans ──────────────────────────────────────────────
router.get("/verification/plans", async (_req, res): Promise<void> => {
  try {
    await seedVerificationDefaults();
    const plans = await VerificationPlan.find({ isActive: true }).sort({ order: 1, price: 1 });
    res.json({ plans });
  } catch (err: any) {
    logger.error({ err }, "Error fetching verification plans");
    res.status(500).json({ error: "Failed to fetch verification plans" });
  }
});

// ── GET /api/verification/my-status ──────────────────────────────────────────
router.get("/verification/my-status", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Check expiration logic
    if (user.isVerified && user.verificationExpiresAt) {
      const now = new Date();
      if (now > new Date(user.verificationExpiresAt)) {
        user.isVerified = false;
        user.verificationStatus = "expired";
        await user.save();

        // Send expiration notification
        await Notification.create({
          userId: user._id,
          actorId: user._id,
          type: "verification_expired",
          messageText: "Your monthly verification subscription has expired. You can renew your badge at any time.",
        });
      }
    }

    // Find latest verification request
    const latestRequest = await VerificationRequest.findOne({ userId: user._id })
      .sort({ createdAt: -1 })
      .populate("planId");

    // Fetch active payment config as fallback
    const paymentConfig = await VerificationPaymentConfig.findOne({ isActive: true, isDefault: true });

    res.json({
      isVerified: Boolean(user.isVerified),
      badge: user.verificationBadge || "blue_check",
      planName: user.verificationPlanName || null,
      expiresAt: user.verificationExpiresAt || null,
      startedAt: user.verificationStartedAt || null,
      status: user.verificationStatus || "none",
      latestRequest,
      defaultPaymentConfig: paymentConfig,
    });
  } catch (err: any) {
    logger.error({ err }, "Error fetching user verification status");
    res.status(500).json({ error: "Failed to fetch verification status" });
  }
});

// ── POST /api/verification/request ───────────────────────────────────────────
router.post("/verification/request", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { planId } = req.body as { planId?: string };
    if (!planId) {
      res.status(400).json({ error: "Plan ID is required" });
      return;
    }

    const plan = await VerificationPlan.findById(planId);
    if (!plan || !plan.isActive) {
      res.status(404).json({ error: "Verification plan not found or inactive" });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Check if user already has a pending or awaiting payment request
    const activeReq = await VerificationRequest.findOne({
      userId: user._id,
      status: { $in: ["pending", "awaiting_payment", "payment_submitted"] },
    });

    if (activeReq) {
      res.status(400).json({
        error: "You already have an active verification request in progress. Please complete or cancel it first.",
        request: activeReq,
      });
      return;
    }

    // Fetch default payment instructions to attach automatically
    const paymentConfig = await VerificationPaymentConfig.findOne({ isActive: true, isDefault: true });

    const newRequest = await VerificationRequest.create({
      userId: user._id,
      planId: plan._id,
      planSnapshot: {
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        durationDays: plan.durationDays || 30,
        perks: plan.perks || [],
        badgeType: plan.badgeType || "blue_check",
      },
      status: "pending",
      paymentInstructions: paymentConfig
        ? {
            methodName: paymentConfig.paymentMethodName,
            walletName: paymentConfig.walletName,
            walletAddress: paymentConfig.walletAddress,
            currency: paymentConfig.currency,
            instructions: paymentConfig.instructions,
            additionalNotes: paymentConfig.additionalNotes,
            sentAt: new Date(),
          }
        : undefined,
    });

    user.verificationStatus = "pending";
    await user.save();

    res.status(201).json({
      success: true,
      message: "Verification request submitted successfully. Awaiting administrator review.",
      request: newRequest,
    });
  } catch (err: any) {
    logger.error({ err }, "Error creating verification request");
    res.status(500).json({ error: "Failed to submit verification request" });
  }
});

// ── POST /api/verification/submit-payment ────────────────────────────────────
router.post("/verification/submit-payment", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { requestId, transactionId, proofImageData, userNote } = req.body as {
      requestId: string;
      transactionId?: string;
      proofImageData?: string;
      userNote?: string;
    };

    if (!requestId) {
      res.status(400).json({ error: "Request ID is required" });
      return;
    }

    const verificationReq = await VerificationRequest.findOne({
      _id: requestId,
      userId: req.userId,
    });

    if (!verificationReq) {
      res.status(404).json({ error: "Verification request not found" });
      return;
    }

    if (verificationReq.status === "approved") {
      res.status(400).json({ error: "This verification request is already approved." });
      return;
    }

    let proofImageUrl = "";
    if (proofImageData && proofImageData.startsWith("data:image")) {
      try {
        const uploaded = await uploadBase64(proofImageData, "verification_proofs");
        proofImageUrl = uploaded.url;
      } catch (uploadErr) {
        logger.warn({ uploadErr }, "Failed uploading proof image to Cloudinary, saving inline reference");
      }
    }

    verificationReq.status = "payment_submitted";
    verificationReq.paymentProof = {
      submittedAt: new Date(),
      transactionId: transactionId?.trim() || undefined,
      proofImageUrl: proofImageUrl || undefined,
      userNote: userNote?.trim() || undefined,
    };
    await verificationReq.save();

    const user = await User.findById(req.userId);
    if (user) {
      user.verificationStatus = "payment_submitted";
      await user.save();
    }

    res.json({
      success: true,
      message: "Payment confirmation submitted. An administrator will manually verify your payment receipt.",
      request: verificationReq,
    });
  } catch (err: any) {
    logger.error({ err }, "Error submitting payment confirmation");
    res.status(500).json({ error: "Failed to submit payment proof" });
  }
});

// ── POST /api/verification/cancel ────────────────────────────────────────────
router.post("/verification/cancel", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { requestId } = req.body as { requestId: string };
    const verificationReq = await VerificationRequest.findOne({
      _id: requestId,
      userId: req.userId,
      status: { $in: ["pending", "awaiting_payment", "payment_submitted"] },
    });

    if (!verificationReq) {
      res.status(404).json({ error: "Active verification request not found" });
      return;
    }

    verificationReq.status = "cancelled";
    await verificationReq.save();

    const user = await User.findById(req.userId);
    if (user && user.verificationStatus !== "approved") {
      user.verificationStatus = "none";
      await user.save();
    }

    res.json({ success: true, message: "Verification request cancelled." });
  } catch (err: any) {
    logger.error({ err }, "Error cancelling verification request");
    res.status(500).json({ error: "Failed to cancel request" });
  }
});

// ── GET /api/verification/history ────────────────────────────────────────────
router.get("/verification/history", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const history = await VerificationRequest.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("planId");
    res.json({ history });
  } catch (err: any) {
    logger.error({ err }, "Error fetching verification history");
    res.status(500).json({ error: "Failed to fetch verification history" });
  }
});

export default router;
